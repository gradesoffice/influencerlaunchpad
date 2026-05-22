import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, TrendingDown, Heart, MessageCircle, Send, ShoppingCart, ArrowLeft, Loader2, Eye, Users, Trophy, AlertTriangle, Calendar, Target, Activity, Award, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter/x", "facebook", "threads", "linkedin", "whatsapp channel"];

type FbRow = { week_number: number; day: number; slot: string; likes: number; comments: number; messages: number; conversions: number; reach: number; posted_at: string | null; platform: string };
type WeekRow = { week_number: number; data: any };

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FbRow[]>([]);
  const [weekData, setWeekData] = useState<WeekRow[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [periodView, setPeriodView] = useState<"week" | "day" | "month">("week");
  const [followerGoal, setFollowerGoal] = useState<number>(() => {
    const v = localStorage.getItem("ila_follower_goal");
    return v ? parseInt(v) : 1000;
  });
  const [currentFollowers, setCurrentFollowers] = useState<number>(() => {
    const v = localStorage.getItem("ila_current_followers");
    return v ? parseInt(v) : 0;
  });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data: strats } = await supabase.from("strategies").select("id, niche, platform").order("created_at", { ascending: false });
    if (strats?.length) { setStrategies(strats); await sel(strats[0].id); }
    setLoading(false);
  };
  const sel = async (id: string) => {
    setSelected(id);
    const [{ data: fb }, { data: weeks }] = await Promise.all([
      supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, reach, posted_at, platform").eq("strategy_id", id),
      supabase.from("weeks").select("week_number, data").eq("strategy_id", id).order("week_number"),
    ]);
    setData((fb ?? []) as FbRow[]);
    setWeekData((weeks ?? []) as WeekRow[]);
  };

  const saveGoal = (g: number, c: number) => {
    setFollowerGoal(g); setCurrentFollowers(c);
    localStorage.setItem("ila_follower_goal", String(g));
    localStorage.setItem("ila_current_followers", String(c));
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

  // === FUNNEL VISUALIZATION ===
  const funnel = useMemo(() => {
    const reach = totals.reach;
    const eng = totalEng;
    const dm = totals.messages;
    const conv = totals.conversions;
    return [
      { stage: "Reach", value: reach, pct: 100 },
      { stage: "Engagement", value: eng, pct: reach > 0 ? (eng / reach) * 100 : 0 },
      { stage: "DM", value: dm, pct: reach > 0 ? (dm / reach) * 100 : 0 },
      { stage: "Konversi", value: conv, pct: reach > 0 ? (conv / reach) * 100 : 0 },
    ];
  }, [totals, totalEng]);

  const funnelLeak = useMemo(() => {
    if (totals.reach === 0) return null;
    const drops = [
      { from: "Reach", to: "Engagement", drop: 100 - (totalEng / totals.reach * 100) },
      { from: "Engagement", to: "DM", drop: totalEng > 0 ? 100 - (totals.messages / totalEng * 100) : 0 },
      { from: "DM", to: "Konversi", drop: totals.messages > 0 ? 100 - (totals.conversions / totals.messages * 100) : 0 },
    ];
    return drops.sort((a, b) => b.drop - a.drop)[0];
  }, [totals, totalEng]);

  // === COHORT ANALYSIS ===
  const cohort = useMemo(() => {
    const byWeek = new Map<number, { posts: number; eng: number; reach: number; conv: number }>();
    filtered.forEach(f => {
      const c = byWeek.get(f.week_number) ?? { posts: 0, eng: 0, reach: 0, conv: 0 };
      c.posts++; c.eng += f.likes + f.comments + f.messages; c.reach += f.reach || 0; c.conv += f.conversions;
      byWeek.set(f.week_number, c);
    });
    return Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]).map(([w, d]) => ({
      week: `W${w}`,
      avgEng: d.posts > 0 ? Math.round(d.eng / d.posts) : 0,
      er: d.reach > 0 ? +(d.eng / d.reach * 100).toFixed(1) : 0,
      conv: d.conv,
    }));
  }, [filtered]);

  const cohortTrend = useMemo(() => {
    if (cohort.length < 2) return null;
    const first = cohort[0].avgEng;
    const last = cohort[cohort.length - 1].avgEng;
    const change = first > 0 ? Math.round((last - first) / first * 100) : 0;
    return { change, direction: change >= 0 ? "growth" : "decay" as const };
  }, [cohort]);

  // === ATTRIBUTION TRACKER ===
  const attribution = useMemo(() => {
    // Build map: slot -> post info from weekData
    const postMap = new Map<string, { format: string; hook: string }>();
    weekData.forEach(w => {
      w.data?.days?.forEach((d: any) => {
        d.posts?.forEach((p: any) => {
          postMap.set(`${w.week_number}|${d.day}|${p.slot}`, { format: p.format, hook: p.hook });
        });
      });
    });
    return filtered
      .map(f => ({ ...f, post: postMap.get(`${f.week_number}|${f.day}|${f.slot}`) }))
      .filter(f => f.conversions + f.messages > 0)
      .sort((a, b) => (b.conversions * 5 + b.messages) - (a.conversions * 5 + a.messages))
      .slice(0, 5);
  }, [filtered, weekData]);

  // === CONTENT TYPE ROI ===
  const contentTypeROI = useMemo(() => {
    const byFormat: Record<string, { count: number; eng: number; reach: number; conv: number; dm: number }> = {};
    weekData.forEach(w => {
      w.data?.days?.forEach((d: any) => {
        d.posts?.forEach((p: any) => {
          const key = p.format || "Lainnya";
          if (!byFormat[key]) byFormat[key] = { count: 0, eng: 0, reach: 0, conv: 0, dm: 0 };
          byFormat[key].count++;
          // Match feedback for this post
          const matches = filtered.filter(f => f.week_number === w.week_number && f.day === d.day && f.slot === p.slot);
          matches.forEach(m => {
            byFormat[key].eng += m.likes + m.comments + m.messages;
            byFormat[key].reach += m.reach || 0;
            byFormat[key].conv += m.conversions;
            byFormat[key].dm += m.messages;
          });
        });
      });
    });
    return Object.entries(byFormat)
      .map(([fmt, s]) => ({
        format: fmt,
        count: s.count,
        avgEng: s.count > 0 ? Math.round(s.eng / s.count) : 0,
        convPerPost: s.count > 0 ? +(s.conv / s.count).toFixed(2) : 0,
        roiScore: s.count > 0 ? Math.round((s.conv * 100 + s.dm * 20 + s.eng) / s.count) : 0,
      }))
      .sort((a, b) => b.roiScore - a.roiScore);
  }, [weekData, filtered]);

  // === BURNOUT ALERT ===
  const burnout = useMemo(() => {
    const now = new Date();
    const last7 = filtered.filter(f => f.posted_at && (now.getTime() - new Date(f.posted_at).getTime()) / 86400000 <= 7);
    const prev7 = filtered.filter(f => {
      if (!f.posted_at) return false;
      const age = (now.getTime() - new Date(f.posted_at).getTime()) / 86400000;
      return age > 7 && age <= 14;
    });
    const freqDrop = prev7.length > 0 ? Math.round((1 - last7.length / prev7.length) * 100) : 0;
    const engLast = last7.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
    const engPrev = prev7.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
    const engDrop = engPrev > 0 ? Math.round((1 - engLast / engPrev) * 100) : 0;
    const alerts: { level: "danger" | "warning" | "info"; text: string }[] = [];
    if (freqDrop >= 30) alerts.push({ level: "danger", text: `Frekuensi posting turun ${freqDrop}% minggu ini. Risiko burnout tinggi.` });
    else if (freqDrop >= 15) alerts.push({ level: "warning", text: `Frekuensi posting turun ${freqDrop}%. Jaga konsistensi.` });
    if (engDrop >= 30) alerts.push({ level: "warning", text: `Engagement turun ${engDrop}%. Variasikan format & hook.` });
    if (last7.length === 0 && prev7.length > 0) alerts.push({ level: "danger", text: "Belum ada konten minggu ini. Jangan biarkan momentum hilang." });
    if (last7.length >= prev7.length && engDrop < 0) alerts.push({ level: "info", text: "Konsisten & engagement naik. Pertahankan!" });
    return { alerts, last7Count: last7.length, prev7Count: prev7.length };
  }, [filtered]);

  // === GOAL TRACKING ===
  const goalProjection = useMemo(() => {
    if (followerGoal <= 0 || currentFollowers >= followerGoal) return null;
    // Estimate growth from engagement (rough heuristic: every 10 reach ~ 1 follower potential)
    const last30 = filtered.filter(f => f.posted_at && (new Date().getTime() - new Date(f.posted_at).getTime()) / 86400000 <= 30);
    const reachPerWeek = last30.length > 0 ? last30.reduce((s, f) => s + (f.reach || 0), 0) / 4 : 0;
    const estFollowerGrowthPerWeek = Math.round(reachPerWeek * 0.005); // 0.5% reach -> follower
    const gap = followerGoal - currentFollowers;
    const weeksNeeded = estFollowerGrowthPerWeek > 0 ? Math.ceil(gap / estFollowerGrowthPerWeek) : -1;
    const monthEnd = new Date(); monthEnd.setMonth(monthEnd.getMonth() + 1);
    const projectedAtMonthEnd = currentFollowers + estFollowerGrowthPerWeek * 4;
    const onTrack = projectedAtMonthEnd >= followerGoal;
    return { gap, weeksNeeded, projectedAtMonthEnd, onTrack, estFollowerGrowthPerWeek };
  }, [filtered, followerGoal, currentFollowers]);

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

        {/* === BURNOUT ALERT === */}
        {burnout.alerts.length > 0 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-rose-500" />Burnout Monitor</p>
          <div className="space-y-2">
            {burnout.alerts.map((a, i) => (
              <div key={i} className={`rounded-lg p-2.5 text-[11px] ${a.level === "danger" ? "bg-rose-50 text-rose-800" : a.level === "warning" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {a.level === "danger" ? "🚨" : a.level === "warning" ? "⚠️" : "✨"} {a.text}
              </div>
            ))}
            <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
              <span>Minggu ini: {burnout.last7Count} post</span>
              <span>Minggu lalu: {burnout.prev7Count} post</span>
            </div>
          </div>
        </Card>}

        {/* === GOAL TRACKING === */}
        <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Goal Tracking</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div><p className="text-[10px] text-muted-foreground">Follower sekarang</p><Input type="number" value={currentFollowers} onChange={e => saveGoal(followerGoal, parseInt(e.target.value) || 0)} className="h-8 text-xs" /></div>
            <div><p className="text-[10px] text-muted-foreground">Target follower</p><Input type="number" value={followerGoal} onChange={e => saveGoal(parseInt(e.target.value) || 0, currentFollowers)} className="h-8 text-xs" /></div>
          </div>
          {goalProjection && <>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (currentFollowers / followerGoal) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
              <span>{currentFollowers}</span><span>{Math.round((currentFollowers / followerGoal) * 100)}%</span><span>{followerGoal}</span>
            </div>
            <div className={`rounded-lg p-2.5 text-[11px] ${goalProjection.onTrack ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {goalProjection.onTrack ? "🚀" : "⚡"} Proyeksi akhir bulan: <strong>{goalProjection.projectedAtMonthEnd}</strong> follower.
              {!goalProjection.onTrack && goalProjection.weeksNeeded > 0 && ` Untuk capai ${followerGoal}, butuh ~${goalProjection.weeksNeeded} minggu dengan rate sekarang. Tingkatkan posting rate atau reach.`}
              {goalProjection.estFollowerGrowthPerWeek === 0 && " Belum ada data reach. Catat reach di setiap konten."}
            </div>
          </>}
          {currentFollowers >= followerGoal && followerGoal > 0 && <div className="rounded-lg p-2.5 bg-emerald-50 text-emerald-800 text-[11px]">🏆 Target tercapai! Set target baru.</div>}
        </Card>

        {/* === FUNNEL VISUALIZATION === */}
        {totals.reach > 0 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Conversion Funnel</p>
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const widthPct = i === 0 ? 100 : f.pct;
              return (
                <div key={f.stage}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-20 shrink-0">{f.stage}</span>
                    <div className="flex-1 h-7 rounded-md bg-muted/40 overflow-hidden relative">
                      <div className="h-full rounded-md transition-all flex items-center justify-end pr-2" style={{ width: `${Math.max(widthPct, 5)}%`, background: COLORS[i] }}>
                        <span className="text-[10px] text-white font-bold">{f.value.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right">{f.pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {funnelLeak && funnelLeak.drop > 50 && <div className="mt-3 rounded-lg p-2.5 bg-rose-50 text-rose-800 text-[11px]">
            🚨 Bocor terbesar: <strong>{funnelLeak.from} → {funnelLeak.to}</strong> turun {funnelLeak.drop.toFixed(0)}%. Fokus optimasi di tahap ini.
          </div>}
        </Card>}

        {/* === COHORT ANALYSIS === */}
        {cohort.length >= 2 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" />Cohort: Engagement per Minggu</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cohort}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="avgEng" fill="#8b5cf6" name="Avg Engagement" />
            </BarChart>
          </ResponsiveContainer>
          {cohortTrend && <div className={`mt-2 rounded-lg p-2.5 text-[11px] ${cohortTrend.direction === "growth" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {cohortTrend.direction === "growth" ? "📈" : "📉"} Pattern: <strong>{cohortTrend.direction === "growth" ? "Growth" : "Decay"}</strong>. Cohort terbaru {cohortTrend.change >= 0 ? "+" : ""}{cohortTrend.change}% vs cohort awal.
          </div>}
        </Card>}

        {/* === ATTRIBUTION TRACKER === */}
        {attribution.length > 0 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-emerald-500" />Top Konversi (Business Outcome)</p>
          <div className="space-y-2">
            {attribution.map((a, i) => (
              <div key={i} className="rounded-lg bg-emerald-50/40 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="text-[9px]">{a.post?.format || "—"}</Badge>
                  <span className="text-[10px] text-muted-foreground capitalize">{a.platform} · W{a.week_number}</span>
                </div>
                {a.post?.hook && <p className="text-[11px] line-clamp-1 mb-1">🪝 {a.post.hook}</p>}
                <div className="flex gap-3 text-[10px]">
                  <span className="text-emerald-700 font-bold">🛒 {a.conversions} konversi</span>
                  <span className="text-blue-700">📩 {a.messages} DM</span>
                  <span className="text-muted-foreground">❤️ {a.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>}

        {/* === CONTENT TYPE ROI === */}
        {contentTypeROI.length > 0 && <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Content Type ROI</p>
          <div className="space-y-2">
            {contentTypeROI.map((c, i) => (
              <div key={c.format} className="rounded-lg bg-white p-2.5 border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium capitalize">{c.format}</span>
                  <Badge className={i === 0 ? "bg-amber-500" : "bg-muted text-muted-foreground"}>{i === 0 ? "🏆 Best" : `#${i + 1}`}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div><p className="font-bold">{c.count}</p><p className="text-muted-foreground">Posts</p></div>
                  <div><p className="font-bold">{c.avgEng}</p><p className="text-muted-foreground">Avg Eng</p></div>
                  <div><p className="font-bold text-emerald-600">{c.convPerPost}</p><p className="text-muted-foreground">Conv/Post</p></div>
                  <div><p className="font-bold text-primary">{c.roiScore}</p><p className="text-muted-foreground">ROI Score</p></div>
                </div>
              </div>
            ))}
          </div>
          {contentTypeROI[0] && contentTypeROI.length > 1 && <p className="text-[10px] text-muted-foreground mt-2 italic">💡 Format <strong>{contentTypeROI[0].format}</strong> paling efektif. Perbanyak konten tipe ini.</p>}
        </Card>}

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
