"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Boxes,
  ClipboardCheck,
  Landmark,
  Plus,
  ShieldAlert,
  TrendingDown,
  TriangleAlert,
  Wallet,
  Wrench,
} from "lucide-react";

import { Badge, Card, EmptyState, SectionCard, Spinner } from "@/components/ui";
import {
  ENTITY_STYLES,
  STATUS_STYLES,
  money,
  moneyShort,
  monthLabel,
  shortDate,
} from "@/lib/format";
import { apiError, fetchAssets, fetchStats } from "@/lib/api";
import { ASSET_STATUSES, type Asset, type Stats } from "@/lib/types";

/* Categorical palette — one hue family, distinct steps, readable on white. */
const STATUS_COLORS: Record<string, string> = {
  Active: "#16a34a",
  Repair: "#f59e0b",
  Sold: "#0ea5e9",
  Scrapped: "#f43f5e",
};

const ENTITY_COLORS: Record<string, string> = {
  ENP: "#6366f1",
  GCC: "#8b5cf6",
};

const BAR_COLOR = "#16a34a";
const LINE_COLOR = "#0d9488";

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStats(), fetchAssets({ page: 1, limit: 8 })])
      .then(([s, list]) => {
        if (cancelled) return;
        setStats(s);
        setRecent(list.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, "Could not load the dashboard"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 p-16 text-zinc-500">
        <Spinner className="h-5 w-5" />
        Loading dashboard…
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <EmptyState
          icon={<TriangleAlert size={40} />}
          title="Dashboard unavailable"
          description={error ?? "No data returned."}
        />
      </Card>
    );
  }

  const tiles = [
    {
      label: "Total assets",
      value: stats.totalAssets.toLocaleString(),
      sub: `${stats.statusCounts.Active} active`,
      icon: Boxes,
      href: "/assets",
      tone: "text-brand-600",
    },
    {
      label: "Purchase value",
      value: moneyShort(stats.totalPurchaseValue),
      sub: "Gross book cost",
      icon: Wallet,
      href: "/assets",
      tone: "text-sky-600",
    },
    {
      label: "Current book value",
      value: moneyShort(stats.totalBookValue),
      sub: `${moneyShort(stats.totalDepreciation)} depreciated`,
      icon: TrendingDown,
      href: "/assets",
      tone: "text-teal-600",
    },
    {
      label: "Pending verification",
      value: stats.unverified.toLocaleString(),
      sub: "Not physically checked",
      icon: ClipboardCheck,
      href: "/assets?verified=false",
      tone: "text-amber-600",
    },
    {
      label: "Under repair",
      value: stats.statusCounts.Repair.toLocaleString(),
      sub: "Currently in service",
      icon: Wrench,
      href: "/assets?status=Repair",
      tone: "text-orange-600",
    },
    {
      label: "Warranty alerts",
      value: (stats.warrantyExpiring + stats.warrantyExpired).toLocaleString(),
      sub: `${stats.warrantyExpiring} expiring · ${stats.warrantyExpired} expired`,
      icon: ShieldAlert,
      href: "/assets",
      tone: "text-rose-600",
    },
  ];

  const statusData = ASSET_STATUSES.map((s) => ({
    name: s,
    value: stats.statusCounts[s],
  })).filter((d) => d.value > 0);

  const hasCharts = stats.totalAssets > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- Stat tiles ---------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map(({ label, value, sub, icon: Icon, href, tone }) => (
          <Link key={label} href={href}>
            <Card className="h-full p-4 transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                <Icon size={17} className={tone} />
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      {!hasCharts ? (
        <Card>
          <EmptyState
            icon={<Boxes size={40} />}
            title="No assets yet"
            description="Create your first asset record to populate the dashboard."
            action={
              <Link
                href="/assets/new"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={16} />
                Create Asset
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* ---------------- Charts ---------------- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Assets by status" icon={<Boxes size={16} />}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name] ?? "#a1a1aa"}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${Number(value)} assets`, String(name)]}
                      contentStyle={tooltipStyle}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Assets by entity" icon={<Landmark size={16} />}>
              <div className="h-64">
                {stats.byEntity.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-zinc-400">
                    No entities recorded yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byEntity}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {stats.byEntity.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={ENTITY_COLORS[entry.name] ?? "#a1a1aa"}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, item) => [
                          `${Number(value)} assets · ${money(item?.payload?.value ?? 0)}`,
                          String(name),
                        ]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Assets by department"
              icon={<Boxes size={16} />}
              description="Top 8 by count"
            >
              <div className="h-64">
                {stats.byDepartment.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-zinc-400">
                    No departments recorded yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byDepartment}
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e4e4e7" }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#f4f4f5" }}
                        formatter={(value, _name, item) => [
                          `${Number(value)} assets · ${money(item?.payload?.value ?? 0)}`,
                          "Count",
                        ]}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={38} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Purchases over time"
              icon={<TrendingDown size={16} />}
              description="By purchase month"
            >
              <div className="h-64">
                {stats.monthly.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-zinc-400">
                    No purchase dates recorded yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={stats.monthly}
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickFormatter={monthLabel}
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e4e4e7" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        labelFormatter={(label) => monthLabel(String(label))}
                        formatter={(value, name) =>
                          name === "value"
                            ? [money(Number(value)), "Spend"]
                            : [String(value), "Assets"]
                        }
                        contentStyle={tooltipStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={LINE_COLOR}
                        strokeWidth={2}
                        dot={{ r: 3, fill: LINE_COLOR }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ---------------- Recent records ---------------- */}
          <SectionCard
            title="Recently added"
            icon={<Boxes size={16} />}
            action={
              <Link
                href="/assets"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                View all →
              </Link>
            }
          >
            <div className="thin-scroll -mx-1 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                    <th className="py-2 pr-3 font-medium">FA Code</th>
                    <th className="py-2 pr-3 font-medium">Entity</th>
                    <th className="py-2 pr-3 font-medium">Product</th>
                    <th className="py-2 pr-3 font-medium">Assigned to</th>
                    <th className="py-2 pr-3 font-medium">Purchased</th>
                    <th className="py-2 pr-3 text-right font-medium">Cost</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recent.map((a) => (
                    <tr key={a._id} className="hover:bg-brand-50/40">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/assets/${encodeURIComponent(a._id)}`}
                          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                        >
                          {a.assetCode}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">
                        {a.entity ? (
                          <Badge className={ENTITY_STYLES[a.entity]}>{a.entity}</Badge>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-zinc-800">{a.product}</td>
                      <td className="py-2.5 pr-3 text-zinc-600">
                        {a.assignedEmployee?.name || (
                          <span className="text-xs text-zinc-400">Unassigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">
                        {shortDate(a.purchaseDate)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-zinc-700">
                        {money(a.purchaseCost)}
                      </td>
                      <td className="py-2.5">
                        <Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
};
