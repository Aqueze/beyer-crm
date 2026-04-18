import { db } from "@/lib/db";
import { contacts, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) notFound();

  let company = null;
  if (contact.companyId) {
    const [c] = await db.select().from(companies).where(eq(companies.id, contact.companyId)).limit(1);
    company = c;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {contact.firstName} {contact.lastName}
        </h1>
        <div className="flex gap-2">
          <Link href={`/contacts/${id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded">
            Edit
          </Link>
          <Link href="/contacts" className="bg-gray-200 text-gray-700 px-4 py-2 rounded">
            Back
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-gray-900">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                ) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-gray-900">
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a>
                ) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Company</dt>
              <dd className="text-gray-900">
                {company ? (
                  <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline">{company.name}</Link>
                ) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Location Source</dt>
              <dd className="text-gray-900 capitalize">{contact.locationSource?.replace("_", " ") || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Address</h2>
          <address className="text-gray-900 not-italic">
            {contact.addressStreet && <div>{contact.addressStreet}</div>}
            {contact.addressPostalCode && <div>{contact.addressPostalCode} {contact.addressCity}</div>}
            {contact.addressCountry && <div>{contact.addressCountry}</div>}
            {!contact.addressStreet && !contact.addressCity && !contact.addressCountry && (
              <span className="text-gray-500">No address on file</span>
            )}
          </address>
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {contact.notes && (
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        <div className="p-4 text-sm text-gray-500">
          <div>Created: {contact.createdAt.toLocaleDateString()}</div>
          <div>Updated: {contact.updatedAt.toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
