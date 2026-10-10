import { APP_MESSAGES } from "../constants/messages";

function toValidDate(date: string | Date | number): Date | null {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatShortDateTime(date: string | Date | number): string {
  const d = toValidDate(date);
  if (!d) return String(date);
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${APP_MESSAGES.AT} ${timePart}`;
}

export function formatDetailedDateTime(date: string | Date | number): string {
  const d = toValidDate(date);
  if (!d) return String(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function formatStandardDateTime(date: string | Date | number): string {
  const d = toValidDate(date);
  if (!d) return String(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
