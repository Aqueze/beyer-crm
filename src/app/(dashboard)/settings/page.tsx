"use client";
import { useState, useEffect } from "react";

interface DomainMapping {
  id: string;
  domain: string;
  companyName: string | null;
  website: string | null;
  country: string | null;
  manuallyOverridden: boolean;
}

export default function SettingsPage() {
  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ domain: "", companyName: "", website: "", country: "" });
  const [isCreating, setIsCreating] = useState(false);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/domains");
      const data = await res.json();
      setDomains(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleCreate = async () => {
    if (!form.domain) return;
    await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, manuallyOverridden: true }),
    });
    setForm({ domain: "", companyName: "", website: "", country: "" });
    setIsCreating(false);
    fetchDomains();
  };

  const handleUpdate = async (id: string) => {
    await fetch(`/api/domains/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, manuallyOverridden: true }),
    });
    setForm({ domain: "", companyName: "", website: "", country: "" });
    setEditingId(null);
    fetchDomains();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this domain mapping?")) return;
    await fetch(`/api/domains/${id}`, { method: "DELETE" });
    fetchDomains();
  };

  const startEdit = (d: DomainMapping) => {
    setEditingId(d.id);
    setForm({ domain: d.domain, companyName: d.companyName || "", website: d.website || "", country: d.country || "" });
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Domain Mappings</h2>
          <p className="text-sm text-gray-500">
            Manually override email domain → company lookups. These take priority over automatic lookups.
          </p>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              {domains.map((d) => (
                <div key={d.id} className="border rounded p-4">
                  {editingId === d.id ? (
                    <div className="space-y-3">
                      <input
                        value={form.domain}
                        onChange={(e) => setForm({ ...form, domain: e.target.value })}
                        placeholder="domain.com"
                        className="w-full border rounded px-3 py-2"
                      />
                      <input
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="Company Name"
                        className="w-full border rounded px-3 py-2"
                      />
                      <input
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="https://company.com"
                        className="w-full border rounded px-3 py-2"
                      />
                      <input
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                        placeholder="Country"
                        className="w-full border rounded px-3 py-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(d.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setForm({ domain: "", companyName: "", website: "", country: "" }); }}
                          className="border px-3 py-1 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{d.domain}</div>
                        <div className="text-sm text-gray-600">
                          {d.companyName || "-"}
                          {d.website && <span> · <a href={d.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{d.website}</a></span>}
                          {d.country && <span> · {d.country}</span>}
                        </div>
                        {d.manuallyOverridden && (
                          <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Manual Override
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(d)} className="text-blue-600 hover:underline text-sm">Edit</button>
                        <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {domains.length === 0 && !isCreating && (
                <div className="text-center py-8 text-gray-500">
                  No domain mappings configured yet.
                </div>
              )}

              {isCreating && (
                <div className="border rounded p-4 space-y-3">
                  <input
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    placeholder="domain.com"
                    className="w-full border rounded px-3 py-2"
                  />
                  <input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Company Name"
                    className="w-full border rounded px-3 py-2"
                  />
                  <input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full border rounded px-3 py-2"
                  />
                  <input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Country"
                    className="w-full border rounded px-3 py-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreate} className="bg-blue-600 text-white px-3 py-1 rounded">Create</button>
                    <button onClick={() => { setIsCreating(false); setForm({ domain: "", companyName: "", website: "", country: "" }); }} className="border px-3 py-1 rounded">Cancel</button>
                  </div>
                </div>
              )}

              {!isCreating && (
                <button onClick={() => setIsCreating(true)} className="w-full border-2 border-dashed border-gray-300 rounded p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600">
                  + Add Domain Mapping
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Geocoding Configuration</h2>
        </div>
        <div className="p-4 text-sm text-gray-600">
          <p className="mb-2">
            <strong>Nominatim</strong> (OpenStreetMap) is used as the primary geocoding service with a rate limit of 1 request/second.
          </p>
          <p className="mb-2">
            <strong>OpenCage</strong> can be configured as a fallback. Get an API key at{" "}
            <a href="https://opencagedata.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              opencagedata.com
            </a>
          </p>
          <p>
            Geocoding results are cached in the database to reduce API calls and improve performance.
          </p>
        </div>
      </div>
    </div>
  );
}
