"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Contact } from "@/lib/db/schema";

interface ContactFilters {
  q: string;
  tags: string[];
  page: number;
}

interface ContactsResponse {
  contacts: Contact[];
  page: number;
  limit: number;
  hasMore: boolean;
}

const SAVED_FILTERS_KEY = "beyer_crm_saved_filters";

interface SavedFilter {
  id: string;
  name: string;
  filters: ContactFilters;
}

function buildFilterParams(filters: ContactFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  filters.tags.forEach((tag) => params.append("tag", tag));
  params.set("page", String(filters.page));
  return params.toString();
}

function parseFiltersFromParams(searchParams: URLSearchParams): ContactFilters {
  return {
    q: searchParams.get("q") || "",
    tags: searchParams.getAll("tag"),
    page: parseInt(searchParams.get("page") || "1"),
  };
}

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const currentFilters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    const stored = localStorage.getItem(SAVED_FILTERS_KEY);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch {
        setSavedFilters([]);
      }
    }
  }, []);

  const fetchContacts = useCallback(
    async (filters: ContactFilters) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set("q", filters.q);
        filters.tags.forEach((tag) => params.append("tag", tag));
        params.set("page", String(filters.page));

        const res = await fetch(`/api/contacts?${params.toString()}`);
        if (res.ok) {
          const data: ContactsResponse = await res.json();
          setContacts(data.contacts);
          setHasMore(data.hasMore);
          setCurrentPage(data.page);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchContacts(currentFilters);
  }, [currentFilters, fetchContacts]);

  const updateFilters = useCallback(
    (newFilters: Partial<ContactFilters>) => {
      const updated = { ...currentFilters, ...newFilters, page: 1 };
      const params = buildFilterParams(updated);
      router.push(`/contacts?${params}`);
    },
    [currentFilters, router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ q: e.target.value });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = currentFilters.tags.includes(tag)
      ? currentFilters.tags.filter((t) => t !== tag)
      : [...currentFilters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const handlePageChange = (newPage: number) => {
    const updated = { ...currentFilters, page: newPage };
    const params = buildFilterParams(updated);
    router.push(`/contacts?${params}`);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} contact(s)?`)) return;
    const ids = Array.from(selectedIds);
    const params = ids.map((id) => `id=${id}`).join("&");
    const res = await fetch(`/api/contacts?${params}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedIds(new Set());
      fetchContacts(currentFilters);
    }
  };

  const handleBulkTag = async (tagsToAdd: string[]) => {
    if (selectedIds.size === 0) return;
    const res = await fetch(`/api/contacts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selectedIds),
        tags: tagsToAdd,
      }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      fetchContacts(currentFilters);
    }
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { q: currentFilters.q, tags: currentFilters.tags, page: 1 },
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    setShowSaveFilterModal(false);
    setFilterName("");
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    const params = buildFilterParams({ ...filter.filters, page: 1 });
    router.push(`/contacts?${params}`);
  };

  const handleDeleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((c) => c.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [contacts]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Link
          href="/contacts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Contact
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search contacts by name, email, or phone..."
          value={currentFilters.q}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Tags:</span>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTagToggle(tag)}
            className={`px-2 py-1 text-xs rounded border ${
              currentFilters.tags.includes(tag)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {tag}
          </button>
        ))}
        {allTags.length === 0 && (
          <span className="text-xs text-gray-400">No tags yet</span>
        )}

        {currentFilters.tags.length > 0 && (
          <button
            onClick={() => updateFilters({ tags: [] })}
            className="text-xs text-red-600 hover:underline ml-2"
          >
            Clear tags
          </button>
        )}

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <div className="relative ml-auto">
            <select
              onChange={(e) => {
                const filter = savedFilters.find((f) => f.id === e.target.value);
                if (filter) handleLoadFilter(filter);
              }}
              defaultValue=""
              className="px-3 py-1 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="" disabled>
                Load saved filter...
              </option>
              {savedFilters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Save Current Filter */}
        {(currentFilters.q || currentFilters.tags.length > 0) && (
          <button
            onClick={() => setShowSaveFilterModal(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Save filter
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => {
              const tag = prompt("Enter tag to add:");
              if (tag) handleBulkTag([tag]);
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Tag
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-600 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === contacts.length && contacts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className={`hover:bg-gray-50 ${
                    selectedIds.has(contact.id) ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => handleSelectOne(contact.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{contact.email}</td>
                  <td className="px-4 py-3 text-gray-600">{contact.phone}</td>
                  <td className="px-4 py-3">
                    {contact.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-gray-200 rounded px-2 py-0.5 text-xs mr-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No contacts found. Create your first contact or import from Excel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {contacts.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-600">
            Page {currentPage}
            {hasMore && "+"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasMore}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Save Filter Modal */}
      {showSaveFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Save Filter</h2>
            <input
              type="text"
              placeholder="Filter name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveFilterModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}