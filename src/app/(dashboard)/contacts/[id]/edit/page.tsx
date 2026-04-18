"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().uuid("Invalid company ID").optional().or(z.literal("")),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressPostalCode: z.string().optional(),
  addressCountry: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditContactPage({ params }: Props) {
  const router = useRouter();
  const [contactId, setContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setContactId(p.id));
  }, [params]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });

  useEffect(() => {
    if (!contactId) return;
    fetch(`/api/contacts/${contactId}`)
      .then((r) => r.json())
      .then((data) => {
        reset({
          ...data,
          companyId: data.companyId || "",
          tags: data.tags?.join(", ") || "",
        });
        setLoading(false);
      });
  }, [contactId, reset]);

  const onSubmit = async (data: ContactForm) => {
    if (!contactId) return;
    const payload = {
      ...data,
      companyId: data.companyId || null,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push(`/contacts/${contactId}`);
    } else {
      alert("Failed to update contact");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Contact</h1>
        <Link href="/contacts" className="text-gray-600 hover:text-gray-900">Cancel</Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input {...register("firstName")} className="w-full border rounded px-3 py-2" />
            {errors.firstName && <p className="text-red-600 text-sm">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input {...register("lastName")} className="w-full border rounded px-3 py-2" />
            {errors.lastName && <p className="text-red-600 text-sm">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" {...register("email")} className="w-full border rounded px-3 py-2" />
            {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input {...register("phone")} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
          <input {...register("companyId")} placeholder="UUID of existing company" className="w-full border rounded px-3 py-2" />
          {errors.companyId && <p className="text-red-600 text-sm">{errors.companyId.message}</p>}
        </div>

        <fieldset className="border rounded p-4">
          <legend className="text-sm font-medium text-gray-700">Address</legend>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Street</label>
              <input {...register("addressStreet")} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Postal Code</label>
                <input {...register("addressPostalCode")} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-500 mb-1">City</label>
                <input {...register("addressCity")} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Country</label>
              <input {...register("addressCountry")} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input {...register("tags")} placeholder="customer, lead, vip" className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea {...register("notes")} rows={3} className="w-full border rounded px-3 py-2" />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Link href={`/contacts/${contactId}`} className="px-4 py-2 border rounded">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
