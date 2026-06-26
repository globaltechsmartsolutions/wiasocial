import type { LeadStatus } from "@/types";

export const leadStatusColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacted: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  call_booked: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  client: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};
