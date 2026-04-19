import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, TrendingUp, Users, BarChart2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchViewStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [allViews, todayViews, weekViews] = await Promise.all([
    supabase.from("BrandView").select("id", { count: "exact", head: true }),
    supabase.from("BrandView").select("id", { count: "exact", head: true }).gte("viewed_at", todayStart),
    supabase.from("BrandView").select("id", { count: "exact", head: true }).gte("viewed_at", weekStart),
  ]);

  return {
    total: allViews.count ?? 0,
    today: todayViews.count ?? 0,
    week: weekViews.count ?? 0,
  };
}

async function fetchTopBrands() {
  const { data } = await supabase
    .from("BrandView")
    .select("brand_id, Brand(brand_name)")
    .gte("viewed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (!data) return [];

  const counts: Record<string, { name: string; views: number }> = {};
  for (const row of data) {
    const id = String(row.brand_id);
    const name = (row.Brand as { brand_name?: string } | null)?.brand_name ?? `Brand ${id}`;
    if (!counts[id]) counts[id] = { name, views: 0 };
    counts[id].views++;
  }

  return Object.values(counts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

async function fetchDailyViews() {
  const { data } = await supabase
    .from("BrandView")
    .select("viewed_at")
    .gte("viewed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("viewed_at", { ascending: true });

  if (!data) return [];

  const days: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short" });
    days[key] = 0;
  }

  for (const row of data) {
    const key = new Date(row.viewed_at).toLocaleDateString("ms-MY", { day: "2-digit", month: "short" });
    if (key in days) days[key]++;
  }

  return Object.entries(days).map(([date, views]) => ({ date, views }));
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({ queryKey: ["analytics-stats"], queryFn: fetchViewStats });
  const { data: topBrands = [] } = useQuery({ queryKey: ["analytics-top"], queryFn: fetchTopBrands });
  const { data: daily = [] } = useQuery({ queryKey: ["analytics-daily"], queryFn: fetchDailyViews });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display font-bold text-base">Analytics</h1>
            <p className="text-[11px] text-muted-foreground">Statistik pelawat website</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Paparan Hari Ini" value={stats?.today ?? 0} icon={<Eye className="w-5 h-5" />} />
          <StatCard label="7 Hari Lepas" value={stats?.week ?? 0} icon={<TrendingUp className="w-5 h-5" />} />
          <StatCard label="Jumlah Semua Masa" value={stats?.total ?? 0} icon={<Users className="w-5 h-5" />} />
        </div>

        {/* Daily views chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Paparan 7 Hari Lepas
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top brands chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-muted-foreground" /> Top 10 Brand Paling Banyak Dilawati (30 hari)
          </p>
          {topBrands.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data paparan lagi.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topBrands} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </main>
    </div>
  );
}
