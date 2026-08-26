"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * A date input that always reads and writes dd/mm/yyyy.
 *
 * The native <input type="date"> renders in the browser's locale — a US-locale
 * browser shows mm/dd/yyyy and no attribute or CSS can change it — so this draws
 * its own calendar instead.
 *
 * `value` and `onChange` stay in ISO (yyyy-MM-dd), matching what the form and the
 * API already exchange; only the display differs.
 */

const DISPLAY = "dd/MM/yyyy";
const ISO = "yyyy-MM-dd";
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function isoToDate(iso: string): Date | null {
  if (!iso) return null;
  const d = parse(iso, ISO, new Date());
  return isValid(d) ? d : null;
}

/** Accepts 5/8/26, 05-08-2026, 05/08/2026 — all read as day-first. */
function parseTyped(text: string): Date | null {
  const cleaned = text.trim().replace(/[.\-\s]/g, "/");
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(cleaned);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (m[3]!.length === 2) year += year < 70 ? 2000 : 1900;

  const d = new Date(year, month - 1, day);
  // Reject rollovers like 31/02 that Date would silently shift into March.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

export default function DateField({
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "dd/mm/yyyy",
  id,
}: {
  /** ISO yyyy-MM-dd, or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const selected = useMemo(() => isoToDate(value), [value]);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => (selected ? format(selected, DISPLAY) : ""));
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected ?? new Date()));

  const wrapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);

  // Pull an externally changed value back into the box (form reset, edit load).
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    const next = isoToDate(value);
    setText(next ? format(next, DISPLAY) : "");
    if (next) setViewMonth(startOfMonth(next));
  }

  const POPUP_W = 248;
  const POPUP_H = 320;

  /** Positions the popup against the viewport, flipping up when short on room. */
  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    const roomBelow = window.innerHeight - r.bottom;
    const top =
      roomBelow < POPUP_H && r.top > POPUP_H ? r.top - POPUP_H - 4 : r.bottom + 4;

    // Keep it on screen horizontally too.
    const left = Math.min(Math.max(8, r.left), window.innerWidth - POPUP_W - 8);

    setAnchor({ left, top });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The popup lives in a portal, so it is not inside wrapRef.
      if (wrapRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // `true` catches scrolling of any ancestor, not just the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const commitText = (raw: string) => {
    if (!raw.trim()) {
      onChange("");
      setText("");
      return;
    }
    const parsed = parseTyped(raw);
    if (parsed) {
      onChange(format(parsed, ISO));
      setText(format(parsed, DISPLAY));
      setViewMonth(startOfMonth(parsed));
    } else {
      // Unparseable — snap back to whatever is actually stored.
      setText(selected ? format(selected, DISPLAY) : "");
    }
  };

  const pick = (day: Date) => {
    onChange(format(day, ISO));
    setText(format(day, DISPLAY));
    setOpen(false);
  };

  // Six fixed weeks keeps the popup from resizing as months change.
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const today = startOfDay(new Date());

  return (
    <div className="relative" ref={wrapRef}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitText(text);
            setOpen(false);
          }
        }}
        onFocus={() => setOpen(true)}
        className={clsx(
          "w-full rounded-lg border bg-white py-2 pl-3 pr-9 text-sm text-zinc-900 outline-none transition",
          "placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500/20",
          "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500",
          invalid
            ? "border-rose-400 focus:border-rose-500"
            : "border-zinc-300 focus:border-brand-500"
        )}
      />

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open calendar"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed"
      >
        <CalendarDays size={15} />
      </button>

      {open &&
        !disabled &&
        anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Choose a date"
            style={{ left: anchor.left, top: anchor.top, width: POPUP_W }}
            className="animate-fade-in fixed z-[100] rounded-lg border border-zinc-200 bg-white p-2.5 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-zinc-800">
                {format(viewMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="py-1 text-center text-[10px] font-semibold uppercase text-zinc-400"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isSelected = selected && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pick(day)}
                    className={clsx(
                      "h-7 rounded text-xs transition",
                      isSelected
                        ? "bg-brand-600 font-semibold text-white"
                        : inMonth
                          ? "text-zinc-700 hover:bg-brand-50"
                          : "text-zinc-300 hover:bg-zinc-50",
                      !isSelected && isToday && "font-bold text-brand-700 ring-1 ring-brand-300"
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
              <button
                type="button"
                onClick={() => pick(today)}
                className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setText("");
                  setOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
              >
                <X size={12} />
                Clear
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
