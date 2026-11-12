import type { OrderStatus as Status } from "@/lib/backend/types";

const STYLES: Record<Status, string> = {
  "Awaiting Details": "bg-warn-soft text-[#92400e]",
  "In Progress": "bg-accent-soft text-accent",
  Delivered: "bg-good-soft text-good",
  Cancelled: "bg-line text-muted",
};

export function OrderStatus({ status }: { status: Status }) {
  return <span className={`pill ${STYLES[status]}`}>{status}</span>;
}
