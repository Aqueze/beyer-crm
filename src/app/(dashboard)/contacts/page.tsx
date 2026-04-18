import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import Link from "next/link";

export default async function ContactsPage() {
  const allContacts = await db.select().from(contacts).limit(100);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Link href="/contacts/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          + New Contact
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
                    {contact.firstName} {contact.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{contact.email}</td>
                <td className="px-4 py-3 text-gray-600">{contact.phone}</td>
                <td className="px-4 py-3">
                  {contact.tags?.map((tag) => (
                    <span key={tag} className="inline-block bg-gray-200 rounded px-2 py-0.5 text-xs mr-1">
                      {tag}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
            {allContacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No contacts yet. Create your first contact or import from Excel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
