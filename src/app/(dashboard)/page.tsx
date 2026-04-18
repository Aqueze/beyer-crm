import { db } from "@/lib/db";
import { contacts, companies, imports } from "@/lib/db/schema";
import { count } from "drizzle-orm";

export default async function DashboardPage() {
  const [contactCount, companyCount, recentImports] = await Promise.all([
    db.select({ count: count() }).from(contacts),
    db.select({ count: count() }).from(companies),
    db.select().from(imports).orderBy(imports.createdAt).limit(5),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Total Contacts</p>
          <p className="text-3xl font-bold">{contactCount[0]?.count ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Total Companies</p>
          <p className="text-3xl font-bold">{companyCount[0]?.count ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Last Import</p>
          <p className="text-lg font-semibold">
            {recentImports[0]?.filename ?? "No imports yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
