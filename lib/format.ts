import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import type { AssetStatus } from "./types";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function money(value?: number | null, precise = false): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return precise ? currencyPrecise.format(n) : currency.format(n);
}

/** Compact money for stat tiles: ₹1.2L, ₹3.4Cr. */
export function moneyShort(value?: number | null): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return currency.format(n);
}

function asDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

export function shortDate(value?: string | Date | null): string {
  const d = asDate(value);
  return d ? format(d, "dd/MM/yyyy") : "—";
}

export function dateTime(value?: string | Date | null): string {
  const d = asDate(value);
  return d ? format(d, "dd/MM/yyyy, HH:mm") : "—";
}

/** Value for an <input type="date">. */
export function dateInput(value?: string | Date | null): string {
  const d = asDate(value);
  return d ? format(d, "yyyy-MM-dd") : "";
}

/**
 * Turns the "2026-08" month key the stats endpoint returns into 08/2026.
 * The raw key stays sortable; only the label changes.
 */
export function monthLabel(key?: string | null): string {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key ?? ""));
  return m ? `${m[2]}/${m[1]}` : String(key ?? "—");
}

export function relative(value?: string | Date | null): string {
  const d = asDate(value);
  return d ? `${formatDistanceToNowStrict(d)} ago` : "—";
}

export function fileSize(bytes?: number | null): string {
  const n = Number(bytes ?? 0);
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const STATUS_STYLES: Record<AssetStatus, string> = {
  Active: "bg-brand-100 text-brand-800 ring-brand-200",
  Repair: "bg-amber-100 text-amber-800 ring-amber-200",
  Sold: "bg-sky-100 text-sky-800 ring-sky-200",
  Scrapped: "bg-rose-100 text-rose-800 ring-rose-200",
};

/** ENP and GCC get distinct, non-status colours so the two never read as state. */
export const ENTITY_STYLES: Record<string, string> = {
  ENP: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  GCC: "bg-violet-100 text-violet-800 ring-violet-200",
};

export const WARRANTY_STYLES: Record<string, string> = {
  "In Warranty": "bg-brand-100 text-brand-800 ring-brand-200",
  "Expiring Soon": "bg-amber-100 text-amber-800 ring-amber-200",
  Expired: "bg-rose-100 text-rose-800 ring-rose-200",
  Unknown: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function initials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
