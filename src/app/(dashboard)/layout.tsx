import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MobileBottomNav from "@/components/ui/mobile-bottom-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:block w-64 bg-slate-900 text-white p-4">
        <h1 className="text-xl font-bold mb-8">BeyCRM</h1>
        <nav className="space-y-2">
          <Link href="/" className="block px-4 py-2 rounded hover:bg-slate-800">Dashboard</Link>
          <Link href="/contacts" className="block px-4 py-2 rounded hover:bg-slate-800">Contacts</Link>
          <Link href="/companies" className="block px-4 py-2 rounded hover:bg-slate-800">Companies</Link>
          <Link href="/map" className="block px-4 py-2 rounded hover:bg-slate-800">Map</Link>
          <Link href="/import" className="block px-4 py-2 rounded hover:bg-slate-800">Import</Link>
          <Link href="/settings" className="block px-4 py-2 rounded hover:bg-slate-800">Settings</Link>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 pb-20">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
