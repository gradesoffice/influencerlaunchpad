import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, TrendingDown, Heart, MessageCircle, Send, ShoppingCart, ArrowLeft, Loader2, Eye, Users, Trophy, AlertTriangle, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter/x", "facebook", "threads", "linkedin", "whatsapp channel"];

type FbRow = { week_number: number; day: number; slot: string; likes: number; comments: number; messages: number; conversions: number; reach: number; posted_at: string | null; platform: string };

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FbRow[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [periodView, setPeriodView] = useState<"week" | "day" | "month">("week");

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data: strats } = await supabase.from("strategies").select("id, niche, platform").order("created_at", { ascending: false });
    if (strats?.length) { setStrategies(strats); await sel(strats[0].id); }
    setLoading(false);
  };
  const sel = async (id: string) => {
    setSelected(id);
    const { data: fb } = await supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, reach, posted_at, platform").eq("strategy_id", id);
    setData((fb ?? []) as FbRow[]);
  };

  const filtered = useMemo(() => platformFilter === "all" ? data : data.filter(d => d.platform === platformFilter), [data, platformFilter]);
  const activePlatforms = useMemo(() => [...new Set(data.map(d => d.platform))].filter(Boolean), [data]);

  // Totals
  const totals = useMemo(() => filtered.reduce((a, f) => ({ likes: a.likes + f.likes, comments: a.comments + f.comments, messages: a.messages + f.messages, conversions: a.conversions + f.conversions, reach: a.reach + (f.reach || 0), posts: a.posts + 1 }), { likes: 0, comments: 0, messages: 0, conversions: 0, reach: 0, posts: 0 }), [filtered]);
  const totalEng = totals.likes + totals.comments + totals.messages;
  const er = totals.reach > 0 ? ((totalEng / totals.reach) * 100).toFixed(1) : "—";
  const cr = totals.reach > 0 ? ((totals.conversions / totals.reach) * 100).toFixed(2) : "—";

  // Period comparison
  const comparison = useMemo(() => {
    const now = new Date();
    const getRange = (minDays: number, maxDays: number) => filtered.filter(f => { if (!f.posted_at) return false; const age = (now.getTime() - new Date(f.posted_at).getTime()) / 86400000; return age >= minDays && age < maxDays; });
    const thisWeek = getRange(0, 7);
    const lastWeek = getRange(7, 14);
    const sum = (arr: FbRow[]) => arr.reduce((a, f) => ({ likes: a.likes + f.likes, eng: a.eng + f.likes + f.comments + f.messages, conv: a.conv + f.conversions }), { likes: 0, eng: 0, conv: 0 });
    const tw = sum(thisWeek); const lw = sum(lastWeek);
    const pct = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
    return { likes: pct(tw.likes, lw.likes), eng: pct(tw.eng, lw.eng), conv: pct(tw.conv, lw.conv) };
  }, [filtered]);

  // Weekly chart
  const weeklyChart = useMemo(() => {
    const map = new Map<number, { likes: number; comments: number; messages: number; conversions: number; reach: number }>();
    filtered.forEach(f => { const c = map.get(f.week_number) ?? { likes: 0, comments: 0, messages: 0, conversions: 0, reach: 0 }; c.likes += f.likes; c.comments += f.comments; c.messages += f.messages; c.conversions += f.conversions; c.reach += f.reach || 0; map.set(f.week_number, c); });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([w, d]) => ({ week: `W${w}`, ...d }));
  }, [filtered]);

  // Per-platform breakdown
  const platformStats = useMemo(() => {
    const map: Record<string, { likes: number; comments: number; messages: number; conversions: number; reach: number; posts: number }> = {};
    data.forEach(f => { if (!f.platform) return; if (!map[f.platform]) map[f.platform] = { likes: 0, comments: 0, messages: 0, conversions: 0, reach: 0, posts: 0 }; map[f.platform].likes += f.likes; map[f.platform].comments += f.comments; map[f.platform].messages += f.messages; map[f.platform].conversions += f.conversions; map[f.platform].reach += f.reach || 0; map[f.platform].posts++; });
    return Object.entries(map).sort((a, b) => (b[1].likes + b[1].comments + b[1].messages) - (a[1].likes + a[1].comments + a[1].messages));
  }, [data]);

  // Top & worst content
  const ranked = useMemo(() => filtered.map(f => ({ ...f, score: f.conversions * 5 + f.messages * 2 + f.comments * 1.5 + f.likes * 0.1 })).filter(f => f.score > 0).sort((a, b) => b.score - a.score), [filtered]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-xl font-bold">Analytics</h1></div>
          {strategies.length > 1 && <select value={selected || ""} onChange={e => sel(e.target.value)} className="text-xs border rounded-lg px-2 py-1">{strategies.map(s => <option key={s.id} value={s.id}>{s.niche}</option>)}</select>}
        </div>

        {/* Platform filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setPlatformFilter("all")} className={`px-3 py-1.5 rounded-full text-xs shrink-0 ${platformFilter === "all" ? "bg-primary text-white" : "bg-white border text-muted-foreground"}`}>All</button>
          {activePlatforms.map(p => <button key={p} onClick={() => setPlatformFilter(p)} className={`px-3 py-1.5 rounded-full text-xs shrink-0 capitalize ${platformFilter === p ? "bg-primary text-white" : "bg-white border text-muted-foreground"}`}>{p}</button>)}
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <MC icon="👁️" label="Reach" value={totals.reach > 0 ? `${(totals.reach/1000).toFixed(1)}K` : "—"} />
          <MC icon="❤️" label="Likes" value={totals.likes} />
          <MC icon="💬" label="Komentar" value={totals.comments} />
          <MC icon="📩" label="DM" value={totals.messages} />
          <MC icon="🛒" label="Konversi" value={totals.conversions} />
          <MC icon="📊" label="Posts" value={totals.posts} />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center"><p className="text-[10px] text-muted-foreground">Engagement Rate</p><p className="text-2xl font-bold text-primary">{er}{er !== "—" ? "%" : ""}</p><p className="text-[9px] text-muted-foreground">engagement / reach</p></Card>
          <Card className="p-4 text-center"><p className="text-[10px] text-muted-foreground">Conversion Rate</p><p className="text-2xl font-bold text-emerald-600">{cr}{cr !== "—" ? "%" : ""}</p><p className="text-[9px] text-muted-foreground">konversi / reach</p></Card>
        </div>

        {/* Period comparison */}
        <Card className="p-4">
          <p className="text-xs font-semibold mb-3">📈 vs Minggu Lalu</p>
          <div className="grid grid-cols-3 gap-3">
            <CompStat label="Likes" value={comparison.likes} />
            <CompStat label="Engagement" value={comparison.eng} />
            <CompStat label="Konversi" value={comparison.conv} />
          </div>
        </Card>

        {/* Chart */}
        {weeklyChart.length > 1 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3">Trend per Minggu</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} name="❤️" /><Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} name="💬" /><Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} name="📩" /><Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="🛒" /></LineChart>
          </ResponsiveContainer>
        </Card>}

        {/* Platform breakdown */}
        {platformStats.length > 1 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3">📱 Per Platform</p>
          <div className="space-y-2">
            {platformStats.map(([plat, stats], i) => (
              <div key={plat} className="flex items-center gap-3 rounded-lg bg-white p-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs" style={{ background: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>{plat[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium capitalize">{plat}</p><p className="text-[9px] text-muted-foreground">{stats.posts} posts</p></div>
                <div className="flex gap-3 text-[10px] text-muted-foreground"><span>❤️{stats.likes}</span><span>📩{stats.messages}</span><span>🛒{stats.conversions}</span></div>
              </div>
            ))}
          </div>
        </Card>}

        {/* Top content */}
        {ranked.length > 0 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Top Konten</p>
          <div className="space-y-2">
            {ranked.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-emerald-50/50 p-2">
                <span className="text-xs font-bold text-amber-600">#{i+1}</span>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium capitalize">{c.platform} · W{c.week_number}</p><p className="text-[10px] text-muted-foreground">❤️{c.likes} 💬{c.comments} 📩{c.messages} 🛒{c.conversions}</p></div>
              </div>
            ))}
          </div>
        </Card>}

        {/* Worst content */}
        {ranked.length > 3 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-500" />Perlu Improve</p>
          <div className="space-y-2">
            {ranked.slice(-2).map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-rose-50/50 p-2">
                <span className="text-xs text-rose-500">⚠️</span>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium capitalize">{c.platform} · W{c.week_number}</p><p className="text-[10px] text-muted-foreground">❤️{c.likes} 💬{c.comments} 🛒{c.conversions}</p></div>
              </div>
            ))}
          </div>
        </Card>}

        {data.length === 0 && <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">Belum ada data. Catat performa di dashboard.</p></Card>}
      </div>
    </div>
  );
}

function MC({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return <Card className="p-3 text-center"><p className="text-sm">{icon}</p><p className="text-base font-bold">{value}</p><p className="text-[9px] text-muted-foreground">{label}</p></Card>;
}

function CompStat({ label, value }: { label: string; value: number }) {
  const up = value >= 0;
  return <div className={`rounded-lg p-2 text-center ${up ? "bg-emerald-50" : "bg-rose-50"}`}><p className={`text-lg font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "+" : ""}{value}%</p><p className="text-[9px] text-muted-foreground">{label}</p></div>;
}
