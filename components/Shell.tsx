"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Boxes,
  Building2,
  ChevronLeft,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  Landmark,
  LogOut,
  PlusCircle,
  Boxes as BoxesIcon,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

/** `match` marks the item active only when every listed query param matches. */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: {} },
  { href: "/assets", label: "Assets", icon: Boxes, match: {} },
  { href: "/assets/new", label: "Create Asset", icon: PlusCircle, match: {} },
  { href: "/assets?status=Repair", label: "Under Repair", icon: Wrench, match: { status: "Repair" } },
  {
    href: "/assets?verified=false",
    label: "Pending Verification",
    icon: ShieldCheck,
    match: { verified: "false" },
  },
  { href: "/assets?entity=ENP", label: "ENP Assets", icon: Landmark, match: { entity: "ENP" } },
  { href: "/assets?entity=GCC", label: "GCC Assets", icon: Landmark, match: { entity: "GCC" } },
  {
    href: "/purchase-orders",
    label: "Purchase Orders",
    icon: ClipboardList,
    match: {},
  },
  {
    href: "/purchase-orders/new",
    label: "Create PO",
    icon: FilePlus2,
    match: {},
  },
  {
    href: "/vendors",
    label: "Vendors",
    icon: Building2,
    match: {},
  },
] as const;

function titleFor(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";

  if (pathname === "/purchase-orders") return "Purchase Orders";
  if (pathname === "/purchase-orders/new") return "Create Purchase Order";
  if (pathname.startsWith("/purchase-orders/")) {
    return pathname.endsWith("/edit") ? "Edit Purchase Order" : "Purchase Order";
  }

  if (pathname === "/vendors") return "Vendors";
  if (pathname === "/vendors/new") return "Add Vendor";
  if (pathname.startsWith("/vendors/")) {
    return pathname.endsWith("/edit") ? "Edit Vendor" : "Vendor";
  }

  if (pathname === "/assets/new") return "Create Asset";
  if (pathname.endsWith("/edit")) return "Edit Asset";
  if (/^\/assets\/[^/]+$/.test(pathname)) return "Asset Details";
  return "Assets";
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // "/assets" is active only when no shortcut filter is applied, so exactly one
  // sidebar row lights up at a time. The purchase register has filters of its
  // own but no sidebar shortcuts, so it is never dimmed by them.
  const shortcutKeys = ["status", "verified", "entity"] as const;
  const hasShortcut = shortcutKeys.some((k) => searchParams.get(k));

  const isActive = (href: string, match: Record<string, string>) => {
    const base = href.split("?")[0]!;
    if (pathname !== base) return false;
    const keys = Object.keys(match);
    if (!keys.length) return base !== "/assets" || !hasShortcut;
    return keys.every((k) => searchParams.get(k) === match[k]);
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f8]">
      {/* Sidebar */}
      <aside
        className={clsx(
          "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-200",
          collapsed ? "w-[68px]" : "w-[212px]"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BoxesIcon size={18} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-brand-800">
                AssetTrack
              </p>
              <p className="truncate text-[10px] leading-tight text-zinc-500">
                Fixed Asset Register
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <ChevronLeft
              size={16}
              className={clsx("transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>

        <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto p-2">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = isActive(href, match);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-brand-50 hover:text-brand-800"
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="m-2 rounded-lg bg-brand-50 p-3">
            <p className="text-xs font-semibold text-brand-800">Accounts Dashboard</p>
            <p className="text-[11px] text-brand-700/70">Asset & depreciation register</p>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 bg-brand-800 px-5 text-white shadow-sm">
          <h1 className="truncate text-lg font-semibold">{titleFor(pathname)}</h1>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm">
              <UserRound size={18} />
              <span className="hidden sm:inline">Accounts Admin</span>
            </span>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut();
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium hover:bg-rose-700 disabled:opacity-60"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">
                {signingOut ? "Signing out…" : "Logout"}
              </span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
