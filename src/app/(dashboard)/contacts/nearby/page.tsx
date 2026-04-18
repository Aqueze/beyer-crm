"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName?: string;
  distance_m: number | null;
}

const RADII = [
  { label: "10 km", value: 10000 },
  { label: "25 km", value: 25000 },
  { label: "50 km", value: 50000 },
  { label: "100 km", value: 100000 },
  { label: "250 km", value: 250000 },
];

function formatDistance(m: number | null): string {
  if (m === null) return "Unknown";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function NearbyPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(50000);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const fetchNearby = useCallback(async (lat: number, lng: number, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/nearby?lat=${lat}&lng=${lng}&radius=${r}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setContacts(data);
    } catch {
      setError("Could not load nearby contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = () => {
    setGeolocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        fetchNearby(pos.coords.latitude, pos.coords.longitude, radius);
      },
      () => {
        setGeolocationError("Geolocation permission denied or unavailable");
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (position) {
      fetchNearby(position.coords.latitude, position.coords.longitude, radius);
    }
  }, [radius, position, fetchNearby]);

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nearby Contacts</h1>
        <button onClick={requestLocation} className="bg-blue-600 text-white px-4 py-2 rounded">
          📍 Refresh Location
        </button>
      </div>

      {geolocationError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          {geolocationError}. Please enable location services in your browser.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Radius</label>
        <div className="flex gap-2 flex-wrap">
          {RADII.map((r) => (
            <button
              key={r.value}
              onClick={() => setRadius(r.value)}
              className={`px-3 py-1 rounded border ${
                radius === r.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Finding contacts near you...</div>}

      {!loading && !geolocationError && position && (
        <div className="bg-white rounded-lg shadow divide-y">
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No contacts found within {RADII.find((r) => r.value === radius)?.label}.
            </div>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline font-medium">
                      {contact.firstName} {contact.lastName}
                    </Link>
                    {contact.email && (
                      <div className="text-sm text-gray-500">
                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="text-sm text-gray-500">
                        <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDistance(contact.distance_m)}
                    </div>
                    <div className="text-xs text-gray-500">away</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
