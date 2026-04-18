import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import Link from "next/link";

export default async function CompaniesPage() {
  const allCompanies = await db.select().from(companies).limit(100);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Link href="/companies/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          + New Company
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Domain</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">City</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline">
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{company.domain}</td>
                <td className="px-4 py-3 text-gray-600">{company.addressCity}</td>
              </tr>
            ))}
            {allCompanies.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No companies yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
