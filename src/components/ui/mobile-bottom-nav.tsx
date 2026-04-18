"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  Map,
  Navigation,
  Upload,
  Settings,
} from "lucide-react";

const tabs = [
  { label: "Contacts", href: "/contacts", icon: Contact },
  { label: "Map", href: "/map", icon: Map },
  { label: "Nearby", href: "/contacts/nearby", icon: Navigation },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/contacts"
              ? pathname === "/contacts" || pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-colors ${
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-5 w-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
              <span className="font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
