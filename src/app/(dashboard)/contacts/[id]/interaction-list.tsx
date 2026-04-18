"use client";
import { Mail, Phone, Calendar, FileText } from "lucide-react";

interface Interaction {
  id: string;
  type: string;
  subject: string | null;
  notes: string | null;
  createdAt: Date | string;
}

interface Props {
  interactions: Interaction[];
}

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  email: "bg-blue-100 text-blue-600",
  call: "bg-green-100 text-green-600",
  meeting: "bg-purple-100 text-purple-600",
  note: "bg-gray-100 text-gray-600",
};

export function InteractionList({ interactions }: Props) {
  if (interactions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No interactions logged yet. Use the form to add one.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {interactions.map((interaction) => (
        <div key={interaction.id} className="p-4 hover:bg-gray-50">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${typeColors[interaction.type] || "bg-gray-100 text-gray-600"}`}>
              {typeIcons[interaction.type] || <FileText className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm capitalize">{interaction.type}</span>
                <span className="text-xs text-gray-500">
                  {new Date(interaction.createdAt).toLocaleDateString()} {" "}
                  {new Date(interaction.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {interaction.subject && (
                <p className="text-sm font-medium text-gray-900 mt-1">{interaction.subject}</p>
              )}
              {interaction.notes && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{interaction.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
