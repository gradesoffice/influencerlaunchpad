import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, Heart, MessageCircle, Send, ShoppingCart, ArrowLeft, Loader2, Calendar, Sparkles, FileText, Zap, Trophy, AlertTriangle, Lightbulb, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

type FeedbackRow = { week_number: number; day: number; slot: string; likes: number; comments: number; messages: number; conversions: number; note: string };
type WeekRow = { week_number: number; data: { days: { day: number; posts: { slot: string; format: string; hook: string; caption: string }[] }[] } };
type StrategyRow = { id: string; niche: string; platform: string; created_at: string; posts_per_day: number; brand: any; phases: any[] };

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [weekData, setWeekData] = useState<WeekRow[]>([]);
  const [feedbackData, setFeedbackData] = useState<FeedbackRow[]>([]);

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); const { data } = await supabase.from("strategies").select("id, niche, platform, created_at, posts_per_day, brand, phases").order("created_at", { ascending: false }); if (data?.length) { setStrategies(data as any); await sel(data[0].id); } setLoading(false); };
  const sel = async (id: string) => { setSelected(id); const [{ data: w }, { data: f }] = await Promise.all([supabase.from("weeks").select("week_number, data").eq("strategy_id", id).order("week_number"), supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note").eq("strategy_id", id)]); setWeekData((w ?? []) as any); setFeedbackData((f ?? []) as any); };

  const cur = strategies.find(s => s.id === selected);

  // === Computed metrics ===
  const totalWeeks = weekData.length;
  const totalPosts = weekData.reduce((s, w) => s + (w.data?.days?.reduce((a: number, d: any) => a + (d.posts?.length ?? 0), 0) ?? 0), 0);
  const totals = feedbackData.reduce((a, f) => ({ posts: a.posts + 1, likes: a.likes + f.likes, comments: a.comments + f.comments, messages: a.messages + f.messages, conversions: a.conversions + f.conversions }), { posts: 0, likes: 0, comments: 0, messages: 0, conversions: 0 });
  const avgEngagement = totals.posts > 0 ? Math.round((totals.likes + totals.comments + totals.messages) / totals.posts) : 0;
  const conversionRate = totals.posts > 0 ? ((totals.conversions / totals.posts) * 100).toFixed(1) : "0";

  // Format distribution
  const formatCounts: Record<string, number> = {};
  weekData.forEach(w => w.data?.days?.forEach((d: any) => d.posts?.forEach((p: any) => { formatCounts[p.format || "Lainnya"] = (formatCounts[p.format || "Lainnya"] ?? 0) + 1; })));
  const formatChart = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // Weekly engagement trend
  const weeklyTrend = useMemo(() => {
    const map = new Map<number, { likes: number; comments: number; messages: number; conversions: number; posts: number }>();
    feedbackData.forEach(f => { const c = map.get(f.week_number) ?? { likes: 0, comments: 0, messages: 0, conversions: 0, posts: 0 }; c.likes += f.likes; c.comments += f.comments; c.messages += f.messages; c.conversions += f.conversions; c.posts++; map.set(f.week_number, c); });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([w, d]) => ({ week: `W${w}`, ...d, engagement: d.likes + d.comments + d.messages }));
  }, [feedbackData]);

  // Top & worst performing content
  const contentRanking = useMemo(() => {
    return feedbackData.map(f => {
      const wk = weekData.find(w => w.week_number === f.week_number);
      const day = wk?.data?.days?.find((d: any) => d.day === f.day);
      const post = day?.posts?.find((p: any) => p.slot === f.slot);
      const score = f.conversions * 5 + f.messages * 2 + f.comments * 1.5 + f.likes * 0.1;
      return { ...f, post, score };
    }).filter(x => x.post && x.score > 0).sort((a, b) => b.score - a.score);
  }, [feedbackData, weekData]);

  const topContent = contentRanking.slice(0, 5);
  const worstContent = contentRanking.slice(-3).filter(x => x.score < (contentRanking[0]?.score ?? 1) / 3);

  // AI Insights (computed, not API call)
  const insights = useMemo(() => {
    const tips: { icon: React.ReactNode; text: string; type: "success" | "warning" | "info" }[] = [];
    if (topContent.length > 0) {
      const topFormats = topContent.map(c => c.post?.format).filter(Boolean);
      const mostCommon = topFormats.sort((a, b) => topFormats.filter(v => v === b).length - topFormats.filter(v => v === a).length)[0];
      if (mostCommon) tips.push({ icon: <Trophy className="h-4 w-4" />, text: `Format "${mostCommon}" konsisten perform terbaik. Prioritaskan format ini.`, type: "success" });
    }
    if (worstContent.length > 0) {
      const worstFormats = worstContent.map(c => c.post?.format).filter(Boolean);
      const common = worstFormats[0];
      if (common) tips.push({ icon: <AlertTriangle className="h-4 w-4" />, text: `Format "${common}" cenderung underperform. Kurangi atau variasikan angle-nya.`, type: "warning" });
    }
    if (weeklyTrend.length >= 2) {
      const last = weeklyTrend[weeklyTrend.length - 1];
      const prev = weeklyTrend[weeklyTrend.length - 2];
      if (last && prev) {
        const change = ((last.engagement - prev.engagement) / (prev.engagement || 1)) * 100;
        if (change > 20) tips.push({ icon: <ArrowUpRight className="h-4 w-4" />, text: `Engagement naik ${Math.round(change)}% dari minggu lalu. Momentum bagus, pertahankan!`, type: "success" });
        else if (change < -20) tips.push({ icon: <ArrowDownRight className="h-4 w-4" />, text: `Engagement turun ${Math.round(Math.abs(change))}%. Coba variasi hook atau posting di jam berbeda.`, type: "warning" });
      }
    }
    if (totals.conversions > 0 && totals.posts > 0) {
      const cr = (totals.conversions / totals.posts) * 100;
      if (cr > 5) tips.push({ icon: <Lightbulb className="h-4 w-4" />, text: `Conversion rate ${cr.toFixed(1)}% — di atas rata-rata. Konten kamu sudah on-track.`, type: "success" });
      else tips.push({ icon: <Lightbulb className="h-4 w-4" />, text: `Conversion rate ${cr.toFixed(1)}%. Tambahkan CTA yang lebih spesifik dan urgent.`, type: "info" });
    }
    if (tips.length === 0) tips.push({ icon: <Lightbulb className="h-4 w-4" />, text: "Catat performa konten di halaman Roadmap untuk mendapatkan AI insights.", type: "info" });
    return tips;
  }, [topContent, worstContent, weeklyTrend, totals]);

  // Cross-brand comparison
  const crossBrand = useMemo(() => {
    if (strategies.length < 2) return null;
    // We'd need feedback for all strategies — for now show what we have
    return strategies.map(s => ({ id: s.id, niche: s.niche, platform: s.platform }));
  }, [strategies]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!strategies.length) return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-soft)" }}><Card className="p-12 text-center"><Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" /><h2 className="mt-4 text-lg font-semibold">Belum ada strategi</h2><Link to="/"><Button className="mt-4">Buat Strategi</Button></Link></Card></div>;

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--gradient-soft)" }}>
      <div className="mx-auto max-w-6xl">
        <Link to="/"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button></Link>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2"><BarChart3 className="h-8 w-8 text-primary" /> Analytics</h1>
        <p className="text-muted-foreground mb-6">Overview performa & insights konten kamu.</p>

        {/* Brand selector */}
        {strategies.length > 1 && <div className="mb-6 flex flex-wrap gap-2">{strategies.map(s => <Button key={s.id} variant={selected === s.id ? "default" : "outline"} size="sm" onClick={() => sel(s.id)}>{s.niche.substring(0, 25)} · {s.platform}</Button>)}</div>}

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <SC icon={<FileText className="h-5 w-5" />} label="Konten Generated" value={totalPosts} />
          <SC icon={<Calendar className="h-5 w-5" />} label="Minggu Aktif" value={totalWeeks} />
          <SC icon={<Heart className="h-5 w-5" />} label="Total Likes" value={totals.likes} />
          <SC icon={<Zap className="h-5 w-5" />} label="Avg Engagement" value={avgEngagement} />
          <SC icon={<ShoppingCart className="h-5 w-5" />} label="Konversi" value={totals.conversions} highlight />
        </div>

        {/* KPI row */}
        {totals.posts > 0 && <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card className="p-5 text-center"><p className="text-xs font-semibold uppercase text-muted-foreground">Engagement Rate</p><p className="mt-2 text-3xl font-bold text-primary">{avgEngagement}</p><p className="text-xs text-muted-foreground">per konten</p></Card>
          <Card className="p-5 text-center"><p className="text-xs font-semibold uppercase text-muted-foreground">Conversion Rate</p><p className="mt-2 text-3xl font-bold text-primary">{conversionRate}%</p><p className="text-xs text-muted-foreground">dari konten tercatat</p></Card>
          <Card className="p-5 text-center"><p className="text-xs font-semibold uppercase text-muted-foreground">Total DM Masuk</p><p className="mt-2 text-3xl font-bold text-primary">{totals.messages}</p><p className="text-xs text-muted-foreground">leads potensial</p></Card>
        </div>}

        {/* AI Insights */}
        <Card className="mb-8 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4"><Lightbulb className="h-4 w-4 text-primary" /> AI Insights & Saran</h3>
          <div className="space-y-3">
            {insights.map((tip, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg p-3 ${tip.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : tip.type === "warning" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
                <div className="mt-0.5 shrink-0">{tip.icon}</div>
                <p className="text-sm">{tip.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Charts */}
        {weeklyTrend.length > 0 && <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="p-6"><h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Engagement Trend</h3>
            <ResponsiveContainer width="100%" height={220}><LineChart data={weeklyTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} name="Likes" /><Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} name="Komentar" /><Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} name="DM" /></LineChart></ResponsiveContainer>
          </Card>
          <Card className="p-6"><h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Konversi per Minggu</h3>
            <ResponsiveContainer width="100%" height={220}><BarChart data={weeklyTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Bar dataKey="conversions" fill="#10b981" name="Konversi" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          </Card>
        </div>}

        {/* Format distribution */}
        {formatChart.length > 0 && <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="p-6"><h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Format Konten</h3>
            <ResponsiveContainer width="100%" height={220}><BarChart data={formatChart} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} /><Tooltip /><Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>{formatChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
          </Card>
          <Card className="p-6"><h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Proporsi Format</h3>
            <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={formatChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{formatChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </Card>
        </div>}

        {/* Top performing content */}
        {topContent.length > 0 && <Card className="mb-8 p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Top Performing Content</h3>
          <div className="space-y-3">
            {topContent.map((c, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">#{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">🪝 {c.post?.hook}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{c.post?.format}</Badge><span className="text-muted-foreground">W{c.week_number} · Hari {c.day}</span></div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground"><span>❤️ {c.likes}</span><span>💬 {c.comments}</span><span>📩 {c.messages}</span><span className="text-primary font-semibold">🛒 {c.conversions}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>}

        {/* Worst performing */}
        {worstContent.length > 0 && <Card className="mb-8 p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Underperforming Content</h3>
          <div className="space-y-3">
            {worstContent.map((c, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">🪝 {c.post?.hook}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs"><Badge variant="outline">{c.post?.format}</Badge><span className="text-muted-foreground">W{c.week_number}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">Saran: Coba ganti angle hook atau format konten ini.</p>
                </div>
              </div>
            ))}
          </div>
        </Card>}

        {/* Cross-brand comparison */}
        {crossBrand && crossBrand.length > 1 && <Card className="mb-8 p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Cross-Brand Comparison</h3>
          <p className="text-sm text-muted-foreground mb-4">Perbandingan semua brand yang kamu kelola.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2 px-3">Brand</th><th className="text-left py-2 px-3">Platform</th><th className="text-center py-2 px-3">Status</th></tr></thead><tbody>
            {crossBrand.map(b => <tr key={b.id} className={`border-b ${b.id === selected ? "bg-primary/5" : ""}`}><td className="py-2 px-3 font-medium">{b.niche}</td><td className="py-2 px-3"><Badge variant="secondary">{b.platform}</Badge></td><td className="py-2 px-3 text-center">{b.id === selected ? <Badge className="bg-primary text-primary-foreground">Aktif</Badge> : <Button size="sm" variant="ghost" onClick={() => sel(b.id)} className="text-xs">Lihat</Button>}</td></tr>)}
          </tbody></table></div>
        </Card>}
      </div>
    </div>
  );
}

function SC({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) {
  return <Card className="p-4"><div className="flex items-center gap-3"><div className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p></div></div></Card>;
}
