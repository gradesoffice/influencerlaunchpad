import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Heart, MessageCircle, Send, ShoppingCart, ArrowLeft, Loader2, Calendar, Sparkles, FileText, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Influencer Launchpad" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/login" });
    }
  },
  component: AnalyticsPage,
});

type FeedbackRow = {
  week_number: number; day: number; slot: string;
  likes: number; comments: number; messages: number; conversions: number; note: string;
};

type StrategyRow = {
  id: string; niche: string; platform: string; created_at: string; posts_per_day: number;
  brand: { tagline?: string; contentPillars?: { name: string }[] };
  phases: { name: string; weeklyThemes: string[] }[];
};

type WeekRow = {
  week_number: number;
  data: { days: { posts: { format: string; slot: string; hook: string }[] }[] };
};

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [weekData, setWeekData] = useState<WeekRow[]>([]);
  const [feedbackData, setFeedbackData] = useState<FeedbackRow[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: strats } = await supabase
      .from("strategies")
      .select("id, niche, platform, created_at, posts_per_day, brand, phases")
      .order("created_at", { ascending: false });

    if (strats && strats.length > 0) {
      setStrategies(strats as unknown as StrategyRow[]);
      await selectStrategy(strats[0].id);
    }
    setLoading(false);
  };

  const selectStrategy = async (id: string) => {
    setSelectedStrategy(id);
    const [{ data: weeks }, { data: fb }] = await Promise.all([
      supabase.from("weeks").select("week_number, data").eq("strategy_id", id).order("week_number"),
      supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note").eq("strategy_id", id),
    ]);
    setWeekData((weeks as unknown as WeekRow[]) ?? []);
    setFeedbackData((fb as FeedbackRow[]) ?? []);
  };

  const currentStrategy = strategies.find(s => s.id === selectedStrategy);

  // === Section 1: Auto stats from strategies + weeks ===
  const totalWeeksGenerated = weekData.length;
  const totalPostsGenerated = weekData.reduce((sum, w) => {
    const days = (w.data as unknown as { days: { posts: unknown[] }[] })?.days ?? [];
    return sum + days.reduce((s, d) => s + (d.posts?.length ?? 0), 0);
  }, 0);
  const totalPhases = currentStrategy?.phases?.length ?? 0;
  const daysSinceStart = currentStrategy ? Math.floor((Date.now() - new Date(currentStrategy.created_at).getTime()) / 86400000) : 0;

  // Format distribution from generated weeks
  const formatCounts: Record<string, number> = {};
  weekData.forEach(w => {
    const days = (w.data as unknown as { days: { posts: { format: string }[] }[] })?.days ?? [];
    days.forEach(d => d.posts?.forEach(p => {
      const fmt = p.format || "Lainnya";
      formatCounts[fmt] = (formatCounts[fmt] ?? 0) + 1;
    }));
  });
  const formatChart = Object.entries(formatCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // === Section 2: Performance from feedback ===
  const hasFeedback = feedbackData.length > 0;
  const totals = feedbackData.reduce(
    (acc, f) => ({ posts: acc.posts + 1, likes: acc.likes + f.likes, comments: acc.comments + f.comments, messages: acc.messages + f.messages, conversions: acc.conversions + f.conversions }),
    { posts: 0, likes: 0, comments: 0, messages: 0, conversions: 0 }
  );

  // Weekly performance chart
  const weeklyMap = new Map<number, { likes: number; comments: number; messages: number; conversions: number }>();
  feedbackData.forEach(f => {
    const cur = weeklyMap.get(f.week_number) ?? { likes: 0, comments: 0, messages: 0, conversions: 0 };
    cur.likes += f.likes; cur.comments += f.comments; cur.messages += f.messages; cur.conversions += f.conversions;
    weeklyMap.set(f.week_number, cur);
  });
  const weeklyChart = Array.from(weeklyMap.entries()).sort((a, b) => a[0] - b[0]).map(([week, data]) => ({ week: `W${week}`, ...data }));

  const avgEngagement = totals.posts > 0 ? Math.round((totals.likes + totals.comments + totals.messages) / totals.posts) : 0;
  const conversionRate = totals.posts > 0 ? ((totals.conversions / totals.posts) * 100).toFixed(1) : "0";

  const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (strategies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-soft)" }}>
        <Card className="p-12 text-center max-w-md">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">Belum ada strategi</h2>
          <p className="mt-2 text-muted-foreground">Generate strategi pertama kamu untuk melihat analytics.</p>
          <Link to="/"><Button className="mt-4">Buat Strategi</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--gradient-soft)" }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link to="/"><Button variant="ghost" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Roadmap</Button></Link>
            <h1 className="text-3xl font-bold flex items-center gap-3"><BarChart3 className="h-8 w-8 text-primary" /> Analytics</h1>
            <p className="mt-1 text-muted-foreground">Overview strategi & performa konten kamu.</p>
          </div>
        </div>

        {/* Strategy selector */}
        {strategies.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {strategies.map(s => (
              <Button key={s.id} variant={selectedStrategy === s.id ? "default" : "outline"} size="sm" onClick={() => selectStrategy(s.id)}>
                {s.niche.substring(0, 30)} · {s.platform}
              </Button>
            ))}
          </div>
        )}

        {/* Section 1: Content Overview (auto, no manual input needed) */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="h-5 w-5" /> Content Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon={<Sparkles className="h-5 w-5" />} label="Strategi Aktif" value={strategies.length} />
          <StatCard icon={<Calendar className="h-5 w-5" />} label="Minggu Di-generate" value={totalWeeksGenerated} />
          <StatCard icon={<FileText className="h-5 w-5" />} label="Total Konten" value={totalPostsGenerated} />
          <StatCard icon={<Zap className="h-5 w-5" />} label="Hari Sejak Mulai" value={daysSinceStart} />
        </div>

        {/* Strategy info */}
        {currentStrategy && (
          <Card className="p-5 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strategi Aktif</p>
                <p className="mt-1 text-lg font-bold">{currentStrategy.niche}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{currentStrategy.platform}</Badge>
                  <Badge variant="outline">{currentStrategy.posts_per_day} konten/hari</Badge>
                  <Badge variant="outline">{totalPhases} phase</Badge>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Dibuat: {new Date(currentStrategy.created_at).toLocaleDateString("id-ID")}</p>
                <p>{totalWeeksGenerated} / {currentStrategy.phases.reduce((s, p) => s + p.weeklyThemes.length, 0)} minggu selesai</p>
              </div>
            </div>
          </Card>
        )}

        {/* Format distribution chart */}
        {formatChart.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Distribusi Format Konten</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={formatChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>
                    {formatChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Proporsi Format</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={formatChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {formatChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Section 2: Performance (from manual feedback) */}
        <h2 className="text-xl font-bold mb-4 mt-12 flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Performa Konten</h2>

        {!hasFeedback ? (
          <Card className="p-8 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-semibold">Belum ada data performa</h3>
            <p className="mt-1 text-sm text-muted-foreground">Catat likes, komentar, DM, dan konversi di halaman Roadmap setelah posting konten.</p>
            <Link to="/"><Button variant="outline" className="mt-4">Ke Roadmap</Button></Link>
          </Card>
        ) : (
          <>
            {/* Performance summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
              <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Konten Tercatat" value={totals.posts} />
              <StatCard icon={<Heart className="h-5 w-5" />} label="Total Likes" value={totals.likes} />
              <StatCard icon={<MessageCircle className="h-5 w-5" />} label="Total Komentar" value={totals.comments} />
              <StatCard icon={<Send className="h-5 w-5" />} label="Total DM" value={totals.messages} />
              <StatCard icon={<ShoppingCart className="h-5 w-5" />} label="Total Konversi" value={totals.conversions} highlight />
            </div>

            {/* KPI */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <Card className="p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Engagement / Post</p>
                <p className="mt-2 text-3xl font-bold text-primary">{avgEngagement}</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversion Rate</p>
                <p className="mt-2 text-3xl font-bold text-primary">{conversionRate}%</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minggu Aktif</p>
                <p className="mt-2 text-3xl font-bold text-primary">{weeklyMap.size}</p>
              </Card>
            </div>

            {/* Charts */}
            {weeklyChart.length > 1 && (
              <div className="grid gap-6 lg:grid-cols-2 mb-8">
                <Card className="p-6">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Engagement per Minggu</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="likes" fill="#ef4444" name="Likes" />
                      <Bar dataKey="comments" fill="#f59e0b" name="Komentar" />
                      <Bar dataKey="messages" fill="#6366f1" name="DM" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-6">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Konversi per Minggu</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weeklyChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={3} name="Konversi" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`${highlight ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
