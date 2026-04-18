import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MobileBottomNav from "@/components/ui/mobile-bottom-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:block w-64 bg-slate-900 text-white p-4">
        <h1 className="text-xl font-bold mb-8">BeyCRM</h1>
        <nav className="space-y-2">
          <a href="/" className="block px-4 py-2 rounded hover:bg-slate-800">Dashboard</a>
          <a href="/contacts" className="block px-4 py-2 rounded hover:bg-slate-800">Contacts</a>
          <a href="/companies" className="block px-4 py-2 rounded hover:bg-slate-800">Companies</a>
          <a href="/map" className="block px-4 py-2 rounded hover:bg-slate-800">Map</a>
          <a href="/import" className="block px-4 py-2 rounded hover:bg-slate-800">Import</a>
          <a href="/settings" className="block px-4 py-2 rounded hover:bg-slate-800">Settings</a>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 pb-20">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
