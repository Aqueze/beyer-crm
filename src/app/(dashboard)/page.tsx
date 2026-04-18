import { db } from "@/lib/db";
import { contacts, companies, imports, interactions } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatActivityType(type: string): string {
  const icons: Record<string, string> = {
    email: "📧",
    call: "📞",
    meeting: "📅",
    note: "📝",
  };
  return icons[type] || "📌";
}

export default async function DashboardPage() {
  const [contactCount, companyCount, importCount, recentImports, recentContacts, recentInteractions] = await Promise.all([
    db.select({ count: count() }).from(contacts),
    db.select({ count: count() }).from(companies),
    db.select({ count: count() }).from(imports),
    db.select().from(imports).orderBy(desc(imports.createdAt)).limit(5),
    db.select().from(contacts).orderBy(desc(contacts.updatedAt)).limit(5),
    db.select().from(interactions).orderBy(desc(interactions.createdAt)).limit(5),
  ]);

  const stats = [
    { label: "Total Contacts", value: contactCount[0]?.count ?? 0 },
    { label: "Total Companies", value: companyCount[0]?.count ?? 0 },
    { label: "Total Imports", value: importCount[0]?.count ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Widget */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity Widget */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {recentContacts.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            <ul className="space-y-3">
              {recentContacts.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                    <p className="text-sm text-gray-500">
                      {contact.companyId ? "Company contact" : "Individual contact"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(contact.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Tasks Widget */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Interactions</h2>
          {recentInteractions.length === 0 ? (
            <p className="text-gray-500 text-sm">No interactions recorded</p>
          ) : (
            <ul className="space-y-3">
              {recentInteractions.map((interaction) => (
                <li key={interaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{formatActivityType(interaction.type)}</span>
                    <div>
                      <p className="font-medium">{interaction.subject || interaction.type}</p>
                      <p className="text-sm text-gray-500 capitalize">{interaction.type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(interaction.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Imports</h2>
          <ul className="space-y-2">
            {recentImports.map((imp) => (
              <li key={imp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{imp.filename}</p>
                  <p className="text-sm text-gray-500">
                    {imp.importedRows ?? 0} rows imported
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    imp.status === "completed" ? "bg-green-100 text-green-700" :
                    imp.status === "failed" ? "bg-red-100 text-red-700" :
                    imp.status === "running" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {imp.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(imp.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
