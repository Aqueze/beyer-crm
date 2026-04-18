import { db } from "@/lib/db";
import { companies, contacts } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) notFound();

  const companyContacts = await db.select().from(contacts).where(eq(contacts.companyId, id)).limit(100);

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <div className="flex gap-2">
          <Link href={`/companies/${id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded">
            Edit
          </Link>
          <Link href="/companies" className="bg-gray-200 text-gray-700 px-4 py-2 rounded">
            Back
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Domain</dt>
              <dd className="text-gray-900">
                {company.domain ? (
                  <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {company.domain}
                  </a>
                ) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Website</dt>
              <dd className="text-gray-900">
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {company.website}
                  </a>
                ) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Contact Count</dt>
              <dd className="text-gray-900">{companyContacts.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Location Source</dt>
              <dd className="text-gray-900 capitalize">{company.locationSource?.replace("_", " ") || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Address</h2>
          <address className="text-gray-900 not-italic">
            {company.addressStreet && <div>{company.addressStreet}</div>}
            {company.addressPostalCode && <div>{company.addressPostalCode} {company.addressCity}</div>}
            {company.addressCountry && <div>{company.addressCountry}</div>}
            {!company.addressStreet && !company.addressCity && !company.addressCountry && (
              <span className="text-gray-500">No address on file</span>
            )}
          </address>
        </div>

        <div className="p-4 text-sm text-gray-500">
          <div>Created: {company.createdAt.toLocaleDateString()}</div>
          <div>Updated: {company.updatedAt.toLocaleDateString()}</div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Contacts at {company.name}</h2>
        {companyContacts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No contacts at this company yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companyContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{contact.email || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{contact.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
