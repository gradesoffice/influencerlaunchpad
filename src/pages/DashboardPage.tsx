import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Target, Loader2, Rocket, TrendingUp, Copy, Check, BarChart3, Heart, MessageCircle, Send, ShoppingCart, Crown, Home, Map as MapIcon, FileText, Users, Gauge, Lightbulb, Bell, ChevronRight, X, Settings, Eye, Activity, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

type FormState = { niche: string; platform: string; audience: string; message: string; conversionGoal: string; tone: string; postsPerDay: number; initialFollowers: Record<string, number>; platforms: string[] };
type Strategy = { brand: { persona: string; voice: string; visualStyle: string; tagline: string; contentPillars: { name: string; description: string }[]; hashtags: string[]; dosAndDonts: { dos: string[]; donts: string[] } }; phases: { name: string; days: string; objective: string; kpis: string[]; weeklyThemes: string[] }[] };
type WeekPlan = { weekNumber: number; theme: string; focus: string; days: { day: number; dayLabel: string; dailyGoal: string; posts: { slot: string; format: string; hook: string; caption: string; cta: string; hashtags: string[]; visualIdea: string; conversionTie: string }[] }[] };
type Feedback = { likes: number; comments: number; messages: number; conversions: number; note: string; reach: number; posted_at: string | null; platform: string };
const PLATFORMS = ["TikTok", "Instagram", "Threads", "Facebook", "YouTube", "Twitter/X", "WhatsApp Channel", "LinkedIn"];
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const initial: FormState = { niche: "", platform: "Instagram", audience: "", message: "", conversionGoal: "", tone: "", postsPerDay: 2, initialFollowers: {}, platforms: ["Instagram"] };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<Record<number, WeekPlan>>({});
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState<number | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [openFeedback, setOpenFeedback] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("home");
  const [userPlan, setUserPlan] = useState<"free" | "pro" | "business">("free");
  const [userName, setUserName] = useState("");
  const [trialDaysLeft, setTrialDaysLeft] = useState(1);
  const [clickCount, setClickCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [preSelectedHook, setPreSelectedHook] = useState("");

  useEffect(() => { loadFromDb(); }, []);
  const loadFromDb = async () => {
    try {
      const { data: strats } = await supabase.from("strategies").select("*").order("created_at", { ascending: false }).limit(1);
      if (strats?.length) {
        const s = strats[0]; setStrategyId(s.id); setStrategy({ brand: s.brand as any, phases: s.phases as any });
        setForm({ niche: s.niche, platform: s.platform, audience: s.audience, message: s.message, conversionGoal: s.conversion_goal, tone: s.tone || "", postsPerDay: s.posts_per_day, initialFollowers: (typeof s.initial_followers === "object" && s.initial_followers) ? s.initial_followers as Record<string, number> : { [s.platform]: 0 }, platforms: s.platform ? s.platform.split(",").map((p: string) => p.trim()) : ["Instagram"] });
        const { data: savedWeeks } = await supabase.from("weeks").select("week_number, data").eq("strategy_id", s.id);
        if (savedWeeks) { const m: Record<number, WeekPlan> = {}; savedWeeks.forEach(w => m[w.week_number] = w.data as any); setWeeks(m); }
        const { data: savedFb } = await supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note, reach, posted_at, platform").eq("strategy_id", s.id);
        if (savedFb?.length) { const m: Record<string, Feedback> = {}; savedFb.forEach(f => m[`${f.week_number}|${f.day}|${f.slot}|${f.platform || "instagram"}`] = { ...f, platform: f.platform || "instagram" }); setFeedback(m); }
      } else { /* no strategy — will show empty state in dashboard */ }
      // Load user plan
      const { data: planRow } = await supabase.from("user_plans").select("plan, expires_at, created_at").limit(1).single();
      if (planRow && (!planRow.expires_at || new Date(planRow.expires_at) > new Date())) {
        setUserPlan(planRow.plan as any);
      }
      // Calculate trial days remaining
      if (planRow?.plan === "free" && planRow.created_at) {
        const created = new Date(planRow.created_at);
        const now = new Date();
        const daysUsed = Math.floor((now.getTime() - created.getTime()) / 86400000);
        setTrialDaysLeft(Math.max(0, 1 - daysUsed));
      }
      // Load user name
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) setUserName(user.user_metadata.full_name);
      else if (user?.email) setUserName(user.email.split("@")[0]);
    } catch (e) { console.error(e); }
    setInitialLoading(false);
  };
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(s => ({ ...s, [k]: v }));
  const getAuthHeaders = async () => { const { data: { session } } = await supabase.auth.getSession(); const h: Record<string, string> = { "Content-Type": "application/json" }; if (session?.access_token) h["Authorization"] = `Bearer ${session.access_token}`; return h; };
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  // Paywall trigger - show after 3 clicks for free users
  const checkPaywall = () => {
    if (userPlan !== "free") return false;
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) { setShowPaywall(true); return true; }
    return false;
  };

  // Helper for locked Pro features - tracks clicks toward paywall
  const tryProFeature = (navKey: string) => {
    if (userPlan !== "free") { setActiveNav(navKey); return; }
    checkPaywall();
  };

  const buildFeedbackInsights = (): string => {
    const entries = Object.entries(feedback).filter(([, v]) => v.likes + v.comments + v.messages + v.conversions > 0);
    if (!entries.length) return "";
    const enriched = entries.map(([key, v]) => { const [w, d, ...slot] = key.split("|"); const wk = weeks[Number(w)]; const day = wk?.days?.find(x => String(x.day) === d); const post = day?.posts?.find(p => p.slot === slot.join("|")); return { v, post, score: v.conversions * 5 + v.messages * 2 + v.comments * 1.5 + v.likes * 0.1 }; }).filter(x => x.post);
    enriched.sort((a, b) => b.score - a.score);
    return enriched.slice(0, 5).map(e => `Hook: "${e.post!.hook}" | Format: ${e.post!.format} | ${e.v.likes} likes, ${e.v.comments} komen, ${e.v.conversions} konversi`).join("\n");
  };

  const generateStrategy = async () => {
    if (!form.niche || !form.audience || !form.message || !form.conversionGoal) { toast.error("Lengkapi semua field."); return; }
    // Paywall for free users
    if (userPlan === "free") { setShowPaywall(true); return; }
    if (strategy && !confirm("Buat strategi baru? Strategi lama tetap tersimpan di halaman Strategi.")) return;
    setLoadingStrategy(true); setStrategy(null); setStrategyId(null); setWeeks({}); setFeedback({});
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/strategy", { method: "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json().catch(() => null); if (e?.code === "PLAN_LIMIT" || e?.code === "RATE_LIMIT") { setShowPricing(true); } else throw new Error(e?.error || "Gagal"); return; }
      const data = await res.json(); setStrategy(data); setStrategyId(data.strategyId ?? null); toast.success("Strategi siap!"); setShowForm(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } finally { setLoadingStrategy(false); }
  };
  const generateWeek = async (weekNumber: number, phaseName: string, weeklyTheme: string) => {
    if (!strategy) return; setLoadingWeek(weekNumber);
    try {
      const brandSummary = `Persona: ${strategy.brand.persona}\nVoice: ${strategy.brand.voice}\nTagline: ${strategy.brand.tagline}\nPillars: ${strategy.brand.contentPillars.map(p => p.name).join(", ")}`;
      const headers = await getAuthHeaders();
      const feedbackInsights = buildFeedbackInsights();
      const res = await fetch("/api/week", { method: "POST", headers, body: JSON.stringify({ weekNumber, postsPerDay: form.postsPerDay, niche: form.niche, platform: form.platform, audience: form.audience, message: form.message, conversionGoal: form.conversionGoal, brandSummary, phaseName, weeklyTheme, strategyId, feedbackInsights, painPoints: (strategy.brand as any).painPoints?.join(", ") || "" }) });
      if (!res.ok) { const e = await res.json().catch(() => null); if (e?.code) { setShowPricing(true); } else throw new Error("Gagal"); return; }
      const data = await res.json(); setWeeks(w => ({ ...w, [weekNumber]: data })); setOpenWeek(weekNumber);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } finally { setLoadingWeek(null); }
  };
  const copyPost = async (key: string, post: WeekPlan["days"][0]["posts"][0]) => {
    const text = `${post.hook}\n\n${post.caption}\n\n${post.cta}\n\n${post.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Disalin!");
      setTimeout(() => setCopiedKey(null), 2000);
      // Record timestamp as posted_at
      if (strategyId) {
        const [w, d, ...s] = key.split("|");
        const cur = feedback[key] ?? { likes: 0, comments: 0, messages: 0, conversions: 0, note: "", reach: 0, posted_at: null };
        if (!cur.posted_at) {
          const updated = { ...cur, posted_at: new Date().toISOString() };
          setFeedback(f => ({ ...f, [key]: updated }));
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) supabase.from("feedback").upsert({ strategy_id: strategyId, user_id: session.user.id, week_number: Number(w), day: Number(d), slot: s.join("|"), ...updated, updated_at: new Date().toISOString() }, { onConflict: "strategy_id,week_number,day,slot" });
          });
        }
      }
    } catch { toast.error("Gagal"); }
  };
  const updateFeedback = (key: string, patch: Partial<Feedback>) => {
    const cur = feedback[key] ?? { likes: 0, comments: 0, messages: 0, conversions: 0, note: "", reach: 0, posted_at: null, platform: "instagram" };
    const updated = { ...cur, ...patch }; setFeedback(f => ({ ...f, [key]: updated }));
    if (strategyId) {
      const parts = key.split("|");
      const platform = parts.length >= 4 ? parts[parts.length - 1] : "instagram";
      const [w, d] = parts;
      const slot = parts.slice(2, parts.length >= 4 ? -1 : undefined).join("|");
      supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) supabase.from("feedback").upsert({ strategy_id: strategyId, user_id: session.user.id, week_number: Number(w), day: Number(d), slot, platform, likes: updated.likes, comments: updated.comments, messages: updated.messages, conversions: updated.conversions, reach: updated.reach || 0, note: updated.note || "", posted_at: updated.posted_at, updated_at: new Date().toISOString() }, { onConflict: "strategy_id,week_number,day,slot,platform" }); });
    }
  };

  const totalWeeksAvailable = strategy?.phases.reduce((s, p) => s + p.weeklyThemes.length, 0) ?? 0;
  const completedWeeks = Object.keys(weeks).length;
  const progressPct = totalWeeksAvailable > 0 ? Math.round((completedWeeks / totalWeeksAvailable) * 100) : 0;
  const fbVals = Object.values(feedback);
  const totalLikes = fbVals.reduce((s, f) => s + f.likes, 0);
  const totalConversions = fbVals.reduce((s, f) => s + f.conversions, 0);
  const totalDM = fbVals.reduce((s, f) => s + f.messages, 0);
  const totalReach = fbVals.reduce((s, f) => s + (f.reach || 0), 0);
  const engagementRate = totalReach > 0 ? ((totalLikes + fbVals.reduce((s, f) => s + f.comments, 0) + totalDM) / totalReach * 100).toFixed(1) : "0";
  const conversionRate = totalReach > 0 ? ((totalConversions / totalReach) * 100).toFixed(2) : "0";

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (showForm) return <FormView form={form} update={update} loading={loadingStrategy} onGenerate={generateStrategy} onLogout={handleLogout} onBack={strategy ? () => setShowForm(false) : undefined} userPlan={userPlan} onShowPricing={() => setShowPricing(true)} />;

  // Empty state — no strategy but show dashboard shell
  const emptyState = !strategy;

  return (
    <div className="min-h-screen bg-[#faf9f7] flex">
      <Toaster richColors position="top-center" />

      {/* Sidebar - icon focused */}
      <aside className="hidden md:flex w-16 flex-col items-center border-r border-border bg-white py-5 sticky top-0 h-screen">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-6"><Rocket className="h-5 w-5 text-primary" /></div>
        <nav className="space-y-2 flex-1">
          <SideIcon icon={<Home className="h-5 w-5" />} active={activeNav === "home"} onClick={() => setActiveNav("home")} tooltip="Overview" />
          <SideIcon icon={<FileText className="h-5 w-5" />} active={activeNav === "konten"} onClick={() => setActiveNav("konten")} tooltip="Konten" />
          <SideIcon icon={<BarChart3 className="h-5 w-5" />} active={activeNav === "analitik"} onClick={() => tryProFeature("analitik")} tooltip="Laporan" locked={userPlan === "free"} />
          <SideIcon icon={<Sparkles className="h-5 w-5" />} active={activeNav === "audiens"} onClick={() => tryProFeature("audiens")} tooltip="Bikin Foto" locked={userPlan === "free"} />
          <SideIcon icon={<Lightbulb className="h-5 w-5" />} active={activeNav === "insight"} onClick={() => tryProFeature("insight")} tooltip="Saran AI" locked={userPlan === "free"} />
        </nav>
        <div className="space-y-3 mt-4 pt-4 border-t border-border">
          <SideIcon icon={<Crown className="h-5 w-5 text-amber-500" />} active={false} onClick={() => setShowPricing(true)} tooltip="Upgrade" />
          <SideIcon icon={<FileText className="h-5 w-5" />} active={false} onClick={() => navigate("/strategies")} tooltip="Strategi" />
          <button onClick={handleLogout} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold hover:ring-2 ring-primary/20 transition" title="Logout">{(userName || "U")[0].toUpperCase()}</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 pb-28">
          {/* Header - minimal */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-medium text-foreground">{userName || "Hey"}</p>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${userPlan === "business" ? "bg-violet-100 text-violet-700" : userPlan === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{userPlan === "business" ? "BUSINESS" : userPlan === "pro" ? "PRO" : "FREE"}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowForm(true)} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:bg-muted hover:text-foreground transition" title="Settings"><Settings className="h-4 w-4" /></button>
              {userPlan === "free" && <button onClick={() => setShowPricing(true)} className="h-9 w-9 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 transition" title="Upgrade"><Crown className="h-4 w-4" /></button>}
            </div>
          </div>

          {/* Empty state */}
          {emptyState && (
            <div className="text-center py-16 space-y-5">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"><Rocket className="h-8 w-8 text-primary" /></div>
              <h2 className="text-lg font-bold">Daftarkan brand-mu di sini</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">Buat strategi pertama dan mulai perjalanan menuju influencer.</p>
              <Button onClick={() => setShowForm(true)} className="text-primary-foreground" style={{ background: "var(--gradient-hero)" }}><Sparkles className="mr-2 h-4 w-4" />Mulai Sekarang</Button>
              {/* Onboarding steps */}
              <div className="max-w-sm mx-auto pt-6 space-y-3 text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide text-center">Cara kerja</p>
                <div className="flex items-start gap-3"><span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span><div><p className="text-xs font-medium">Isi profil brand</p><p className="text-[10px] text-muted-foreground">Niche, audiens, tujuan konversi</p></div></div>
                <div className="flex items-start gap-3"><span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span><div><p className="text-xs font-medium">AI generate strategi 90 hari</p><p className="text-[10px] text-muted-foreground">Brand identity + roadmap + pain points audiens</p></div></div>
                <div className="flex items-start gap-3"><span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span><div><p className="text-xs font-medium">Generate konten mingguan</p><p className="text-[10px] text-muted-foreground">Hook, caption, CTA siap copy-paste</p></div></div>
              </div>
            </div>
          )}

          {/* Rest of content only if strategy exists */}
          {strategy && <>

          {/* Plan warning - subtle */}
          {userPlan === "free" && activeNav === "home" && <button onClick={() => setShowPricing(true)} className="w-full text-left rounded-2xl bg-rose-50/80 px-4 py-3 flex items-center gap-3">
            <span className="text-sm">⏳</span>
            <div className="flex-1"><p className="text-xs text-rose-600 font-medium">Sisa {trialDaysLeft} hari trial</p><p className="text-[10px] text-rose-500/70">Upgrade sebelum habis →</p></div>
            <ChevronRight className="h-4 w-4 text-rose-400" />
          </button>}

          {/* HOME VIEW */}
          {activeNav === "home" && <>
            {/* Dynamic greeting with today's mission from roadmap */}
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 11 ? "SELAMAT PAGI" : hour < 15 ? "SELAMAT SIANG" : hour < 19 ? "SELAMAT SORE" : "SELAMAT MALAM";
              
              // Find current phase & week theme
              let currentTheme = "";
              let currentWeekNum = completedWeeks + 1;
              let phaseObjective = "";
              if (strategy) {
                let offset = 0;
                for (const phase of strategy.phases) {
                  for (const theme of phase.weeklyThemes) {
                    offset++;
                    if (offset === currentWeekNum) { currentTheme = theme; phaseObjective = phase.objective; break; }
                  }
                  if (currentTheme) break;
                }
              }

              // Find today's posts - sequential logic: find the NEXT uncompleted day
              // Start from day 1, find the first day where not all posts have feedback
              const availableWeekNums = Object.keys(weeks).map(Number).sort((a, b) => a - b);
              let todayPosts: any[] = [];
              let targetWeek = 0;
              let targetDayNum = 1;
              
              // Go through weeks sequentially, find first day with incomplete posts
              for (const wn of availableWeekNums) {
                const wData = weeks[wn];
                if (!wData?.days) continue;
                let found = false;
                for (const day of wData.days) {
                  if (!day?.posts?.length) continue;
                  // Check if ALL posts in this day have feedback
                  const allDone = day.posts.every((p: any) => {
                    const fkey = `${wn}|${day.day}|${p.slot}`;
                    return Object.keys(feedback).some(k => k.startsWith(fkey));
                  });
                  if (!allDone) {
                    todayPosts = day.posts;
                    targetWeek = wn;
                    targetDayNum = day.day;
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              
              // If all done, show last day's posts with congrats
              if (todayPosts.length === 0 && availableWeekNums.length > 0) {
                const lastWeek = weeks[availableWeekNums[availableWeekNums.length - 1]];
                if (lastWeek?.days?.length) {
                  const lastDay = lastWeek.days[lastWeek.days.length - 1];
                  todayPosts = lastDay?.posts || [];
                  targetWeek = availableWeekNums[availableWeekNums.length - 1];
                  targetDayNum = lastDay?.day || 1;
                }
              }
              const currentWeekData = weeks[targetWeek];

              // Check which posts are "completed" (has feedback)
              const isPostDone = (idx: number) => {
                if (idx < 0 || idx >= todayPosts.length) return false;
                const post = todayPosts[idx];
                const fkey = `${targetWeek}|${targetDayNum}|${post.slot}`;
                return Object.keys(feedback).some(k => k.startsWith(fkey));
              };

              return <>
                {/* Greeting */}
                <div className="rounded-xl bg-gradient-to-br from-primary/5 via-violet-50 to-amber-50/30 p-5 border border-border/40">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">{greeting}</p>
                  {currentTheme ? <>
                    <h2 className="text-lg font-bold leading-snug">Hari ini kita <span className="text-primary">{phaseObjective || "bikin konten"}</span></h2>
                    <p className="text-xs text-muted-foreground mt-2">melalui <strong>{currentTheme}</strong></p>
                  </> : <h2 className="text-lg font-bold">Setiap konten adalah langkah maju.</h2>}
                </div>

                {/* TODAY'S CONTENT - SLIDE CARDS */}
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-center">KONTEN SAAT INI</h2>
                  <p className="text-sm text-muted-foreground text-center -mt-2">Copy & posting satu per satu. Isi feedback sebelum lanjut.</p>
                  
                  {todayPosts.length > 0 ? <>
                    {todayPosts.map((post: any, i: number) => {
                      const fkey = `${targetWeek}|${targetDayNum}|${post.slot}`;
                      const prevDone = i === 0 ? true : isPostDone(i - 1);
                      const isLocked = !prevDone;

                      if (isLocked) {
                        return <div key={i} className="rounded-xl bg-muted/30 p-4 opacity-40 pointer-events-none select-none">
                          <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[9px] border-0">{post.format}</Badge><span className="text-[9px] text-muted-foreground">Konten {i + 1}</span></div>
                          <p className="text-sm font-medium text-muted-foreground">🔒 Selesaikan konten sebelumnya dulu</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Copy + isi feedback konten di atas untuk unlock.</p>
                        </div>;
                      }

                      return <PostCard key={i} post={post} fkey={fkey} wn={targetWeek} day={targetDayNum} copiedKey={copiedKey} openFeedback={openFeedback} feedback={feedback} platforms={form.platforms} onCopy={copyPost} onFeedbackToggle={setOpenFeedback} onFeedbackUpdate={updateFeedback} onProduction={(hook) => { setPreSelectedHook(hook); setActiveNav("audiens"); }} />;
                    })}
                  </> : <div className="rounded-xl bg-muted/30 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">{Object.keys(weeks).length > 0 ? "Semua konten sudah selesai! 🎉" : "Belum ada konten. Klik tombol di bawah untuk generate."}</p>
                    {Object.keys(weeks).length === 0 && strategy && (() => {
                      const firstPhase = strategy.phases[0];
                      const firstTheme = firstPhase?.weeklyThemes?.[0] || "";
                      return <Button onClick={() => generateWeek(1, firstPhase?.name || "", firstTheme)} disabled={loadingWeek === 1} className="h-11 text-sm font-bold text-primary-foreground px-6" style={{ background: "var(--gradient-hero)" }}>
                        {loadingWeek === 1 ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Generate Konten Minggu 1
                      </Button>;
                    })()}
                    {Object.keys(weeks).length === 0 && !strategy && <Button onClick={() => setShowForm(true)} className="h-11 text-sm font-bold text-primary-foreground px-6" style={{ background: "var(--gradient-hero)" }}><Sparkles className="h-4 w-4 mr-2" />Buat Strategi Dulu</Button>}
                  </div>}
                </div>

                {/* Progress bar - simple */}
                <div className="rounded-xl bg-white p-4 border border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold">Minggu {completedWeeks} dari {totalWeeksAvailable}</p>
                    <p className="text-xs font-bold text-primary">{progressPct}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* CTA Cards */}
                <div className="space-y-3">
                  <button onClick={() => setActiveNav("analitik")} className="w-full rounded-xl bg-white p-5 border border-border/40 text-left hover:border-primary/30 transition flex items-center gap-4">
                    <BarChart3 className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <p className="text-base font-bold">Mau Baca Hasil Ngontenmu?</p>
                      <p className="text-xs text-muted-foreground">Lihat mana yang laris, mana yang sepi.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto shrink-0" />
                  </button>

                  <button onClick={() => setActiveNav("audiens")} className="w-full rounded-xl bg-white p-5 border border-border/40 text-left hover:border-violet-300 transition flex items-center gap-4">
                    <Sparkles className="h-8 w-8 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-base font-bold">Mau Ciptakan Gambar?</p>
                      <p className="text-xs text-muted-foreground">Upload foto → AI bikin jadi cantik.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto shrink-0" />
                  </button>
                </div>

                {/* Consistency reminder */}
                <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-4">
                  <p className="text-xs font-bold text-amber-900">⚡ Jangan lupa kasih feedback setelah posting!</p>
                  <p className="text-[10px] text-amber-800/80 mt-1">Klik Track di setiap konten. AI belajar dari data kamu.</p>
                </div>
              </>;
            })()}
          </>}

          {/* Phases - only in Konten tab */}
          {activeNav === "konten" && <>
          <h2 className="text-lg font-bold">Ini Strategi Ngonten Kamu</h2>
          {strategy.phases.map((phase, pi) => {
            const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
            return (
              <div key={pi} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tahap {pi + 1} · {phase.name}</p>
                  <p className="text-[10px] text-muted-foreground">W{weekOffset + 1}–{weekOffset + phase.weeklyThemes.length}</p>
                </div>

                {phase.weeklyThemes.map((theme, wi) => {
                  const wn = weekOffset + wi + 1;
                  const done = !!weeks[wn];
                  const isOpen = openWeek === wn;
                  return (
                    <div key={wi}>
                      <button onClick={() => { if (userPlan === "free") { checkPaywall(); return; } done ? setOpenWeek(isOpen ? null : wn) : generateWeek(wn, phase.name, theme); }} className={`w-full rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 text-left transition hover:shadow-md ${isOpen ? "ring-2 ring-primary/20" : ""}`}>
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{loadingWeek === wn ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : wn}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{theme}</p><p className="text-[10px] text-muted-foreground">Hari {(wn-1)*7+1}–{wn*7}</p></div>
                        {!done && <Sparkles className="h-4 w-4 text-primary/50 shrink-0" />}
                      </button>

                      {isOpen && weeks[wn] && <div className="mt-2 space-y-2 pl-12">
                        {weeks[wn].days.map((d, di) => (
                          <div key={di}>
                            {d.posts.map((post, pi2) => {
                              const fkey = `${wn}|${d.day}|${post.slot}`;
                              return <PostCard key={pi2} post={post} fkey={fkey} wn={wn} day={d.day} copiedKey={copiedKey} openFeedback={openFeedback} feedback={feedback} platforms={form.platforms} onCopy={copyPost} onFeedbackToggle={setOpenFeedback} onFeedbackUpdate={updateFeedback} onProduction={(hook) => { setPreSelectedHook(hook); setActiveNav("audiens"); }} />;
                            })}
                          </div>
                        ))}
                      </div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
          </>}

          {/* AI Production Store (Business) */}
          {activeNav === "audiens" && <AudiensView niche={form.niche} audience={form.audience} platform={form.platform} userPlan={userPlan} weeks={weeks} preSelectedHook={preSelectedHook} />}

          {/* Insight View (Pro) */}
          {activeNav === "insight" && <InsightView feedback={fbVals} weeks={weeks} weekData={Object.values(weeks)} niche={form.niche} platform={form.platform} brandPainPoints={(strategy?.brand as any)?.painPoints || []} />}

          {/* Analitik View (Pro) */}
          {activeNav === "analitik" && <AnalitikInline strategyId={strategyId} />}
          </>}
        </div>
      </main>

      {/* Mobile bottom nav - clean */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-border/50 px-4 py-2 z-20">
        <div className="flex items-center justify-around">
          <button onClick={() => setActiveNav("home")} className={`p-2 rounded-xl transition ${activeNav === "home" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><Home className="h-5 w-5" /></button>
          <button onClick={() => setActiveNav("konten")} className={`p-2 rounded-xl transition ${activeNav === "konten" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><FileText className="h-5 w-5" /></button>
          <button onClick={() => tryProFeature("audiens")} className={`p-2 rounded-xl transition ${activeNav === "audiens" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><Sparkles className="h-5 w-5" /></button>
          <button onClick={() => tryProFeature("analitik")} className={`p-2 rounded-xl transition ${activeNav === "analitik" || activeNav === "kpi" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><BarChart3 className="h-5 w-5" /></button>
          <button onClick={() => tryProFeature("insight")} className={`p-2 rounded-xl transition ${activeNav === "insight" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><Lightbulb className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="md:hidden h-40" />

      {/* Paywall Card */}
      {showPaywall && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative">
          <button onClick={() => setShowPaywall(false)} className="absolute top-3 right-3 h-7 w-7 rounded-full border flex items-center justify-center text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          <div className="text-center mb-4"><Crown className="h-10 w-10 text-primary mx-auto mb-2" /><h2 className="text-lg font-bold">Upgrade untuk Akses Penuh</h2><p className="text-xs text-muted-foreground mt-1">Buka semua fitur AI & generate konten tanpa batas.</p></div>
          <div className="space-y-2 mb-5 text-xs">
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>Generate strategi & konten unlimited</span></div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>Analytics & AI Insight lengkap</span></div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>Multi-platform tracking</span></div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>Roadmap motivational</span></div>
          </div>
          <Button onClick={() => { setShowPaywall(false); navigate("/pricing"); }} className="w-full h-11 text-primary-foreground font-semibold" style={{ background: "var(--gradient-hero)" }}>Upgrade Sekarang — Rp 99.000/bln</Button>
          <p className="text-center text-[10px] text-muted-foreground mt-3">Garansi 7 hari uang kembali</p>
        </div>
      </div>}

      {/* Old pricing modal - keep for upgrade button */}
      {showPricing && !showPaywall && <PricingModal onClose={() => setShowPricing(false)} onUpgrade={() => { setShowPricing(false); navigate("/pricing"); }} />}
    </div>
  );
}

// === Sub-components ===
function SideIcon({ icon, active, onClick, tooltip, locked }: { icon: React.ReactNode; active: boolean; onClick: () => void; tooltip: string; locked?: boolean }) {
  return <button onClick={onClick} title={tooltip} className={`relative h-10 w-10 rounded-xl flex items-center justify-center transition ${active ? "bg-primary/10 text-primary" : locked ? "text-muted-foreground/40" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{icon}{locked && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-white" />}</button>;
}

function NavItem({ icon, label, active, onClick, locked }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; locked?: boolean }) {
  return <button onClick={onClick} className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition ${active ? "bg-primary/10 text-primary font-medium" : locked ? "text-muted-foreground/50 cursor-pointer" : "text-muted-foreground hover:bg-muted"}`}>{icon}<span className="flex-1 text-left">{label}</span>{locked && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground/50">Pro</Badge>}</button>;
}

function MI({ icon, value, onChange }: { icon: string; value: number; onChange: (v: number) => void }) {
  return <div className="text-center"><p className="text-[10px]">{icon}</p><Input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="h-6 text-[10px] text-center px-0.5" /></div>;
}

function PricingModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const applyCode = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("code, discount_percent, max_uses, used_count, expires_at")
        .eq("code", code.toUpperCase().trim())
        .single();
      if (error || !data) { toast.error("Kode tidak valid."); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Kode sudah expired."); return; }
      if (data.max_uses && data.used_count >= data.max_uses) { toast.error("Kode sudah habis dipakai."); return; }
      toast.success(`Kode "${code}" aktif! Diskon ${data.discount_percent}% diterapkan.`);
      // Increment used_count
      await supabase.from("promo_codes").update({ used_count: data.used_count + 1 }).eq("code", data.code);
    } catch { toast.error("Gagal memvalidasi kode."); }
    finally { setApplying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 relative my-4">
        <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted"><X className="h-4 w-4" /></button>
        <div className="text-center mb-5"><div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Crown className="h-6 w-6 text-primary" /></div><h2 className="text-lg font-bold">Upgrade Plan</h2></div>
        <div className="rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-center mb-5"><p className="text-xs text-rose-700">⚠️ Batas plan Gratis tercapai.</p></div>

        {/* 3 Plans */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl border p-3 text-center"><p className="text-xs font-bold">Free</p><p className="text-lg font-bold mt-1">Gratis</p><p className="text-[10px] text-muted-foreground mt-1">1 minggu</p><Button variant="outline" className="w-full mt-2 h-8 text-[10px]" onClick={onClose}>Lanjut</Button></div>
          <div className="rounded-xl border-2 border-primary p-3 text-center relative"><Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] px-2">Popular</Badge><p className="text-xs font-bold">Pro</p><p className="text-lg font-bold mt-1">99rb</p><p className="text-[10px] text-muted-foreground mt-1">/bulan</p><Button className="w-full mt-2 h-8 text-[10px] text-primary-foreground" style={{ background: "var(--gradient-hero)" }} onClick={onUpgrade}>Upgrade</Button></div>
          <div className="rounded-xl border p-3 text-center"><p className="text-xs font-bold">Business</p><p className="text-lg font-bold mt-1">249rb</p><p className="text-[10px] text-muted-foreground mt-1">/bulan</p><Button variant="outline" className="w-full mt-2 h-8 text-[10px]" onClick={onUpgrade}>Upgrade</Button></div>
        </div>

        {/* Redeem code */}
        <div className="flex gap-2 mb-3">
          <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Punya kode diskon?" className="h-9 text-xs flex-1" />
          <Button variant="outline" className="h-9 text-xs shrink-0 px-3" onClick={applyCode} disabled={applying}>{applying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Redeem"}</Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">🔒 Aman · Batalkan kapan saja</p>
      </div>
    </div>
  );
}

function FormView({ form, update, loading, onGenerate, onLogout, onBack, userPlan, onShowPricing }: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void; loading: boolean; onGenerate: () => void; onLogout: () => void; onBack?: () => void; userPlan: string; onShowPricing: () => void }) {
  const [brands, setBrands] = useState<{ id: string; niche: string; platform: string }[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  useEffect(() => {
    supabase.from("strategies").select("id, niche, platform").order("created_at", { ascending: false }).then(({ data }) => { setBrands(data ?? []); setLoadingBrands(false); });
  }, []);

  const maxBrands = userPlan === "business" ? 5 : userPlan === "pro" ? 1 : 1;

  const switchBrand = (id: string) => {
    window.location.href = "/";
  };

  const deleteBrand = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus brand ini? Semua data akan hilang.")) return;
    await supabase.from("strategies").delete().eq("id", id);
    setBrands(b => b.filter(x => x.id !== id));
    toast.success("Brand dihapus");
    // If no brands left, reload to reset dashboard
    if (brands.length <= 1) window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] p-6">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-2 font-bold"><Rocket className="h-5 w-5 text-primary" />Launchpad</div><div className="flex items-center gap-3"><a href="/" className="text-xs text-primary font-medium">← Dashboard</a><button onClick={onLogout} className="text-xs text-muted-foreground">Logout</button></div></div>

        {/* Brand list */}
        {brands.length > 0 && <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Brand Kamu ({brands.length}/{maxBrands})</p>
          <div className="space-y-2">
            {brands.map(b => (
              <div key={b.id} className="flex items-center gap-2">
                <button onClick={() => switchBrand(b.id)} className="flex-1 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm text-left hover:shadow-md transition">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{b.niche[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.niche}</p><p className="text-[10px] text-muted-foreground">{b.platform}</p></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={(e) => deleteBrand(b.id, e)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 transition" title="Hapus">🗑️</button>
              </div>
            ))}
          </div>
          {brands.length >= maxBrands && userPlan !== "business" && <button onClick={onShowPricing} className="w-full mt-2 text-xs text-primary text-center py-2">Upgrade untuk tambah brand →</button>}
        </div>}

        <h1 className="text-2xl font-bold mb-1">{brands.length > 0 ? "+ Brand Baru" : "Buat Strategi Baru"}</h1>
        <p className="text-sm text-muted-foreground mb-6">Isi profil akun medsos kamu.</p>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label className="text-sm">Niche / Topik</Label><Input value={form.niche} onChange={e => update("niche", e.target.value)} placeholder="Coaching produktivitas" /></div>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-sm">Platform</Label><select value={form.platform} onChange={e => update("platform", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option><option>Threads</option><option>Facebook</option><option>WhatsApp Channel</option></select></div><div className="grid gap-1.5"><Label className="text-sm">Konten/hari</Label><div className="flex items-center gap-2"><button type="button" onClick={() => update("postsPerDay", Math.max(1, form.postsPerDay - 1))} className="h-10 w-10 rounded-md border border-input flex items-center justify-center text-lg font-bold">−</button><span className="text-lg font-bold w-8 text-center">{form.postsPerDay}</span><button type="button" onClick={() => { const max = userPlan === "business" ? 100 : userPlan === "pro" ? 10 : 5; if (form.postsPerDay >= max) { toast.error(`Max ${max} di plan ${userPlan}`); onShowPricing(); return; } update("postsPerDay", form.postsPerDay + 1); }} className="h-10 w-10 rounded-md border border-input flex items-center justify-center text-lg font-bold">+</button></div><p className="text-[9px] text-muted-foreground">Max: {userPlan === "business" ? 100 : userPlan === "pro" ? 10 : 5}</p></div></div>
          <div className="grid gap-1.5"><Label className="text-sm">Target Audiens</Label><Textarea rows={2} value={form.audience} onChange={e => update("audience", e.target.value)} placeholder="Freelancer 22-35 thn" /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Pesan Utama</Label><Textarea rows={2} value={form.message} onChange={e => update("message", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Tujuan Konversi</Label><Input value={form.conversionGoal} onChange={e => update("conversionGoal", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Tone (opsional)</Label><Input value={form.tone} onChange={e => update("tone", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Platform (pilih semua yang dipakai)</Label>
            <div className="flex flex-wrap gap-2">{PLATFORMS.map(p => <button key={p} type="button" onClick={() => { const cur = form.platforms; update("platforms", cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]); }} className={`px-3 py-1.5 rounded-full text-xs border transition ${form.platforms.includes(p) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>{p}</button>)}</div>
          </div>
          {form.platforms.length > 0 && <div className="grid gap-2"><Label className="text-sm">Followers saat ini</Label>
            <div className="grid grid-cols-2 gap-2">{form.platforms.map(p => <div key={p} className="flex items-center gap-2"><span className="text-xs w-16 truncate">{p}</span><Input type="number" min={0} value={form.initialFollowers[p.toLowerCase()] || 0} onChange={e => update("initialFollowers", { ...form.initialFollowers, [p.toLowerCase()]: parseInt(e.target.value) || 0 })} className="h-8 text-xs" /></div>)}</div>
          </div>}
          <Button onClick={onGenerate} disabled={loading} size="lg" className="h-12 text-base font-semibold text-primary-foreground mt-2" style={{ background: "var(--gradient-hero)" }}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Rocket className="mr-2 h-5 w-5" />Generate Roadmap</>}</Button>
        </div>
      </div>
    </div>
  );
}


function PF({ text }: { text: string }) { return <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span>{text}</span></div>; }
function PL({ text }: { text: string }) { return <div className="flex items-center gap-2 text-muted-foreground"><span className="h-3.5 w-3.5 shrink-0 text-center">—</span><span>{text}</span></div>; }

// === PRO VIEWS ===
function AudiensView({ niche, audience, platform, userPlan, weeks, preSelectedHook }: { niche: string; audience: string; platform: string; userPlan: string; weeks: Record<number, WeekPlan>; preSelectedHook?: string }) {
  const [selectedHook, setSelectedHook] = useState(preSelectedHook || "");
  useEffect(() => { if (preSelectedHook) setSelectedHook(preSelectedHook); }, [preSelectedHook]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [history, setHistory] = useState<{ image: string; hook: string; date: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("ila_img_history") || "[]"); } catch { return []; }
  });
  const [showCreditPaywall, setShowCreditPaywall] = useState(false);

  // Collect all hooks from weeks
  const allHooks: string[] = [];
  Object.values(weeks).forEach((w: any) => (w?.days || []).forEach((d: any) => (d?.posts || []).forEach((p: any) => { if (p.hook) allHooks.push(p.hook); })));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setOutputImage(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!imagePreview || !selectedHook) { toast.error("Upload foto & pilih hook dulu"); return; }
    setLoading(true); setOutputImage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/image-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ hook: selectedHook, imageBase64: imagePreview }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.image) {
          setOutputImage(data.image);
          setUsedToday(data.usedToday || 0);
          // Save to history
          const newHistory = [{ image: data.image, hook: selectedHook, date: new Date().toLocaleString("id-ID") }, ...history].slice(0, 20);
          setHistory(newHistory);
          try { localStorage.setItem("ila_img_history", JSON.stringify(newHistory)); } catch {}
          toast.success("Konten siap download!");
        } else {
          toast.error("AI tidak menghasilkan gambar. Coba lagi.");
        }
      } else {
        const err = await res.json().catch(() => null);
        if (err?.code === "CREDIT_LIMIT") {
          setShowCreditPaywall(true);
        } else {
          toast.error(err?.error || "Gagal generate");
        }
      }
    } catch { toast.error("Gagal, coba lagi"); }
    setLoading(false);
  };

  const downloadImage = () => {
    if (!outputImage) return;
    const link = document.createElement("a");
    link.href = outputImage;
    link.download = `content-${Date.now()}.png`;
    link.click();
  };

  if (userPlan !== "business") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Bikin Foto Konten</h2>
        <Card className="p-8 text-center border-border/40">
          <div className="mx-auto h-14 w-14 rounded-full bg-violet-50 flex items-center justify-center mb-4"><Crown className="h-6 w-6 text-violet-500" /></div>
          <h3 className="text-sm font-bold mb-1">Khusus Business Plan</h3>
          <p className="text-xs text-muted-foreground mb-4">Upload foto apa aja → AI bikin jadi gambar cantik siap posting.</p>
          <div className="space-y-2 mb-5 text-[11px] text-left max-w-xs mx-auto">
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>3 gambar gratis/hari</span></div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>AI aesthetic level ChatGPT</span></div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>Hook otomatis dari strategi</span></div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>Download siap post</span></div>
          </div>
          <Button onClick={() => window.location.href = "/pricing"} className="w-full h-10 text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>Upgrade ke Business — Rp 249.000/bln</Button>
          <p className="text-[9px] text-muted-foreground mt-2">Garansi 7 hari uang kembali</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Bikin Foto Konten</h2>
        <span className="text-[10px] text-muted-foreground">{usedToday}/3 hari ini</span>
      </div>

      <Card className="p-4 border-border/40">
        <p className="text-xs text-muted-foreground mb-3">Upload foto apa aja → pilih kalimat hook → AI bikin jadi cantik → download.</p>

        {/* Upload */}
        <div className="mb-3">
          <label className="block w-full cursor-pointer">
            <div className={`rounded-xl border-2 border-dashed p-4 text-center transition ${imagePreview ? "border-primary/30" : "border-border hover:border-primary/50"}`}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
              ) : (
                <div className="py-4"><Rocket className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Tap untuk upload foto</p></div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {/* Hook selector */}
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Pilih Hook</p>
          {allHooks.length > 0 ? (
            <select value={selectedHook} onChange={e => setSelectedHook(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">— Pilih hook —</option>
              {allHooks.slice(0, 30).map((h, i) => <option key={i} value={h}>{h}</option>)}
            </select>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">Generate konten mingguan dulu untuk mendapat hook.</p>
          )}
        </div>

        {/* Generate button */}
        <Button onClick={generate} disabled={loading || !imagePreview || !selectedHook} className="w-full h-10 text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? "Generating..." : "Generate Konten"}
        </Button>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="p-6 border-border/40 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-medium">AI sedang bikin konten cantik...</p>
            <p className="text-[10px] text-muted-foreground">Biasanya 10-20 detik. Sabar ya ✨</p>
          </div>
        </Card>
      )}

      {/* Output */}
      {outputImage && !loading && (
        <Card className="p-4 border-border/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold">Hasil ✨</p>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={downloadImage}>📥 Download</Button>
          </div>
          <img src={outputImage} alt="Generated" className="w-full rounded-xl shadow-lg" />
        </Card>
      )}

      {/* Credit info */}
      <Card className="p-4 border-border/40">
        <p className="text-xs font-semibold mb-2">Credit Tambahan</p>
        <p className="text-[10px] text-muted-foreground mb-3">3 gambar/hari gratis. Butuh lebih? Beli credit:</p>
        <div className="grid grid-cols-3 gap-2">
          <a href="https://wa.me/6285656787625?text=Halo%20admin%2C%20saya%20mau%20beli%20credit%20AI%20Production%20Store%20paket%20Starter%20(10%20gambar%20Rp%2018.000)" target="_blank" rel="noopener noreferrer" className="rounded-lg border p-2.5 text-center hover:border-primary hover:shadow-sm transition cursor-pointer"><p className="text-xs font-bold">10</p><p className="text-[9px] text-muted-foreground">gambar</p><p className="text-xs font-semibold text-primary mt-1">Rp 18rb</p></a>
          <a href="https://wa.me/6285656787625?text=Halo%20admin%2C%20saya%20mau%20beli%20credit%20AI%20Production%20Store%20paket%20Creator%20(30%20gambar%20Rp%2039.000)" target="_blank" rel="noopener noreferrer" className="rounded-lg border-2 border-primary p-2.5 text-center hover:shadow-md transition cursor-pointer"><p className="text-xs font-bold">30</p><p className="text-[9px] text-muted-foreground">gambar</p><p className="text-xs font-semibold text-primary mt-1">Rp 39rb</p></a>
          <a href="https://wa.me/6285656787625?text=Halo%20admin%2C%20saya%20mau%20beli%20credit%20AI%20Production%20Store%20paket%20Power%20(50%20gambar%20Rp%2059.000)" target="_blank" rel="noopener noreferrer" className="rounded-lg border p-2.5 text-center hover:border-primary hover:shadow-sm transition cursor-pointer"><p className="text-xs font-bold">50</p><p className="text-[9px] text-muted-foreground">gambar</p><p className="text-xs font-semibold text-primary mt-1">Rp 59rb</p></a>
        </div>
        <p className="text-[9px] text-muted-foreground italic mt-2 text-center">Klik paket → langsung ke WhatsApp admin.</p>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4 border-border/40">
          <p className="text-xs font-semibold mb-3">📂 Riwayat Generate</p>
          <div className="grid grid-cols-3 gap-2">
            {history.map((h, i) => (
              <div key={i} className="relative group cursor-pointer" onClick={() => { const link = document.createElement("a"); link.href = h.image; link.download = `konten-${i}.png`; link.click(); }}>
                <img src={h.image} alt={h.hook} className="w-full aspect-[9/16] object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                  <p className="text-[9px] text-white text-center px-1">📥 Download</p>
                </div>
                <p className="text-[8px] text-muted-foreground mt-1 line-clamp-1">{h.hook}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Credit Paywall */}
      {showCreditPaywall && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative">
          <button onClick={() => setShowCreditPaywall(false)} className="absolute top-3 right-3 h-7 w-7 rounded-full border flex items-center justify-center text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          <div className="text-center mb-4"><Sparkles className="h-10 w-10 text-violet-500 mx-auto mb-2" /><h2 className="text-lg font-bold">Kuota Habis</h2><p className="text-xs text-muted-foreground mt-1">3 gambar gratis hari ini sudah terpakai. Beli credit untuk lanjut generate.</p></div>
          <div className="space-y-2 mb-5">
            <div className="rounded-xl border-2 border-border p-3 flex items-center justify-between hover:border-primary/50 transition cursor-pointer">
              <div><p className="text-sm font-bold">10 gambar</p><p className="text-[10px] text-muted-foreground">Rp 1.800/gambar</p></div>
              <p className="text-sm font-bold text-primary">Rp 18.000</p>
            </div>
            <div className="rounded-xl border-2 border-primary p-3 flex items-center justify-between relative">
              <Badge className="absolute -top-2 left-3 bg-primary text-primary-foreground text-[8px] px-2">Popular</Badge>
              <div><p className="text-sm font-bold">30 gambar</p><p className="text-[10px] text-muted-foreground">Rp 1.300/gambar</p></div>
              <p className="text-sm font-bold text-primary">Rp 39.000</p>
            </div>
            <div className="rounded-xl border-2 border-border p-3 flex items-center justify-between hover:border-primary/50 transition cursor-pointer">
              <div><p className="text-sm font-bold">50 gambar</p><p className="text-[10px] text-muted-foreground">Rp 1.180/gambar</p></div>
              <p className="text-sm font-bold text-primary">Rp 59.000</p>
            </div>
          </div>
          <a href="https://wa.me/6285656787625?text=Halo%20admin%2C%20saya%20mau%20beli%20credit%20AI%20Production%20Store" target="_blank" rel="noopener noreferrer" className="block w-full h-11 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition">Beli via WhatsApp</a>
          <p className="text-center text-[9px] text-muted-foreground mt-3">Credit tidak expire. Pakai kapan saja.</p>
        </div>
      </div>}
    </div>
  );
}

function KPIView({ feedback, totalWeeks }: { feedback: Feedback[]; totalWeeks: number }) {
  const totals = feedback.reduce((a, f) => ({ likes: a.likes + f.likes, comments: a.comments + f.comments, messages: a.messages + f.messages, conversions: a.conversions + f.conversions, reach: a.reach + (f.reach || 0) }), { likes: 0, comments: 0, messages: 0, conversions: 0, reach: 0 });
  const totalEng = totals.likes + totals.comments + totals.messages;
  const er = totals.reach > 0 ? ((totalEng / totals.reach) * 100).toFixed(1) : (feedback.length > 0 ? Math.round(totalEng / feedback.length) : 0);
  const cr = totals.reach > 0 ? ((totals.conversions / totals.reach) * 100).toFixed(2) : "0";
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Gauge className="h-5 w-5 text-rose-500" />KPI Tracker</h2>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Engagement Rate</p><p className="text-2xl font-bold text-primary">{er}{totals.reach > 0 ? "%" : ""}</p><p className="text-[10px] text-muted-foreground">{totals.reach > 0 ? "dari reach" : "per konten"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Conversion Rate</p><p className="text-2xl font-bold text-primary">{cr}%</p><p className="text-[10px] text-muted-foreground">{totals.reach > 0 ? "konversi/reach" : "belum ada reach"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Reach</p><p className="text-2xl font-bold">{totals.reach > 0 ? `${(totals.reach / 1000).toFixed(1)}K` : "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Minggu Aktif</p><p className="text-2xl font-bold">{totalWeeks}</p></Card>
      </div>
      <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Target KPI</p>
        <div className="space-y-3">
          <KPIBar label="Likes / Post" current={feedback.length > 0 ? Math.round(totals.likes / feedback.length) : 0} target={100} />
          <KPIBar label="DM / Minggu" current={totals.messages} target={20} />
          <KPIBar label="Konversi / Minggu" current={totals.conversions} target={5} />
        </div>
      </Card>
    </div>
  );
}

function KPIBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return <div><div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="text-muted-foreground">{current}/{target}</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div></div>;
}

function InsightView({ feedback, weekData, niche, platform, brandPainPoints }: { feedback: Feedback[]; weeks: Record<number, WeekPlan>; weekData: WeekPlan[]; niche: string; platform: string; brandPainPoints: string[] }) {
  const [trends, setTrends] = useState<any>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [doctorResult, setDoctorResult] = useState<any>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);

  const fetchTrends = async () => {
    // Check localStorage cache (7 days)
    const cacheKey = `ila_trends_${niche}_${platform}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { const { data, ts } = JSON.parse(cached); if (Date.now() - ts < 7 * 86400000) { setTrends(data); return; } }
    setLoadingTrends(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/trend-forecast", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ niche, platform }) });
      if (res.ok) { const data = await res.json(); setTrends(data); localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); }
      else { const e = await res.json().catch(() => null); toast.error(e?.error || "Gagal load trends"); }
    } catch { toast.error("Gagal"); } finally { setLoadingTrends(false); }
  };

  const runDoctor = async () => {
    // Auto-grab worst content from feedback data
    const postList: { hook: string; caption: string; format: string; score: number; platform: string }[] = [];
    weekData.forEach((w: any) => (w?.days || []).forEach((d: any) => (d?.posts || []).forEach((p: any) => {
      const matchFb = feedback.find((f: any) => f.day === d.day && f.slot === p.slot);
      if (matchFb) {
        const score = (matchFb.conversions || 0) * 5 + (matchFb.messages || 0) * 2 + (matchFb.comments || 0) * 1.5 + (matchFb.likes || 0) * 0.1;
        postList.push({ hook: p.hook || "", caption: p.caption || "", format: p.format || "", score, platform: (matchFb as any).platform || platform });
      }
    })));
    const worst = postList.sort((a, b) => a.score - b.score)[0];
    const captionToAnalyze = worst ? `${worst.hook} ${worst.caption}` : "";
    if (!captionToAnalyze) { toast.error("Belum ada data feedback untuk dianalisis"); return; }
    setLoadingDoctor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/content-doctor", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ caption: captionToAnalyze, platform: worst?.platform || platform, niche, metrics: `likes:${Math.round(worst?.score || 0)}` }) });
      if (res.ok) { setDoctorResult(await res.json()); }
      else { const e = await res.json().catch(() => null); toast.error(e?.error || "Gagal"); }
    } catch { toast.error("Gagal"); } finally { setLoadingDoctor(false); }
  };
  // Format analysis
  const formatStats: Record<string, { count: number; likes: number; comments: number; messages: number; conversions: number; reach: number }> = {};
  weekData.forEach(w => w.days?.forEach(d => d.posts?.forEach(p => {
    if (!formatStats[p.format]) formatStats[p.format] = { count: 0, likes: 0, comments: 0, messages: 0, conversions: 0, reach: 0 };
    formatStats[p.format].count++;
  })));
  // Enrich with feedback
  feedback.forEach(f => {
    // Aggregate totals per format (approximate)
  });
  const sorted = Object.entries(formatStats).sort((a, b) => b[1].count - a[1].count);

  // Totals
  const totalEng = feedback.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
  const totalConv = feedback.reduce((s, f) => s + f.conversions, 0);
  const totalReach = feedback.reduce((s, f) => s + (f.reach || 0), 0);
  const totalLikes = feedback.reduce((s, f) => s + f.likes, 0);
  const totalComments = feedback.reduce((s, f) => s + f.comments, 0);

  // Historical comparison
  const half = Math.floor(feedback.length / 2);
  const firstHalf = feedback.slice(0, half);
  const secondHalf = feedback.slice(half);
  const engFirst = firstHalf.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
  const engSecond = secondHalf.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
  const engChange = engFirst > 0 ? Math.round(((engSecond - engFirst) / engFirst) * 100) : 0;

  // Best posting time
  const hourCounts: Record<number, number> = {};
  feedback.forEach(f => { if (f.posted_at) { const h = new Date(f.posted_at).getHours(); hourCounts[h] = (hourCounts[h] ?? 0) + f.likes + f.comments + f.messages; } });
  const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

  // Platform performance
  const platPerf: Record<string, number> = {};
  feedback.forEach(f => { if (f.platform) platPerf[f.platform] = (platPerf[f.platform] ?? 0) + f.likes + f.comments + f.messages; });
  const bestPlat = Object.entries(platPerf).sort((a, b) => b[1] - a[1])[0];

  // Generate AI recommendations based on data
  const recommendations: { emoji: string; text: string; type: "success" | "warning" | "info" }[] = [];

  if (sorted[0]) recommendations.push({ emoji: "✅", text: `Format "${sorted[0][0]}" paling banyak dipakai (${sorted[0][1].count}x). Pertahankan.`, type: "success" });
  if (bestPlat) recommendations.push({ emoji: "📱", text: `${bestPlat[0]} menghasilkan engagement tertinggi. Fokuskan effort di sana.`, type: "success" });
  if (bestHour) recommendations.push({ emoji: "⏰", text: `Jam ${bestHour[0]}:00 waktu terbaik posting (${bestHour[1]} total interaksi).`, type: "info" });
  if (engChange > 20) recommendations.push({ emoji: "🚀", text: `Engagement naik ${engChange}%! Momentum bagus, jangan berhenti.`, type: "success" });
  if (engChange < -20) recommendations.push({ emoji: "⚠️", text: `Engagement turun ${Math.abs(engChange)}%. Variasikan hook & format.`, type: "warning" });
  if (totalReach > 0 && totalConv > 0) recommendations.push({ emoji: "🎯", text: `CR: ${((totalConv / totalReach) * 100).toFixed(2)}%. ${totalConv > 5 ? "Bagus!" : "Tambahkan CTA yang lebih kuat."}`, type: totalConv > 5 ? "success" : "info" });
  if (totalLikes > 0 && totalComments < totalLikes * 0.05) recommendations.push({ emoji: "💬", text: `Komentar rendah vs likes. Tambahkan pertanyaan di caption untuk trigger diskusi.`, type: "warning" });
  if (sorted.length > 2) recommendations.push({ emoji: "🔄", text: `Variasi format bagus (${sorted.length} jenis). Terus eksperimen.`, type: "info" });
  if (feedback.length === 0) recommendations.push({ emoji: "📝", text: `Belum ada data. Catat performa konten untuk mendapat insight.`, type: "info" });

  // Do's and Don'ts
  const dos = [
    sorted[0] ? `Pakai format ${sorted[0][0]} lebih sering` : "Konsisten posting setiap hari",
    bestHour ? `Posting di jam ${bestHour[0]}:00` : "Posting di jam 7-9 pagi atau 19-21 malam",
    "Selalu akhiri dengan CTA yang jelas",
    "Gunakan hook yang memancing rasa penasaran",
  ];
  const donts = [
    engChange < -10 ? "Jangan ulangi pola minggu lalu yang turun" : "Jangan posting tanpa hook di 3 detik pertama",
    "Jangan skip posting lebih dari 2 hari berturut-turut",
    "Jangan pakai hashtag yang tidak relevan",
  ];

  // Pain points - max 15, generated from context
  // Pain points - from brand strategy (AI-generated) or fallback
  const painPoints = brandPainPoints.length > 0 ? brandPainPoints.slice(0, 15) : [
    "Belum ada pain points. Generate strategi baru untuk mendapatkan pain points spesifik audiens-mu."
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Saran AI Untuk Kamu</h2>
      <p className="text-xs text-muted-foreground -mt-2">AI sudah analisis kontenmu. Ini yang perlu kamu tahu.</p>

      {/* AI Trend Forecast */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" /><p className="text-sm font-bold">Tren Bulan Ini</p></div>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={fetchTrends} disabled={loadingTrends}>{loadingTrends ? <Loader2 className="h-3 w-3 animate-spin" /> : trends ? "Refresh" : "Generate"}</Button>
        </div>
        {trends?.trends ? <div className="space-y-2">
          {trends.trends.map((t: any, i: number) => (
            <div key={i} className="rounded-lg bg-violet-50/50 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold">{t.title}</p>
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${t.confidence === "high" ? "bg-emerald-100 text-emerald-700" : t.confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{t.confidence}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{t.description}</p>
              {t.hookIdea && <p className="text-[10px] text-primary mt-1 italic">"{t.hookIdea}"</p>}
              {t.format && <Badge variant="outline" className="text-[8px] mt-1.5 font-normal">{t.format}</Badge>}
            </div>
          ))}
          <p className="text-[9px] text-muted-foreground italic text-center pt-1">Cache 7 hari · {niche}</p>
        </div> : <p className="text-[11px] text-muted-foreground italic">Klik Generate untuk prediksi trend bulan ini di niche-mu.</p>}
      </Card>

      {/* AI Content Doctor */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-rose-500" /><p className="text-sm font-bold">Perbaiki Konten Jelek</p></div>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={runDoctor} disabled={loadingDoctor}>{loadingDoctor ? <Loader2 className="h-3 w-3 animate-spin" /> : "Diagnosa"}</Button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">Klik Diagnosa → AI cari tahu kenapa kontenmu sepi & kasih solusi.</p>
        {doctorResult && <div className="space-y-2">
          <div className="rounded-lg bg-rose-50 p-2.5"><p className="text-[10px] text-rose-800 font-semibold uppercase tracking-wide mb-1">Diagnosis</p><p className="text-[11px] text-rose-700">{doctorResult.diagnosis}</p></div>
          {doctorResult.issues?.length > 0 && <div className="rounded-lg bg-amber-50 p-2.5"><p className="text-[10px] text-amber-800 font-semibold uppercase tracking-wide mb-1">Issues</p>{doctorResult.issues.map((iss: string, i: number) => <p key={i} className="text-[10px] text-amber-700">• {iss}</p>)}</div>}
          {doctorResult.fixes?.length > 0 && <div className="space-y-2">{doctorResult.fixes.map((fix: any, i: number) => (
            <div key={i} className="rounded-lg bg-emerald-50 p-2.5">
              <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wide mb-1">Fix #{fix.version}</p>
              <p className="text-[11px] font-medium">{fix.hook}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{fix.caption}</p>
              <p className="text-[10px] text-primary mt-0.5">{fix.cta}</p>
              <p className="text-[9px] text-muted-foreground italic mt-1.5">{fix.why}</p>
            </div>
          ))}</div>}
        </div>}
        {!doctorResult && !loadingDoctor && <p className="text-[10px] text-muted-foreground italic">Klik Diagnosa untuk AI analisis konten terburuk-mu.</p>}
      </Card>

      {/* Worst Content - top 10 lowest performing */}
      {(() => {
        const postList: { hook: string; format: string; score: number; likes: number; comments: number; conversions: number; platform: string; week: number }[] = [];
        feedback.forEach((f: any) => {
          if ((f.likes || 0) + (f.comments || 0) + (f.messages || 0) + (f.conversions || 0) === 0) return;
          // Find matching post from weekData
          let hook = ""; let format = "";
          weekData.forEach((w: any) => (w?.days || []).forEach((d: any) => (d?.posts || []).forEach((p: any) => {
            if (!hook && d.day === f.day && p.slot === f.slot) { hook = p.hook || ""; format = p.format || ""; }
          })));
          const score = (f.conversions || 0) * 5 + (f.messages || 0) * 2 + (f.comments || 0) * 1.5 + (f.likes || 0) * 0.1;
          postList.push({ hook, format, score, likes: f.likes || 0, comments: f.comments || 0, conversions: f.conversions || 0, platform: f.platform || "", week: f.week_number || 0 });
        });
        const worst = postList.sort((a, b) => a.score - b.score).slice(0, 10);
        if (worst.length === 0) return null;
        return (
          <Card className="p-4">
            <p className="text-xs font-semibold mb-3">⚠️ Konten Terburuk (Top 10)</p>
            <div className="space-y-2">
              {worst.map((w, i) => (
                <div key={i} className="rounded-lg bg-rose-50/50 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-500 font-bold">#{i + 1}</span>
                      {w.format && <Badge variant="secondary" className="text-[8px]">{w.format}</Badge>}
                    </div>
                    <span className="text-[9px] text-muted-foreground capitalize">{w.platform} · W{w.week}</span>
                  </div>
                  {w.hook && <p className="text-[10px] line-clamp-1">🪝 {w.hook}</p>}
                  <div className="flex gap-3 text-[9px] text-muted-foreground mt-1">
                    <span>❤️ {w.likes}</span><span>💬 {w.comments}</span><span>🛒 {w.conversions}</span>
                    <span className="text-rose-500 font-bold ml-auto">Score: {w.score.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground italic mt-2">Score = konversi×5 + DM×2 + komentar×1.5 + likes×0.1</p>
          </Card>
        );
      })()}

      {/* Recommendations */}
      <Card className="p-4 space-y-2 border-border/40">
        <p className="text-sm font-bold mb-2">Yang Harus Kamu Lakukan</p>
        {recommendations.map((r, i) => (
          <div key={i} className={`rounded-lg p-3 ${r.type === "success" ? "bg-emerald-50" : r.type === "warning" ? "bg-amber-50" : "bg-blue-50"}`}>
            <p className={`text-xs ${r.type === "success" ? "text-emerald-800" : r.type === "warning" ? "text-amber-800" : "text-blue-800"}`}>{r.emoji} {r.text}</p>
          </div>
        ))}
      </Card>

      {/* Do's & Don'ts */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-border/40"><p className="text-sm font-bold text-emerald-600 mb-2">Lakukan ✓</p>{dos.map((d, i) => <p key={i} className="text-[11px] text-muted-foreground mb-1.5">• {d}</p>)}</Card>
        <Card className="p-4 border-border/40"><p className="text-sm font-bold text-rose-600 mb-2">Jangan ✗</p>{donts.map((d, i) => <p key={i} className="text-[11px] text-muted-foreground mb-1.5">• {d}</p>)}</Card>
      </div>

      {/* Pain Points */}
      <Card className="p-4 border-border/40">
        <p className="text-sm font-bold mb-1">Masalah Audiens Kamu</p>
        <p className="text-[10px] text-muted-foreground mb-3">Ini yang bikin audiens kamu galau. Pakai di konten biar mereka merasa "ini gue banget!"</p>
        <div className="grid grid-cols-1 gap-1.5">
          {painPoints.map((p, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-rose-50/30 px-3 py-2">
              <span className="text-[10px] text-rose-400 font-semibold shrink-0 w-5">{brandPainPoints.length > 0 ? `${i + 1}.` : ""}</span>
              <p className="text-[11px] text-foreground/80">{p}</p>
            </div>
          ))}
        </div>
        {brandPainPoints.length > 0 && <p className="text-[9px] text-muted-foreground italic mt-2">Generate strategi baru untuk update pain points.</p>}
      </Card>

      {/* Historical */}
      {feedback.length >= 4 && <Card className="p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">📈 Trend</p>
        <div className="flex items-center gap-4">
          <div className={`rounded-lg p-3 flex-1 text-center ${engChange >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}><p className="text-xl font-bold">{engChange >= 0 ? "+" : ""}{engChange}%</p><p className="text-[9px] text-muted-foreground">Engagement</p></div>
          {bestPlat && <div className="rounded-lg p-3 flex-1 text-center bg-violet-50"><p className="text-sm font-bold capitalize">{bestPlat[0]}</p><p className="text-[9px] text-muted-foreground">Best Platform</p></div>}
        </div>
      </Card>}

      {/* Format distribution */}
      {sorted.length > 0 && <Card className="p-4"><p className="text-xs font-semibold uppercase text-muted-foreground mb-2">📊 Format yang Work</p>
        <div className="space-y-2">{sorted.slice(0, 5).map(([fmt, data], i) => <div key={i} className="flex items-center gap-3"><span className="text-xs w-20 truncate">{fmt}</span><div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(data.count / sorted[0][1].count) * 100}%`, background: COLORS[i % COLORS.length] }} /></div><span className="text-[10px] text-muted-foreground">{data.count}x</span></div>)}</div>
      </Card>}
    </div>
  );
}


function RoadmapView({ strategy, weeks, completedWeeks, totalWeeksAvailable }: { strategy: Strategy; weeks: Record<number, WeekPlan>; completedWeeks: number; totalWeeksAvailable: number }) {
  const currentWeek = completedWeeks + 1;

  // Epic phase names & motivational quotes
  const phaseEpicNames = ["The Blueprint of Trust", "The Rise of Influence", "The Empire of Conversion"];
  const phaseSubtitles = ["Mengubah akun dari 'sekadar profil' menjadi 'pusat referensi'", "Memperluas jangkauan dan membangun komunitas loyal", "Mengubah perhatian menjadi pendapatan nyata"];

  // Motivational status messages per state
  const getMotivation = (wn: number, done: boolean, isCurrent: boolean) => {
    if (done) return { text: "Langkah ini sudah kamu taklukkan. Terus maju.", emoji: "✅" };
    if (isCurrent) return { text: "Kamu sedang di sini. Dunia mulai memperhatikan.", emoji: "🔥" };
    if (wn === currentWeek + 1) return { text: "Sebentar lagi. Bersiaplah.", emoji: "⚡" };
    return { text: "Terkunci. Selesaikan yang sebelumnya dulu.", emoji: "🔒" };
  };

  // Survivor stat
  const survivalPct = Math.max(5, 100 - (completedWeeks * 7));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Your Journey</p>
        <h2 className="text-2xl font-bold mt-1">Roadmap Dominasi</h2>
        <p className="text-xs text-muted-foreground mt-2">Hanya <span className="text-primary font-bold">{survivalPct}%</span> kreator yang sampai di titik ini. Kamu salah satunya.</p>
      </div>

      {/* Progress overview */}
      <div className="flex items-center justify-center gap-6">
        <div className="relative h-20 w-20">
          <svg className="h-20 w-20 -rotate-90"><circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" /><circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeDasharray={`${(completedWeeks / totalWeeksAvailable) * 213} 213`} strokeLinecap="round" className={completedWeeks > 0 ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" : ""} /></svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{Math.round((completedWeeks / totalWeeksAvailable) * 100)}%</span>
        </div>
        <div><p className="text-sm font-semibold">{completedWeeks} / {totalWeeksAvailable}</p><p className="text-xs text-muted-foreground">minggu ditaklukkan</p></div>
      </div>

      {/* Phases */}
      {strategy.phases.map((phase, pi) => {
        const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
        const epicName = phaseEpicNames[pi] || phase.name;
        const subtitle = phaseSubtitles[pi] || phase.objective;
        return (
          <div key={pi} className="space-y-4">
            {/* Phase header */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Fase {pi + 1}</p>
              <h3 className="text-lg font-bold mt-1">{epicName}</h3>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              <div className="flex gap-2 mt-3">{phase.kpis.slice(0, 2).map((k, i) => <Badge key={i} variant="secondary" className="text-[9px]">{k}</Badge>)}</div>
            </div>

            {/* Weeks */}
            <div className="space-y-2 pl-2">
              {phase.weeklyThemes.map((theme, wi) => {
                const wn = weekOffset + wi + 1;
                const done = !!weeks[wn];
                const isCurrent = wn === currentWeek;
                const motivation = getMotivation(wn, done, isCurrent);
                const isLocked = !done && !isCurrent && wn > currentWeek;

                return (
                  <div key={wi} className={`relative rounded-xl p-4 transition-all ${isCurrent ? "bg-white shadow-md ring-1 ring-primary/30" : done ? "bg-white/80 shadow-sm" : "bg-muted/30"} ${isCurrent ? "animate-pulse-subtle" : ""}`}>
                    {/* Glow effect for active */}
                    {isCurrent && <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse" />}

                    <div className="relative flex items-start gap-3">
                      {/* Status icon */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm ${done ? "bg-emerald-100" : isCurrent ? "bg-primary/20" : "bg-muted"}`}>
                        {motivation.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${isLocked ? "text-muted-foreground/50" : "text-muted-foreground"}`}>Minggu {wn}</p>
                          {done && <span className="text-[9px] text-emerald-600 font-semibold">CONQUERED</span>}
                          {isCurrent && <span className="text-[9px] text-primary font-bold animate-pulse">ACTIVE NOW</span>}
                        </div>
                        <p className={`text-sm font-semibold mt-0.5 ${isLocked ? "text-muted-foreground/40" : ""}`}>{theme}</p>
                        <p className={`text-[11px] mt-1 italic ${isCurrent ? "text-primary/80" : "text-muted-foreground/60"}`}>{motivation.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phase completion badge */}
            {weekOffset + phase.weeklyThemes.length <= completedWeeks && (
              <div className="text-center py-2"><Badge className="bg-emerald-100 text-emerald-700 text-xs">🏆 Fase {pi + 1} Selesai — Kamu luar biasa</Badge></div>
            )}
          </div>
        );
      })}

      {/* Bottom motivational */}
      <div className="text-center py-6">
        <p className="text-xs text-muted-foreground italic">"Konsistensi mengalahkan bakat. Setiap hari kamu posting, kamu menang."</p>
      </div>
    </div>
  );
}

function AnalitikInline({ strategyId }: { strategyId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [followerGoal, setFollowerGoal] = useState<number>(1000);
  const [currentFollowers, setCurrentFollowers] = useState<number>(0);

  useEffect(() => {
    try {
      setFollowerGoal(parseInt(localStorage.getItem("ila_follower_goal") || "1000"));
      setCurrentFollowers(parseInt(localStorage.getItem("ila_current_followers") || "0"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!strategyId) { setLoading(false); return; }
    (async () => {
      try {
        const [{ data: w }, { data: f }] = await Promise.all([
          supabase.from("weeks").select("week_number, data").eq("strategy_id", strategyId).order("week_number"),
          (supabase.from("feedback") as any).select("week_number, day, slot, likes, comments, messages, conversions, reach, posted_at, platform, note").eq("strategy_id", strategyId),
        ]);
        setWeekData((w ?? []).map((x: any) => x.data));
        setFeedbackData((f ?? []) as any[]);
      } catch (e) { console.error("AnalitikInline load error:", e); }
      setLoading(false);
    })();
  }, [strategyId]);

  const saveGoal = (g: number, c: number) => {
    setFollowerGoal(g); setCurrentFollowers(c);
    localStorage.setItem("ila_follower_goal", String(g));
    localStorage.setItem("ila_current_followers", String(c));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Totals
  const totals = feedbackData.reduce((a: any, f: any) => ({ posts: a.posts + 1, likes: a.likes + (f.likes || 0), comments: a.comments + (f.comments || 0), messages: a.messages + (f.messages || 0), conversions: a.conversions + (f.conversions || 0), reach: a.reach + (f.reach || 0) }), { posts: 0, likes: 0, comments: 0, messages: 0, conversions: 0, reach: 0 });
  const totalPosts = weekData.reduce((s: number, w: any) => s + ((w?.days || []).reduce((a: number, d: any) => a + ((d?.posts || []).length), 0)), 0);
  const totalEng = totals.likes + totals.comments + totals.messages;
  const er = totals.reach > 0 ? ((totalEng / totals.reach) * 100).toFixed(1) : "—";
  const cr = totals.reach > 0 ? ((totals.conversions / totals.reach) * 100).toFixed(2) : "—";

  // Funnel
  const funnel = [
    { stage: "Reach", value: totals.reach, pct: 100 },
    { stage: "Engagement", value: totalEng, pct: totals.reach > 0 ? (totalEng / totals.reach) * 100 : 0 },
    { stage: "DM", value: totals.messages, pct: totals.reach > 0 ? (totals.messages / totals.reach) * 100 : 0 },
    { stage: "Konversi", value: totals.conversions, pct: totals.reach > 0 ? (totals.conversions / totals.reach) * 100 : 0 },
  ];

  // Cohort
  const cohortMap = new Map<number, { posts: number; eng: number }>();
  feedbackData.forEach((f: any) => {
    const c = cohortMap.get(f.week_number) ?? { posts: 0, eng: 0 };
    c.posts++; c.eng += f.likes + f.comments + f.messages;
    cohortMap.set(f.week_number, c);
  });
  const cohort = Array.from(cohortMap.entries()).sort((a, b) => a[0] - b[0]).map(([w, d]) => ({ week: `W${w}`, avgEng: d.posts > 0 ? Math.round(d.eng / d.posts) : 0 }));

  // Attribution top 3
  const postMap = new Map<string, { format: string; hook: string }>();
  weekData.forEach((w: any, wi) => {
    const wn = w?.weekNumber || wi + 1;
    (w?.days || []).forEach((d: any) => (d?.posts || []).forEach((p: any) => postMap.set(`${wn}|${d.day}|${p.slot}`, { format: p.format, hook: p.hook })));
  });
  const attribution = feedbackData
    .map((f: any) => ({ ...f, post: postMap.get(`${f.week_number}|${f.day}|${f.slot}`) }))
    .filter((f: any) => (f.conversions || 0) + (f.messages || 0) > 0)
    .sort((a: any, b: any) => ((b.conversions || 0) * 5 + (b.messages || 0)) - ((a.conversions || 0) * 5 + (a.messages || 0)))
    .slice(0, 3);

  // Content Type ROI
  const byFormat: Record<string, { count: number; eng: number; conv: number; dm: number }> = {};
  weekData.forEach((w: any, wi) => {
    const wn = w?.weekNumber || wi + 1;
    (w?.days || []).forEach((d: any) => (d?.posts || []).forEach((p: any) => {
      const key = p.format || "Lainnya";
      if (!byFormat[key]) byFormat[key] = { count: 0, eng: 0, conv: 0, dm: 0 };
      byFormat[key].count++;
      feedbackData.filter((f: any) => f.week_number === wn && f.day === d.day && f.slot === p.slot).forEach((m: any) => {
        byFormat[key].eng += (m.likes || 0) + (m.comments || 0) + (m.messages || 0);
        byFormat[key].conv += m.conversions || 0;
        byFormat[key].dm += m.messages || 0;
      });
    }));
  });
  const contentROI = Object.entries(byFormat).map(([fmt, s]) => ({ format: fmt, count: s.count, roiScore: s.count > 0 ? Math.round((s.conv * 100 + s.dm * 20 + s.eng) / s.count) : 0 })).sort((a, b) => b.roiScore - a.roiScore);

  // Burnout
  const now = new Date();
  const last7 = feedbackData.filter((f: any) => f.posted_at && (now.getTime() - new Date(f.posted_at).getTime()) / 86400000 <= 7);
  const prev7 = feedbackData.filter((f: any) => { if (!f.posted_at) return false; const age = (now.getTime() - new Date(f.posted_at).getTime()) / 86400000; return age > 7 && age <= 14; });
  const freqDrop = prev7.length > 0 ? Math.round((1 - last7.length / prev7.length) * 100) : 0;
  const burnoutAlerts: { level: string; text: string }[] = [];
  if (freqDrop >= 30) burnoutAlerts.push({ level: "danger", text: `Frekuensi posting turun ${freqDrop}% minggu ini.` });
  else if (freqDrop >= 15) burnoutAlerts.push({ level: "warning", text: `Frekuensi turun ${freqDrop}%. Jaga konsistensi.` });
  if (last7.length === 0 && prev7.length > 0) burnoutAlerts.push({ level: "danger", text: "Belum ada konten minggu ini." });

  // Goal projection
  const last30 = feedbackData.filter((f: any) => f.posted_at && (now.getTime() - new Date(f.posted_at).getTime()) / 86400000 <= 30);
  const reachPerWeek = last30.length > 0 ? last30.reduce((s: number, f: any) => s + (f.reach || 0), 0) / 4 : 0;
  const estGrowth = Math.round(reachPerWeek * 0.005);
  const projectedAtMonth = currentFollowers + estGrowth * 4;
  const onTrack = projectedAtMonth >= followerGoal;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Ini Laporan Konten Kamu</h2>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-border/40"><div className="flex items-center justify-between mb-1"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Konten</p></div><p className="text-2xl font-bold">{totalPosts}</p><p className="text-[9px] text-muted-foreground">total dibuat</p></Card>
        <Card className="p-4 border-border/40"><div className="flex items-center justify-between mb-1"><Heart className="h-3.5 w-3.5 text-rose-400" /><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Suka</p></div><p className="text-2xl font-bold">{totals.likes}</p><p className="text-[9px] text-muted-foreground">orang suka</p></Card>
        <Card className="p-4 border-border/40"><div className="flex items-center justify-between mb-1"><Activity className="h-3.5 w-3.5 text-primary" /><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Interaksi</p></div><p className="text-2xl font-bold">{er}{er !== "—" ? "%" : ""}</p><p className="text-[9px] text-muted-foreground">dari yang lihat</p></Card>
        <Card className="p-4 border-border/40"><div className="flex items-center justify-between mb-1"><ShoppingCart className="h-3.5 w-3.5 text-emerald-400" /><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pembeli</p></div><p className="text-2xl font-bold">{totals.conversions}</p><p className="text-[9px] text-muted-foreground">jadi beli</p></Card>
      </div>

      {/* Burnout */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-2 mb-3"><Activity className="h-4 w-4 text-rose-500" /><p className="text-xs font-semibold">Kamu Masih Semangat?</p></div>
        {burnoutAlerts.length > 0 ? <div className="space-y-2">
          {burnoutAlerts.map((a, i) => <div key={i} className={`rounded-lg p-2.5 text-[11px] flex items-start gap-2 ${a.level === "danger" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}><span className="shrink-0">{a.level === "danger" ? "🚨" : "⚠️"}</span><span>{a.text}</span></div>)}
        </div> : <div className="rounded-lg bg-emerald-50 p-2.5 text-[11px] text-emerald-800 flex items-center gap-2"><Check className="h-3.5 w-3.5" />Frekuensi posting stabil. Pertahankan konsistensi.</div>}
        <div className="flex justify-between text-[10px] text-muted-foreground pt-3"><span>7 hari ini · {last7.length} post</span><span>7 hari lalu · {prev7.length} post</span></div>
      </Card>

      {/* Goal Tracking */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-2 mb-3"><Target className="h-4 w-4 text-primary" /><p className="text-xs font-semibold">Target Follower Kamu</p></div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Sekarang</p><Input type="number" value={currentFollowers} onChange={e => saveGoal(followerGoal, parseInt(e.target.value) || 0)} className="h-8 text-xs" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Target</p><Input type="number" value={followerGoal} onChange={e => saveGoal(parseInt(e.target.value) || 0, currentFollowers)} className="h-8 text-xs" /></div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, followerGoal > 0 ? (currentFollowers / followerGoal) * 100 : 0)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-3"><span>{currentFollowers}</span><span className="font-semibold text-foreground">{followerGoal > 0 ? Math.round((currentFollowers / followerGoal) * 100) : 0}%</span><span>{followerGoal}</span></div>
        <div className={`rounded-lg p-2.5 text-[11px] flex items-start gap-2 ${onTrack && estGrowth > 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {estGrowth > 0 ? <><TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Proyeksi akhir bulan: <strong>{projectedAtMonth}</strong> follower.{!onTrack && ` Tingkatkan posting rate.`}</span></> : <><BarChart3 className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Catat reach di setiap konten untuk dapat proyeksi AI.</span></>}
        </div>
      </Card>

      {/* Funnel */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-2 mb-3"><Zap className="h-4 w-4 text-amber-500" /><p className="text-xs font-semibold">Dari Lihat Sampai Beli</p></div>
        {totals.reach > 0 ? <div className="space-y-2">
          {funnel.map((f, i) => <div key={f.stage} className="flex items-center gap-3">
            <span className="text-xs w-20 shrink-0 text-muted-foreground">{f.stage}</span>
            <div className="flex-1 h-7 rounded-md bg-muted/40 overflow-hidden">
              <div className="h-full rounded-md flex items-center justify-end pr-2" style={{ width: `${Math.max(i === 0 ? 100 : f.pct, 5)}%`, background: COLORS[i] }}><span className="text-[10px] text-white font-bold">{(f.value || 0).toLocaleString()}</span></div>
            </div>
            <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">{f.pct.toFixed(1)}%</span>
          </div>)}
        </div> : <div className="space-y-2 opacity-30">
          {["Reach", "Engagement", "DM", "Konversi"].map((s, i) => <div key={s} className="flex items-center gap-3">
            <span className="text-xs w-20 shrink-0 text-muted-foreground">{s}</span>
            <div className="flex-1 h-7 rounded-md bg-muted/40 overflow-hidden"><div className="h-full rounded-md" style={{ width: `${100 - i * 25}%`, background: COLORS[i] }} /></div>
            <span className="text-[10px] text-muted-foreground w-12 text-right">—</span>
          </div>)}
          <p className="text-[10px] text-muted-foreground italic text-center pt-2">Catat reach untuk lihat funnel real-mu</p>
        </div>}
      </Card>

      {/* Cohort */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-violet-500" /><p className="text-xs font-semibold">Perkembangan Tiap Minggu</p></div>
        {cohort.length >= 2 ? <div className="space-y-1.5">
          {cohort.map(c => { const maxEng = Math.max(...cohort.map(x => x.avgEng), 1); return <div key={c.week} className="flex items-center gap-3">
            <span className="text-xs w-10 text-muted-foreground">{c.week}</span>
            <div className="flex-1 h-5 rounded bg-muted/40 overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${Math.min(100, maxEng > 0 ? (c.avgEng / maxEng) * 100 : 0)}%` }} /></div>
            <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">{c.avgEng}</span>
          </div>; })}
        </div> : <p className="text-[11px] text-muted-foreground italic">Butuh minimal 2 minggu data untuk lihat pattern growth/decay.</p>}
      </Card>

      {/* Attribution */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-2 mb-3"><Award className="h-4 w-4 text-emerald-500" /><p className="text-xs font-semibold">Konten yang Menghasilkan Uang</p></div>
        {attribution.length > 0 ? <div className="space-y-2">
          {attribution.map((a: any, i) => <div key={i} className="rounded-lg bg-emerald-50/40 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="secondary" className="text-[9px] font-normal">{a.post?.format || "—"}</Badge>
              <span className="text-[10px] text-muted-foreground capitalize">{a.platform} · W{a.week_number}</span>
            </div>
            {a.post?.hook && <p className="text-[11px] line-clamp-1 mb-1.5">{a.post.hook}</p>}
            <div className="flex gap-3 text-[10px]"><span className="text-emerald-700 font-semibold flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{a.conversions}</span><span className="text-blue-600 flex items-center gap-1"><Send className="h-3 w-3" />{a.messages}</span><span className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" />{a.likes}</span></div>
          </div>)}
        </div> : <p className="text-[11px] text-muted-foreground italic">Catat konversi & DM di tracker untuk lihat konten mana yang menghasilkan business outcome.</p>}
      </Card>

      {/* Content Type ROI */}
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-amber-500" /><p className="text-xs font-semibold">Jenis Konten Paling Laris</p></div>
        {contentROI.length > 0 ? <div className="space-y-2">
          {contentROI.slice(0, 5).map((c, i) => <div key={c.format} className="rounded-lg bg-muted/30 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-semibold w-5 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}>#{i + 1}</span>
              <div><p className="text-xs font-medium capitalize">{c.format}</p><p className="text-[10px] text-muted-foreground">{c.count} posts</p></div>
            </div>
            <div className="text-right"><p className="text-sm font-bold text-primary">{c.roiScore}</p><p className="text-[9px] text-muted-foreground">ROI</p></div>
          </div>)}
          {contentROI[0] && contentROI.length > 1 && <p className="text-[10px] text-muted-foreground mt-2 italic flex items-start gap-1.5"><Lightbulb className="h-3 w-3 shrink-0 mt-0.5" />Format <strong className="text-foreground">{contentROI[0].format}</strong> paling efektif.</p>}
        </div> : <p className="text-[11px] text-muted-foreground italic">Generate strategi & catat performa untuk lihat format mana yang paling ROI tinggi.</p>}
      </Card>

      <div className="text-center pt-2">
        <a href="/analytics" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">Lihat analitik lengkap <ChevronRight className="h-3 w-3" /></a>
      </div>
    </div>
  );
}


function PostCard({ post, fkey, wn, day, copiedKey, openFeedback, feedback, platforms, onCopy, onFeedbackToggle, onFeedbackUpdate, onProduction }: {
  post: WeekPlan["days"][0]["posts"][0]; fkey: string; wn: number; day: number;
  copiedKey: string | null; openFeedback: string | null; feedback: Record<string, Feedback>; platforms: string[];
  onCopy: (key: string, post: WeekPlan["days"][0]["posts"][0]) => void;
  onFeedbackToggle: (key: string | null) => void;
  onFeedbackUpdate: (key: string, patch: Partial<Feedback>) => void;
  onProduction?: (hook: string) => void;
}) {
  const [expanded] = useState(true); // always open
  const isCopied = copiedKey === fkey;
  const fbOpen = openFeedback === fkey;

  return (
    <div className="rounded-2xl bg-white p-5 mb-3 shadow-md border border-border/40">
      <div className="flex items-center gap-2 mb-2"><Badge variant="secondary" className="text-[10px] font-semibold border-0 px-2.5 py-0.5">{post.format}</Badge><span className="text-[10px] text-muted-foreground">Konten {day - (wn-1)*7 > 0 ? day - (wn-1)*7 : day}</span></div>
      <p className="text-base font-bold leading-snug mb-2">{post.hook}</p>
      <p className="text-sm text-muted-foreground">{post.caption}</p>
      <p className="text-sm mt-2"><strong>CTA:</strong> {post.cta}</p>
      <p className="text-[11px] text-muted-foreground mt-2">🎨 {post.visualIdea}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">{post.hashtags.slice(0, 5).map((h, hi) => <span key={hi} className="text-[10px] text-primary/70 font-medium">{h.startsWith("#") ? h : `#${h}`}</span>)}</div>
      
      {/* Action buttons - ALWAYS VISIBLE & PROMINENT */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
        <button onClick={(e) => { e.stopPropagation(); onCopy(fkey, post); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-center transition ${isCopied ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-primary/90"}`}>{isCopied ? "✓ Tersalin!" : "📋 Copy"}</button>
        <button onClick={(e) => { e.stopPropagation(); onFeedbackToggle(fbOpen ? null : fkey); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-center transition ${fbOpen ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"}`}>📊 Track</button>
        {onProduction && <button onClick={(e) => { e.stopPropagation(); onProduction(post.hook); }} className="py-2.5 px-4 rounded-xl text-sm font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 transition">🎨</button>}
      </div>

      {/* Feedback form */}
      {fbOpen && <div className="mt-3 space-y-2">
          {platforms.map(plat => {
            const pfkey = `${fkey}|${plat.toLowerCase()}`;
            const pfb = feedback[pfkey];
            return <div key={plat} className="rounded-lg bg-muted/30 p-2">
              <p className="text-[9px] font-semibold text-muted-foreground mb-1">{plat}</p>
              <div className="grid grid-cols-5 gap-1">
                <MI icon="👁️" value={pfb?.reach ?? 0} onChange={v => onFeedbackUpdate(pfkey, { reach: v, platform: plat.toLowerCase() })} />
                <MI icon="❤️" value={pfb?.likes ?? 0} onChange={v => onFeedbackUpdate(pfkey, { likes: v, platform: plat.toLowerCase() })} />
                <MI icon="💬" value={pfb?.comments ?? 0} onChange={v => onFeedbackUpdate(pfkey, { comments: v, platform: plat.toLowerCase() })} />
                <MI icon="📩" value={pfb?.messages ?? 0} onChange={v => onFeedbackUpdate(pfkey, { messages: v, platform: plat.toLowerCase() })} />
                <MI icon="🛒" value={pfb?.conversions ?? 0} onChange={v => onFeedbackUpdate(pfkey, { conversions: v, platform: plat.toLowerCase() })} />
              </div>
            </div>;
          })}
        </div>}
    </div>
  );
}
