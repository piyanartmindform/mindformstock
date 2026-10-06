export const DELIVERY_STATUSES = ["confirmed", "prepared", "scheduled", "delivered", "billed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  confirmed: "ยืนยันแล้ว",
  prepared: "เตรียมของแล้ว",
  scheduled: "นัดส่งแล้ว",
  delivered: "ส่งมอบแล้ว",
  billed: "วางบิลแล้ว",
};

export const STATUS_BADGE: Record<DeliveryStatus, "gray" | "warning" | "info" | "success"> = {
  confirmed: "gray",
  prepared: "warning",
  scheduled: "info",
  delivered: "success",
  billed: "success",
};

// timestamp column that records when each status was reached
export const STATUS_DATE_COLUMN: Record<DeliveryStatus, string | null> = {
  confirmed: null,
  prepared: "prepared_at",
  scheduled: "scheduled_at",
  delivered: "delivered_at",
  billed: "billed_at",
};

export function nextStatus(s: DeliveryStatus): DeliveryStatus | null {
  return DELIVERY_STATUSES[DELIVERY_STATUSES.indexOf(s) + 1] ?? null;
}

export function prevStatus(s: DeliveryStatus): DeliveryStatus | null {
  return DELIVERY_STATUSES[DELIVERY_STATUSES.indexOf(s) - 1] ?? null;
}
