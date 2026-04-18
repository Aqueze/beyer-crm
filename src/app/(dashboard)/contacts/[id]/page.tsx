import { db } from "@/lib/db";
import { contacts, companies, interactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractionForm } from "./interaction-form";
import { InteractionList } from "./interaction-list";

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

  const contactInteractions = await db
    .select()
    .from(interactions)
    .where(eq(interactions.contactId, id))
    .orderBy(desc(interactions.createdAt))
    .limit(20);

  return (
    <div className="max-w-4xl">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Contact Information</h2>
            </div>
            <div className="p-4">
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
          </div>

          {/* Address Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Address</h2>
            </div>
            <div className="p-4">
              <address className="text-gray-900 not-italic">
                {contact.addressStreet && <div>{contact.addressStreet}</div>}
                {contact.addressPostalCode && <div>{contact.addressPostalCode} {contact.addressCity}</div>}
                {contact.addressCountry && <div>{contact.addressCountry}</div>}
                {!contact.addressStreet && !contact.addressCity && !contact.addressCountry && (
                  <span className="text-gray-500">No address on file</span>
                )}
              </address>
            </div>
          </div>

          {/* Tags Card */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Tags</h2>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes Card */}
          {contact.notes && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Notes</h2>
              </div>
              <div className="p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </div>
          )}

          {/* Interaction History Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Interaction History</h2>
            </div>
            <InteractionList interactions={contactInteractions} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="block w-full text-center bg-blue-50 text-blue-600 px-4 py-2 rounded hover:bg-blue-100"
                >
                  Send Email
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="block w-full text-center bg-green-50 text-green-600 px-4 py-2 rounded hover:bg-green-100"
                >
                  Call
                </a>
              )}
              {contact.addressCity && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [contact.addressStreet, contact.addressPostalCode, contact.addressCity, contact.addressCountry].filter(Boolean).join(", ")
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-gray-50 text-gray-600 px-4 py-2 rounded hover:bg-gray-100"
                >
                  View on Map
                </a>
              )}
            </div>
          </div>

          {/* Add Interaction Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Log Interaction</h2>
            </div>
            <div className="p-4">
              <InteractionForm contactId={id} />
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Details</h2>
            </div>
            <div className="p-4 text-sm text-gray-500 space-y-1">
              <div>Created: {contact.createdAt.toLocaleDateString()}</div>
              <div>Updated: {contact.updatedAt.toLocaleDateString()}</div>
              <div>ID: {contact.id}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
