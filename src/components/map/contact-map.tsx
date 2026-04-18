"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function ContactMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView([51.1657, 10.4515], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    mapInstance.current = map;

    fetch("/api/map/contacts")
      .then((r) => r.json())
      .then((data) => {
        if (data.features) {
          L.geoJSON(data as any, {
            pointToLayer: (_: any, latlng: any) => L.marker(latlng),
            onEachFeature: (feature: any, layer: any) => {
              layer.bindPopup(`<b>${feature.properties.name}</b><br>${feature.properties.email || ""}<br>${feature.properties.distance}m away`);
            },
          }).addTo(map);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div ref={mapRef} className="w-full h-full">
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-gray-100">Loading map...</div>}
    </div>
  );
}
