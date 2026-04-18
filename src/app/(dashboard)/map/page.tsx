"use client";
import dynamic from "next/dynamic";

const ContactMap = dynamic(() => import("@/components/map/contact-map"), { ssr: false });

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold mb-4">Contact Map</h1>
      <div className="h-[calc(100%-3rem)] bg-gray-100 rounded-lg overflow-hidden">
        <ContactMap />
      </div>
    </div>
  );
}
