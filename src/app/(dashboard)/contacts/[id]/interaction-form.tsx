"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

const interactionSchema = z.object({
  type: z.enum(["email", "call", "meeting", "note"]),
  subject: z.string().optional(),
  notes: z.string().min(1, "Notes are required"),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

interface Props {
  contactId: string;
}

export function InteractionForm({ contactId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      type: "note",
    },
  });

  const onSubmit = async (data: InteractionFormData) => {
    setIsSubmitting(true);
    const res = await fetch(`/api/contacts/${contactId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      reset();
      router.refresh();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          {...register("type")}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="email">Email</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="note">Note</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          {...register("subject")}
          placeholder="Brief subject"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes *</label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="What happened?"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {errors.notes && <p className="text-red-600 text-xs mt-1">{errors.notes.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
      >
        {isSubmitting ? "Saving..." : "Log Interaction"}
      </button>
    </form>
  );
}
