"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  domain: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressPostalCode: z.string().optional(),
  addressCountry: z.string().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditCompanyPage({ params }: Props) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setCompanyId(p.id));
  }, [params]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/companies/${companyId}`)
      .then((r) => r.json())
      .then((data) => {
        reset(data);
        setLoading(false);
      });
  }, [companyId, reset]);

  const onSubmit = async (data: CompanyForm) => {
    if (!companyId) return;
    const res = await fetch(`/api/companies/${companyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push(`/companies/${companyId}`);
    } else {
      alert("Failed to update company");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Company</h1>
        <Link href="/companies" className="text-gray-600 hover:text-gray-900">Cancel</Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
          <input {...register("name")} className="w-full border rounded px-3 py-2" />
          {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <input {...register("domain")} placeholder="example.com" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input type="url" {...register("website")} placeholder="https://example.com" className="w-full border rounded px-3 py-2" />
            {errors.website && <p className="text-red-600 text-sm">{errors.website.message}</p>}
          </div>
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

        <div className="flex justify-end gap-2 pt-4">
          <Link href={`/companies/${companyId}`} className="px-4 py-2 border rounded">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
