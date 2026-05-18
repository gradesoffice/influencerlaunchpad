import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Target, Loader2, Rocket, TrendingUp, Copy, Check, BarChart3, Heart, MessageCircle, Send, ShoppingCart, Crown, Home, Map, FileText, Users, Gauge, Lightbulb, Bell, ChevronRight, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

type FormState = { niche: string; platform: string; audience: string; message: string; conversionGoal: string; tone: string; postsPerDay: number; initialFollowers: number };
type Strategy = { brand: { persona: string; voice: string; visualStyle: string; tagline: string; contentPillars: { name: string; description: string }[]; hashtags: string[]; dosAndDonts: { dos: string[]; donts: string[] } }; phases: { name: string; days: string; objective: string; kpis: string[]; weeklyThemes: string[] }[] };
type WeekPlan = { weekNumber: number; theme: string; focus: string; days: { day: number; dayLabel: string; dailyGoal: string; posts: { slot: string; format: string; hook: string; caption: string; cta: string; hashtags: string[]; visualIdea: string; conversionTie: string }[] }[] };
type Feedback = { likes: number; comments: number; messages: number; conversions: number; note: string; reach: number; posted_at: string | null };
const initial: FormState = { niche: "", platform: "Instagram", audience: "", message: "", conversionGoal: "", tone: "", postsPerDay: 2, initialFollowers: 0 };

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

  useEffect(() => { loadFromDb(); }, []);
  const loadFromDb = async () => {
    try {
      const { data: strats } = await supabase.from("strategies").select("*").order("created_at", { ascending: false }).limit(1);
      if (strats?.length) {
        const s = strats[0]; setStrategyId(s.id); setStrategy({ brand: s.brand as any, phases: s.phases as any });
        setForm({ niche: s.niche, platform: s.platform, audience: s.audience, message: s.message, conversionGoal: s.conversion_goal, tone: s.tone || "", postsPerDay: s.posts_per_day, initialFollowers: s.initial_followers || 0 });
        const { data: savedWeeks } = await supabase.from("weeks").select("week_number, data").eq("strategy_id", s.id);
        if (savedWeeks) { const m: Record<number, WeekPlan> = {}; savedWeeks.forEach(w => m[w.week_number] = w.data as any); setWeeks(m); }
        const { data: savedFb } = await supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note, reach, posted_at").eq("strategy_id", s.id);
        if (savedFb?.length) { const m: Record<string, Feedback> = {}; savedFb.forEach(f => m[`${f.week_number}|${f.day}|${f.slot}`] = f); setFeedback(m); }
      } else { setShowForm(true); }
      // Load user plan
      const { data: planRow } = await supabase.from("user_plans").select("plan, expires_at").limit(1).single();
      if (planRow && (!planRow.expires_at || new Date(planRow.expires_at) > new Date())) {
        setUserPlan(planRow.plan as any);
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

  const buildFeedbackInsights = (): string => {
    const entries = Object.entries(feedback).filter(([, v]) => v.likes + v.comments + v.messages + v.conversions > 0);
    if (!entries.length) return "";
    const enriched = entries.map(([key, v]) => { const [w, d, ...slot] = key.split("|"); const wk = weeks[Number(w)]; const day = wk?.days?.find(x => String(x.day) === d); const post = day?.posts?.find(p => p.slot === slot.join("|")); return { v, post, score: v.conversions * 5 + v.messages * 2 + v.comments * 1.5 + v.likes * 0.1 }; }).filter(x => x.post);
    enriched.sort((a, b) => b.score - a.score);
    return enriched.slice(0, 5).map(e => `Hook: "${e.post!.hook}" | Format: ${e.post!.format} | ${e.v.likes} likes, ${e.v.comments} komen, ${e.v.conversions} konversi`).join("\n");
  };

  const generateStrategy = async () => {
    if (!form.niche || !form.audience || !form.message || !form.conversionGoal) { toast.error("Lengkapi semua field."); return; }
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
      const res = await fetch("/api/week", { method: "POST", headers, body: JSON.stringify({ weekNumber, postsPerDay: form.postsPerDay, niche: form.niche, platform: form.platform, audience: form.audience, message: form.message, conversionGoal: form.conversionGoal, brandSummary, phaseName, weeklyTheme, strategyId, feedbackInsights }) });
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
    const cur = feedback[key] ?? { likes: 0, comments: 0, messages: 0, conversions: 0, note: "" };
    const updated = { ...cur, ...patch }; setFeedback(f => ({ ...f, [key]: updated }));
    if (strategyId) { const [w, d, ...s] = key.split("|"); supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) supabase.from("feedback").upsert({ strategy_id: strategyId, user_id: session.user.id, week_number: Number(w), day: Number(d), slot: s.join("|"), ...updated, updated_at: new Date().toISOString() }, { onConflict: "strategy_id,week_number,day,slot" }); }); }
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
  if (showForm || !strategy) return <FormView form={form} update={update} loading={loadingStrategy} onGenerate={generateStrategy} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen bg-[#faf9f7] flex">
      <Toaster richColors position="top-center" />

      {/* Sidebar - icon focused */}
      <aside className="hidden md:flex w-16 flex-col items-center border-r border-border bg-white py-5 sticky top-0 h-screen">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-6"><Rocket className="h-5 w-5 text-primary" /></div>
        <nav className="space-y-2 flex-1">
          <SideIcon icon={<Home className="h-5 w-5" />} active={activeNav === "home"} onClick={() => setActiveNav("home")} tooltip="Overview" />
          <SideIcon icon={<Map className="h-5 w-5" />} active={activeNav === "roadmap"} onClick={() => setActiveNav("roadmap")} tooltip="Roadmap" />
          <SideIcon icon={<FileText className="h-5 w-5" />} active={activeNav === "konten"} onClick={() => setActiveNav("konten")} tooltip="Konten" />
          <SideIcon icon={<BarChart3 className="h-5 w-5" />} active={activeNav === "analitik"} onClick={() => userPlan !== "free" ? setActiveNav("analitik") : setShowPricing(true)} tooltip="Analitik" locked={userPlan === "free"} />
          <SideIcon icon={<Users className="h-5 w-5" />} active={activeNav === "audiens"} onClick={() => userPlan !== "free" ? setActiveNav("audiens") : setShowPricing(true)} tooltip="Audiens" locked={userPlan === "free"} />
          <SideIcon icon={<Gauge className="h-5 w-5" />} active={activeNav === "kpi"} onClick={() => userPlan !== "free" ? setActiveNav("kpi") : setShowPricing(true)} tooltip="KPI" locked={userPlan === "free"} />
          <SideIcon icon={<Lightbulb className="h-5 w-5" />} active={activeNav === "insight"} onClick={() => userPlan !== "free" ? setActiveNav("insight") : setShowPricing(true)} tooltip="Insight" locked={userPlan === "free"} />
        </nav>
        <div className="space-y-3 mt-4 pt-4 border-t border-border">
          <SideIcon icon={<Crown className="h-5 w-5 text-amber-500" />} active={false} onClick={() => setShowPricing(true)} tooltip="Upgrade" />
          <SideIcon icon={<FileText className="h-5 w-5" />} active={false} onClick={() => navigate("/strategies")} tooltip="Strategi" />
          <button onClick={handleLogout} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold hover:ring-2 ring-primary/20 transition" title="Logout">{(userName || "U")[0].toUpperCase()}</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header - minimal */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{userName || form.niche.split(" ")[0]} 👋</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowForm(true)} title="Edit"><Settings className="h-5 w-5 text-muted-foreground/60 hover:text-primary transition" /></button>
              <button onClick={() => setShowPricing(true)} title="Upgrade"><Crown className="h-5 w-5 text-amber-400" /></button>
            </div>
          </div>

          {/* Plan warning - subtle */}
          {userPlan === "free" && activeNav === "home" && <button onClick={() => setShowPricing(true)} className="w-full text-left rounded-2xl bg-rose-50/80 px-4 py-3 flex items-center gap-3"><span className="text-sm">⚡</span><p className="text-xs text-rose-600 flex-1">Upgrade untuk akses penuh</p><ChevronRight className="h-4 w-4 text-rose-400" /></button>}

          {/* KPI - clean, borderless */}
          {activeNav === "home" && <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm"><Heart className="h-5 w-5 text-rose-400 mx-auto mb-1" /><p className="text-lg font-bold">{totalLikes}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm"><TrendingUp className="h-5 w-5 text-violet-400 mx-auto mb-1" /><p className="text-lg font-bold">{totalReach > 0 ? `${(totalReach / 1000).toFixed(1)}K` : progressPct + "%"}</p><p className="text-[10px] text-muted-foreground">Reach</p></div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm"><Send className="h-5 w-5 text-emerald-400 mx-auto mb-1" /><p className="text-lg font-bold">{totalDM}</p><p className="text-[10px] text-muted-foreground">DM</p></div>
          </div>}

          {/* Phases - clean */}
          {(activeNav === "home" || activeNav === "konten") && strategy.phases.map((phase, pi) => {
            const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
            return (
              <div key={pi} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-primary">Phase {pi + 1} · {phase.name}</p>
                  <p className="text-[10px] text-muted-foreground">W{weekOffset + 1}–{weekOffset + phase.weeklyThemes.length}</p>
                </div>

                {phase.weeklyThemes.map((theme, wi) => {
                  const wn = weekOffset + wi + 1;
                  const done = !!weeks[wn];
                  const isOpen = openWeek === wn;
                  return (
                    <div key={wi}>
                      <button onClick={() => done ? setOpenWeek(isOpen ? null : wn) : generateWeek(wn, phase.name, theme)} className={`w-full rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 text-left transition hover:shadow-md ${isOpen ? "ring-2 ring-primary/20" : ""}`}>
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{loadingWeek === wn ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : wn}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{theme}</p><p className="text-[10px] text-muted-foreground">Hari {(wn-1)*7+1}–{wn*7}</p></div>
                        {!done && <Sparkles className="h-4 w-4 text-primary/50 shrink-0" />}
                      </button>

                      {isOpen && weeks[wn] && <div className="mt-2 space-y-2 pl-12">
                        {weeks[wn].days.map((d, di) => (
                          <div key={di}>
                            {d.posts.map((post, pi2) => {
                              const fkey = `${wn}|${d.day}|${post.slot}`;
                              const isCopied = copiedKey === fkey;
                              const fbOpen = openFeedback === fkey;
                              const fb = feedback[fkey];
                              return (
                                <div key={pi2} className="rounded-xl bg-white/80 p-3 mb-2 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[9px] border-0">{post.format}</Badge></div>
                                  <p className="text-sm font-medium">🪝 {post.hook}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{post.caption}</p>
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={(e) => { e.stopPropagation(); copyPost(fkey, post); }} className="text-[10px] text-muted-foreground hover:text-primary">{isCopied ? "✓ Copied" : "📋 Copy"}</button>
                                    <button onClick={(e) => { e.stopPropagation(); setOpenFeedback(fbOpen ? null : fkey); }} className="text-[10px] text-muted-foreground hover:text-primary">📊 Track</button>
                                  </div>
                                  {fbOpen && <div className="mt-2 grid grid-cols-5 gap-1"><MI icon="👁️" value={fb?.reach ?? 0} onChange={v => updateFeedback(fkey, { reach: v })} /><MI icon="❤️" value={fb?.likes ?? 0} onChange={v => updateFeedback(fkey, { likes: v })} /><MI icon="💬" value={fb?.comments ?? 0} onChange={v => updateFeedback(fkey, { comments: v })} /><MI icon="📩" value={fb?.messages ?? 0} onChange={v => updateFeedback(fkey, { messages: v })} /><MI icon="🛒" value={fb?.conversions ?? 0} onChange={v => updateFeedback(fkey, { conversions: v })} /></div>}
                                </div>
                              );
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

          {/* Progress ring */}
          {activeNav === "home" && <Card className="p-5 flex items-center justify-between">
            <div><p className="text-sm font-semibold">Progress Keseluruhan</p><p className="text-xs text-muted-foreground">{completedWeeks} dari {totalWeeksAvailable} minggu selesai</p></div>
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90"><circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="5" /><circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeDasharray={`${progressPct * 1.63} 163`} strokeLinecap="round" /></svg>
              <span className="absolute text-sm font-bold">{progressPct}%</span>
            </div>
          </Card>}

          {/* Audiens View (Pro) */}
          {activeNav === "audiens" && <AudiensView niche={form.niche} audience={form.audience} platform={form.platform} />}

          {/* KPI Tracker View (Pro) */}
          {activeNav === "kpi" && <KPIView feedback={fbVals} totalWeeks={completedWeeks} />}

          {/* Insight View (Pro) */}
          {activeNav === "insight" && <InsightView feedback={fbVals} weeks={weeks} weekData={Object.values(weeks)} />}

          {/* Analitik View (Pro) */}
          {activeNav === "analitik" && <AnalitikInline strategyId={strategyId} />}

          {/* Roadmap View */}
          {activeNav === "roadmap" && strategy && <RoadmapView strategy={strategy} weeks={weeks} completedWeeks={completedWeeks} totalWeeksAvailable={totalWeeksAvailable} />}
        </div>
      </main>

      {/* Mobile bottom nav - clean */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-border/50 px-4 py-2 z-20">
        <div className="flex items-center justify-around">
          <button onClick={() => setActiveNav("home")} className={`p-2 rounded-xl transition ${activeNav === "home" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><Home className="h-5 w-5" /></button>
          <button onClick={() => setActiveNav("roadmap")} className={`p-2 rounded-xl transition ${activeNav === "roadmap" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><Map className="h-5 w-5" /></button>
          <button onClick={() => setActiveNav("konten")} className={`p-2 rounded-xl transition ${activeNav === "konten" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}><FileText className="h-5 w-5" /></button>
          <button onClick={() => userPlan !== "free" ? setActiveNav("analitik") : setShowPricing(true)} className={`p-2 rounded-xl transition ${activeNav === "analitik" ? "text-primary bg-primary/10" : "text-muted-foreground/50"}`}><BarChart3 className="h-5 w-5" /></button>
          <button onClick={() => setShowPricing(true)} className="p-2 rounded-xl text-amber-400"><Crown className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="md:hidden h-14" />

      {/* Pricing Modal */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onUpgrade={() => { setShowPricing(false); navigate("/pricing"); }} />}
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

function FormView({ form, update, loading, onGenerate, onLogout }: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void; loading: boolean; onGenerate: () => void; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#faf9f7] p-6">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-2 font-bold"><Rocket className="h-5 w-5 text-primary" />Launchpad</div><button onClick={onLogout} className="text-xs text-muted-foreground">Logout</button></div>
        <h1 className="text-2xl font-bold mb-1">Buat Strategi Baru</h1>
        <p className="text-sm text-muted-foreground mb-6">Isi profil akun medsos kamu.</p>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label className="text-sm">Niche / Topik</Label><Input value={form.niche} onChange={e => update("niche", e.target.value)} placeholder="Coaching produktivitas" /></div>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-sm">Platform</Label><select value={form.platform} onChange={e => update("platform", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option></select></div><div className="grid gap-1.5"><Label className="text-sm">Konten/hari</Label><Input type="number" min={1} max={10} value={form.postsPerDay} onChange={e => update("postsPerDay", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} /></div></div>
          <div className="grid gap-1.5"><Label className="text-sm">Target Audiens</Label><Textarea rows={2} value={form.audience} onChange={e => update("audience", e.target.value)} placeholder="Freelancer 22-35 thn" /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Pesan Utama</Label><Textarea rows={2} value={form.message} onChange={e => update("message", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Tujuan Konversi</Label><Input value={form.conversionGoal} onChange={e => update("conversionGoal", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-sm">Tone (opsional)</Label><Input value={form.tone} onChange={e => update("tone", e.target.value)} /></div><div className="grid gap-1.5"><Label className="text-sm">Followers saat ini</Label><Input type="number" min={0} value={form.initialFollowers} onChange={e => update("initialFollowers", Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" /></div></div>
          <Button onClick={onGenerate} disabled={loading} size="lg" className="h-12 text-base font-semibold text-primary-foreground mt-2" style={{ background: "var(--gradient-hero)" }}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Rocket className="mr-2 h-5 w-5" />Generate Roadmap</>}</Button>
        </div>
      </div>
    </div>
  );
}


function PF({ text }: { text: string }) { return <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span>{text}</span></div>; }
function PL({ text }: { text: string }) { return <div className="flex items-center gap-2 text-muted-foreground"><span className="h-3.5 w-3.5 shrink-0 text-center">—</span><span>{text}</span></div>; }

// === PRO VIEWS ===
function AudiensView({ niche, audience, platform }: { niche: string; audience: string; platform: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5 text-emerald-500" />Audiens Kamu</h2>
      <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Target Audiens</p><p className="text-sm">{audience}</p></Card>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Platform</p><p className="text-lg font-bold">{platform}</p></Card>
        <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Niche</p><p className="text-lg font-bold truncate">{niche}</p></Card>
      </div>
      <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Rekomendasi AI</p>
        <div className="space-y-2 text-sm">
          <p>📌 Fokus pada pain points utama audiens kamu</p>
          <p>📌 Gunakan bahasa yang relatable</p>
          <p>📌 Posting di jam aktif audiens (7-9 pagi, 19-21 malam)</p>
          <p>📌 Variasikan format: edukasi 40%, story 30%, CTA 30%</p>
        </div>
      </Card>
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

function InsightView({ feedback, weekData }: { feedback: Feedback[]; weeks: Record<number, WeekPlan>; weekData: WeekPlan[] }) {
  const topFormats: Record<string, { count: number; likes: number; comments: number; messages: number }> = {};
  weekData.forEach(w => w.days?.forEach(d => d.posts?.forEach(p => {
    if (!topFormats[p.format]) topFormats[p.format] = { count: 0, likes: 0, comments: 0, messages: 0 };
    topFormats[p.format].count++;
  })));
  // Enrich with feedback data per format
  feedback.forEach(f => {
    // We can't perfectly map feedback to format without week data cross-ref, so aggregate totals
  });
  const sorted = Object.entries(topFormats).sort((a, b) => b[1].count - a[1].count);
  const totalEng = feedback.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
  const totalConv = feedback.reduce((s, f) => s + f.conversions, 0);
  const totalReach = feedback.reduce((s, f) => s + (f.reach || 0), 0);

  // Historical comparison (last half vs first half of feedback)
  const half = Math.floor(feedback.length / 2);
  const firstHalf = feedback.slice(0, half);
  const secondHalf = feedback.slice(half);
  const engFirst = firstHalf.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
  const engSecond = secondHalf.reduce((s, f) => s + f.likes + f.comments + f.messages, 0);
  const engChange = engFirst > 0 ? Math.round(((engSecond - engFirst) / engFirst) * 100) : 0;
  const convFirst = firstHalf.reduce((s, f) => s + f.conversions, 0);
  const convSecond = secondHalf.reduce((s, f) => s + f.conversions, 0);
  const convChange = convFirst > 0 ? Math.round(((convSecond - convFirst) / convFirst) * 100) : 0;

  // Best posting times
  const hourCounts: Record<number, number> = {};
  feedback.forEach(f => { if (f.posted_at) { const h = new Date(f.posted_at).getHours(); hourCounts[h] = (hourCounts[h] ?? 0) + f.likes + f.comments + f.messages; } });
  const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" />AI Insights</h2>

      {/* Historical comparison */}
      {feedback.length >= 4 && <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-3">📈 Perbandingan Periode</p>
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 ${engChange >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}><p className="text-xs text-muted-foreground">Engagement</p><p className="text-lg font-bold">{engChange >= 0 ? "+" : ""}{engChange}%</p><p className="text-[10px] text-muted-foreground">{engChange >= 0 ? "↑ Naik" : "↓ Turun"} vs periode lalu</p></div>
          <div className={`rounded-lg p-3 ${convChange >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}><p className="text-xs text-muted-foreground">Konversi</p><p className="text-lg font-bold">{convChange >= 0 ? "+" : ""}{convChange}%</p><p className="text-[10px] text-muted-foreground">{convChange >= 0 ? "↑ Naik" : "↓ Turun"} vs periode lalu</p></div>
        </div>
      </Card>}

      {/* Best time */}
      {bestHour && <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-2">⏰ Waktu Terbaik Posting</p><p className="text-sm">Jam <strong>{bestHour[0]}:00</strong> menghasilkan engagement tertinggi ({bestHour[1]} total interaksi)</p></Card>}

      {/* Format breakdown */}
      <Card className="p-5 space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">💡 Saran AI</p>
        {sorted[0] && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3"><p className="text-sm text-emerald-800">✅ Format terbaik: <strong>{sorted[0][0]}</strong> ({sorted[0][1].count} konten)</p></div>}
        {sorted[1] && <div className="rounded-lg bg-blue-50 border border-blue-200 p-3"><p className="text-sm text-blue-800">💡 Variasikan dengan <strong>{sorted[1][0]}</strong></p></div>}
        {totalReach > 0 && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3"><p className="text-sm text-amber-800">🎯 CR: {((totalConv / totalReach) * 100).toFixed(2)}% | ER: {((totalEng / totalReach) * 100).toFixed(1)}%</p></div>}
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3"><p className="text-sm text-rose-800">🔥 Konsistensi = growth. Posting setiap hari di jam yang sama.</p></div>
      </Card>

      {sorted.length > 0 && <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Format Distribution</p>
        <div className="space-y-2">{sorted.slice(0, 5).map(([fmt, data], i) => <div key={i} className="flex items-center gap-3"><span className="text-xs w-20 truncate">{fmt}</span><div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(data.count / (sorted[0][1].count)) * 100}%` }} /></div><span className="text-xs text-muted-foreground">{data.count}</span></div>)}</div>
      </Card>}
    </div>
  );
}


function RoadmapView({ strategy, weeks, completedWeeks, totalWeeksAvailable }: { strategy: Strategy; weeks: Record<number, WeekPlan>; completedWeeks: number; totalWeeksAvailable: number }) {
  const currentWeek = completedWeeks + 1;
  // Dynamic milestones based on phase boundaries
  const milestones: Record<number, string> = {};
  let offset = 0;
  strategy.phases.forEach((phase, i) => {
    const lastWeek = offset + phase.weeklyThemes.length;
    milestones[lastWeek] = `✓ ${phase.name} selesai`;
    offset = lastWeek;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><Map className="h-5 w-5 text-primary" />Roadmap</h2>
        <Badge variant="outline">{completedWeeks}/{totalWeeksAvailable} minggu</Badge>
      </div>

      {/* Timeline */}
      <div className="relative">
        {strategy.phases.map((phase, pi) => {
          const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
          const phaseWeeks = phase.weeklyThemes.length;
          return (
            <div key={pi} className="mb-8">
              {/* Phase header */}
              <Card className="p-4 mb-4 border-l-4 border-l-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">Phase {pi + 1} · {phase.days}</p>
                    <h3 className="font-bold">{phase.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{phase.objective}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">KPI Target</p>
                    <div className="flex flex-wrap gap-1 justify-end mt-1">{phase.kpis.slice(0, 2).map((k, i) => <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>)}</div>
                  </div>
                </div>
              </Card>

              {/* Week timeline */}
              <div className="ml-4 border-l-2 border-border pl-6 space-y-3">
                {phase.weeklyThemes.map((theme, wi) => {
                  const wn = weekOffset + wi + 1;
                  const done = !!weeks[wn];
                  const isCurrent = wn === currentWeek;
                  const milestone = milestones[wn];
                  return (
                    <div key={wi} className="relative">
                      {/* Dot on timeline */}
                      <div className={`absolute -left-[31px] top-2 h-4 w-4 rounded-full border-2 ${done ? "bg-primary border-primary" : isCurrent ? "bg-white border-primary ring-4 ring-primary/20" : "bg-muted border-border"}`}>
                        {done && <Check className="h-2.5 w-2.5 text-white absolute top-0.5 left-0.5" />}
                      </div>

                      {/* Current indicator */}
                      {isCurrent && <div className="absolute -left-[70px] top-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">KAMU</div>}

                      {/* Week card */}
                      <div className={`rounded-lg border p-3 ${isCurrent ? "border-primary bg-primary/5" : done ? "border-border bg-white" : "border-border/50 bg-muted/30"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Minggu {wn} · Hari {(wn-1)*7+1}–{wn*7}</p>
                            <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>{theme}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {done && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✅ Selesai</Badge>}
                            {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">🔄 Aktif</Badge>}
                            {!done && !isCurrent && <Badge variant="outline" className="text-[10px] text-muted-foreground">⬜ Belum</Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Milestone */}
                      {milestone && <div className="mt-2 ml-2 flex items-center gap-2"><span className="text-xs">🏆</span><p className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{milestone}</p></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalitikInline({ strategyId }: { strategyId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<WeekPlan[]>([]);
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);

  useEffect(() => {
    if (!strategyId) { setLoading(false); return; }
    (async () => {
      const [{ data: w }, { data: f }] = await Promise.all([
        supabase.from("weeks").select("week_number, data").eq("strategy_id", strategyId).order("week_number"),
        supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note").eq("strategy_id", strategyId),
      ]);
      setWeekData((w ?? []).map((x: any) => x.data));
      setFeedbackData((f ?? []) as any);
      setLoading(false);
    })();
  }, [strategyId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const totals = feedbackData.reduce((a: any, f: any) => ({ posts: a.posts + 1, likes: a.likes + f.likes, comments: a.comments + f.comments, messages: a.messages + f.messages, conversions: a.conversions + f.conversions }), { posts: 0, likes: 0, comments: 0, messages: 0, conversions: 0 });
  const totalPosts = weekData.reduce((s, w) => s + (w?.days?.reduce((a: number, d: any) => a + (d.posts?.length ?? 0), 0) ?? 0), 0);
  const avgEng = totals.posts > 0 ? Math.round((totals.likes + totals.comments + totals.messages) / totals.posts) : 0;

  const formatCounts: Record<string, number> = {};
  weekData.forEach((w: any) => w?.days?.forEach((d: any) => d.posts?.forEach((p: any) => { formatCounts[p.format || "Lainnya"] = (formatCounts[p.format || "Lainnya"] ?? 0) + 1; })));
  const sorted = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Analitik</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Konten</p><p className="text-2xl font-bold">{totalPosts}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Likes</p><p className="text-2xl font-bold text-rose-500">{totals.likes}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Avg Engagement</p><p className="text-2xl font-bold text-primary">{avgEng}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Konversi</p><p className="text-2xl font-bold text-emerald-500">{totals.conversions}</p></Card>
      </div>
      {sorted.length > 0 && <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Format Distribution</p>
        <div className="space-y-2">{sorted.slice(0, 6).map(([fmt, count], i) => <div key={i} className="flex items-center gap-3"><span className="text-xs w-24 truncate">{fmt}</span><div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(count / (sorted[0][1])) * 100}%`, background: ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4"][i % 6] }} /></div><span className="text-xs text-muted-foreground font-medium">{count}</span></div>)}</div>
      </Card>}
      {totals.posts > 0 && <Card className="p-5"><p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Performa Detail</p>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted-foreground">Total DM</p><p className="text-xl font-bold">{totals.messages}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Komentar</p><p className="text-xl font-bold">{totals.comments}</p></div>
          <div><p className="text-xs text-muted-foreground">Conversion Rate</p><p className="text-xl font-bold">{totals.posts > 0 ? ((totals.conversions / totals.posts) * 100).toFixed(1) : 0}%</p></div>
          <div><p className="text-xs text-muted-foreground">Konten Tercatat</p><p className="text-xl font-bold">{totals.posts}</p></div>
        </div>
      </Card>}
      {totals.posts === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">Catat performa konten di tab Konten untuk melihat analitik.</p></Card>}
    </div>
  );
}
