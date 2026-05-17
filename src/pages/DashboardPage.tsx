import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Target, Loader2, Rocket, TrendingUp, Copy, Check, BarChart3, Heart, MessageCircle, Send, ShoppingCart, Crown, Home, Map, FileText, Users, Gauge, Lightbulb, Bell, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

type FormState = { niche: string; platform: string; audience: string; message: string; conversionGoal: string; tone: string; postsPerDay: number };
type Strategy = { brand: { persona: string; voice: string; visualStyle: string; tagline: string; contentPillars: { name: string; description: string }[]; hashtags: string[]; dosAndDonts: { dos: string[]; donts: string[] } }; phases: { name: string; days: string; objective: string; kpis: string[]; weeklyThemes: string[] }[] };
type WeekPlan = { weekNumber: number; theme: string; focus: string; days: { day: number; dayLabel: string; dailyGoal: string; posts: { slot: string; format: string; hook: string; caption: string; cta: string; hashtags: string[]; visualIdea: string; conversionTie: string }[] }[] };
type Feedback = { likes: number; comments: number; messages: number; conversions: number; note: string };
const initial: FormState = { niche: "", platform: "Instagram", audience: "", message: "", conversionGoal: "", tone: "", postsPerDay: 2 };

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

  useEffect(() => { loadFromDb(); }, []);
  const loadFromDb = async () => {
    try {
      const { data: strats } = await supabase.from("strategies").select("*").order("created_at", { ascending: false }).limit(1);
      if (strats?.length) {
        const s = strats[0]; setStrategyId(s.id); setStrategy({ brand: s.brand as any, phases: s.phases as any });
        setForm({ niche: s.niche, platform: s.platform, audience: s.audience, message: s.message, conversionGoal: s.conversion_goal, tone: s.tone || "", postsPerDay: s.posts_per_day });
        const { data: savedWeeks } = await supabase.from("weeks").select("week_number, data").eq("strategy_id", s.id);
        if (savedWeeks) { const m: Record<number, WeekPlan> = {}; savedWeeks.forEach(w => m[w.week_number] = w.data as any); setWeeks(m); }
        const { data: savedFb } = await supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note").eq("strategy_id", s.id);
        if (savedFb?.length) { const m: Record<string, Feedback> = {}; savedFb.forEach(f => m[`${f.week_number}|${f.day}|${f.slot}`] = f); setFeedback(m); }
      } else { setShowForm(true); }
    } catch (e) { console.error(e); }
    setInitialLoading(false);
  };
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(s => ({ ...s, [k]: v }));
  const getAuthHeaders = async () => { const { data: { session } } = await supabase.auth.getSession(); const h: Record<string, string> = { "Content-Type": "application/json" }; if (session?.access_token) h["Authorization"] = `Bearer ${session.access_token}`; return h; };
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  const generateStrategy = async () => {
    if (!form.niche || !form.audience || !form.message || !form.conversionGoal) { toast.error("Lengkapi semua field."); return; }
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
      const res = await fetch("/api/week", { method: "POST", headers, body: JSON.stringify({ weekNumber, postsPerDay: form.postsPerDay, niche: form.niche, platform: form.platform, audience: form.audience, message: form.message, conversionGoal: form.conversionGoal, brandSummary, phaseName, weeklyTheme, strategyId, feedbackInsights: "" }) });
      if (!res.ok) { const e = await res.json().catch(() => null); if (e?.code) { setShowPricing(true); } else throw new Error("Gagal"); return; }
      const data = await res.json(); setWeeks(w => ({ ...w, [weekNumber]: data })); setOpenWeek(weekNumber);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } finally { setLoadingWeek(null); }
  };
  const copyPost = async (key: string, post: WeekPlan["days"][0]["posts"][0]) => {
    const text = `${post.hook}\n\n${post.caption}\n\n${post.cta}\n\n${post.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`;
    try { await navigator.clipboard.writeText(text); setCopiedKey(key); toast.success("Disalin!"); setTimeout(() => setCopiedKey(null), 2000); } catch { toast.error("Gagal"); }
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

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (showForm || !strategy) return <FormView form={form} update={update} loading={loadingStrategy} onGenerate={generateStrategy} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen bg-[#faf9f7] flex">
      <Toaster richColors position="top-center" />

      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-white p-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8"><div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Rocket className="h-4 w-4 text-primary" /></div><span className="font-bold text-sm">Influencer<br/>Launchpad</span></div>
        <nav className="space-y-1 flex-1">
          <NavItem icon={<Home className="h-4 w-4" />} label="Overview" active={activeNav === "home"} onClick={() => setActiveNav("home")} />
          <NavItem icon={<Map className="h-4 w-4" />} label="Roadmap" active={activeNav === "roadmap"} onClick={() => setActiveNav("roadmap")} />
          <NavItem icon={<FileText className="h-4 w-4" />} label="Konten" active={activeNav === "konten"} onClick={() => { setActiveNav("konten"); if (Object.keys(weeks).length) setOpenWeek(Number(Object.keys(weeks)[0])); }} />
          <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Analitik" active={false} onClick={() => navigate("/analytics")} locked />
          <NavItem icon={<Users className="h-4 w-4" />} label="Audiens" active={false} onClick={() => setShowPricing(true)} locked />
          <NavItem icon={<Gauge className="h-4 w-4" />} label="KPI Tracker" active={false} onClick={() => setShowPricing(true)} locked />
          <NavItem icon={<Lightbulb className="h-4 w-4" />} label="Insight" active={false} onClick={() => setShowPricing(true)} locked />
        </nav>
        {/* Save count */}
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-1">Sisa Save Count</p>
          <p className="text-3xl font-bold text-primary">100<span className="text-sm font-normal text-muted-foreground">/post</span></p>
          <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: "70%" }} /></div>
          <Badge className="mt-3 bg-primary/10 text-primary border-0">Free Plan</Badge>
        </div>
        {/* Profile */}
        <button onClick={handleLogout} className="flex items-center gap-3 mt-4 pt-4 border-t border-border w-full text-left">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{form.niche[0]?.toUpperCase() || "U"}</div>
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{form.niche || "User"}</p><p className="text-xs text-muted-foreground">Logout</p></div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div><p className="text-sm text-muted-foreground">Hai, {form.niche.split(" ")[0]} 👋</p><h1 className="text-xl md:text-2xl font-bold">Yuk, bangun brand yang dipercaya.</h1><p className="text-xs text-muted-foreground mt-0.5">Rencana konten terstruktur untuk hasil maksimal.</p></div>
            <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-muted-foreground" /><Button size="sm" variant="outline" className="gap-2 text-primary border-primary/30" onClick={() => setShowPricing(true)}><Crown className="h-4 w-4" />Upgrade</Button></div>
          </div>

          {/* Plan limit warning */}
          <div className="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 mb-6">
            <p className="text-sm text-rose-700">⚠️ Plan kamu hanya sampai minggu 1. Upgrade untuk akses lebih.</p>
            <Button size="sm" className="bg-primary text-primary-foreground shrink-0" onClick={() => setShowPricing(true)}>Upgrade Sekarang</Button>
          </div>

          {/* KPI Cards */}
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold">KPI Utama Minggu Ini</p><p className="text-xs text-muted-foreground">Periode: Minggu {completedWeeks || 1}</p></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center"><Heart className="h-5 w-5 text-rose-500" /></div><div><p className="text-xs text-muted-foreground">Likes</p><p className="text-xl font-bold">{totalLikes}</p></div></div>
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-violet-500" /></div><div><p className="text-xs text-muted-foreground">Reach</p><p className="text-xl font-bold">{progressPct}% <span className="text-xs text-emerald-500">↑</span></p></div></div>
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Send className="h-5 w-5 text-emerald-500" /></div><div><p className="text-xs text-muted-foreground">DM / Hari</p><p className="text-xl font-bold">{totalDM}</p></div></div>
            </div>
          </Card>

          {/* Phases */}
          {strategy.phases.map((phase, pi) => {
            const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
            return (
              <div key={pi} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-xs font-semibold uppercase text-primary">Phase {pi + 1} · {phase.days}</p><h2 className="text-lg font-bold">{phase.name}</h2><p className="text-xs text-muted-foreground">{phase.objective}</p></div>
                  <p className="text-xs text-primary font-medium">Minggu {weekOffset + 1}–{weekOffset + phase.weeklyThemes.length}</p>
                </div>

                {/* Week list */}
                <div className="space-y-3">
                  {phase.weeklyThemes.map((theme, wi) => {
                    const wn = weekOffset + wi + 1;
                    const done = !!weeks[wn];
                    const isOpen = openWeek === wn;
                    return (
                      <div key={wi}>
                        <Card className={`p-4 cursor-pointer hover:shadow-md transition ${isOpen ? "ring-1 ring-primary" : ""}`} onClick={() => done ? setOpenWeek(isOpen ? null : wn) : generateWeek(wn, phase.name, theme)}>
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-rose-100 text-rose-600"}`}>W{wn}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Minggu {wn} · Hari {(wn-1)*7+1}–{wn*7}</p>
                              <p className="font-semibold text-sm truncate">{theme}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {done && <Badge variant="outline" className="text-[10px]">KPI: {phase.kpis[0]}</Badge>}
                              {loadingWeek === wn ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : done ? <ChevronRight className="h-4 w-4" /> : <Button size="sm" variant="outline" className="text-xs text-primary border-primary/30 gap-1"><Sparkles className="h-3 w-3" />Generate</Button>}
                            </div>
                          </div>
                        </Card>

                        {/* Expanded week */}
                        {isOpen && weeks[wn] && (
                          <Card className="mt-2 p-4 bg-white border-l-4 border-l-primary">
                            <p className="text-xs text-muted-foreground mb-3"><strong>Fokus:</strong> {weeks[wn].focus}</p>
                            {weeks[wn].days.map((d, di) => (
                              <div key={di} className="mb-3 last:mb-0">
                                <p className="text-xs font-semibold text-primary mb-1">Hari {d.day}</p>
                                {d.posts.map((post, pi2) => {
                                  const fkey = `${wn}|${d.day}|${post.slot}`;
                                  const fb = feedback[fkey]; const isCopied = copiedKey === fkey; const fbOpen = openFeedback === fkey;
                                  return (
                                    <div key={pi2} className="rounded-lg border border-border p-3 mb-2 bg-[#faf9f7]">
                                      <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[10px]">{post.format}</Badge><Badge variant="outline" className="text-[10px]">{post.slot}</Badge></div>
                                      <p className="text-sm font-semibold">🪝 {post.hook}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.caption}</p>
                                      <p className="text-xs mt-1"><strong>CTA:</strong> {post.cta}</p>
                                      <div className="flex gap-2 mt-2">
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyPost(fkey, post); }} className="h-6 text-[10px] px-2">{isCopied ? "✓" : "Salin"}</Button>
                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpenFeedback(fbOpen ? null : fkey); }} className="h-6 text-[10px] px-2">Performa</Button>
                                      </div>
                                      {fbOpen && <div className="mt-2 grid grid-cols-4 gap-1"><MI icon="❤️" value={fb?.likes ?? 0} onChange={v => updateFeedback(fkey, { likes: v })} /><MI icon="💬" value={fb?.comments ?? 0} onChange={v => updateFeedback(fkey, { comments: v })} /><MI icon="📩" value={fb?.messages ?? 0} onChange={v => updateFeedback(fkey, { messages: v })} /><MI icon="🛒" value={fb?.conversions ?? 0} onChange={v => updateFeedback(fkey, { conversions: v })} /></div>}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </Card>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Phase KPI badges */}
                <div className="flex gap-3 mt-4 overflow-x-auto">
                  {phase.kpis.map((k, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shrink-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-rose-100" : i === 1 ? "bg-violet-100" : "bg-emerald-100"}`}><TrendingUp className={`h-4 w-4 ${i === 0 ? "text-rose-500" : i === 1 ? "text-violet-500" : "text-emerald-500"}`} /></div>
                      <div><p className="text-[10px] text-muted-foreground">KPI {i + 1}</p><p className="text-xs font-medium">{k}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Progress ring */}
          <Card className="p-5 flex items-center justify-between">
            <div><p className="text-sm font-semibold">Progress Keseluruhan</p><p className="text-xs text-muted-foreground">{completedWeeks} dari {totalWeeksAvailable} minggu selesai</p></div>
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90"><circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="5" /><circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeDasharray={`${progressPct * 1.63} 163`} strokeLinecap="round" /></svg>
              <span className="absolute text-sm font-bold">{progressPct}%</span>
            </div>
          </Card>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-2 py-2 z-20">
        <div className="flex items-center justify-around">
          <button onClick={() => setActiveNav("home")} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeNav === "home" ? "text-primary" : "text-muted-foreground"}`}><Home className="h-5 w-5" /><span className="text-[10px]">Home</span></button>
          <button onClick={() => setActiveNav("roadmap")} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeNav === "roadmap" ? "text-primary" : "text-muted-foreground"}`}><Map className="h-5 w-5" /><span className="text-[10px]">Roadmap</span></button>
          <button onClick={() => navigate("/analytics")} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-muted-foreground"><BarChart3 className="h-5 w-5" /><span className="text-[10px]">Analitik</span></button>
          <button onClick={() => setShowPricing(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-muted-foreground"><Crown className="h-5 w-5 text-amber-500" /><span className="text-[10px]">Upgrade</span></button>
        </div>
      </div>
      {/* Mobile bottom spacer */}
      <div className="md:hidden h-16" />

      {/* Pricing Modal */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onUpgrade={() => { setShowPricing(false); navigate("/pricing"); }} />}
    </div>
  );
}

// === Sub-components ===
function NavItem({ icon, label, active, onClick, locked }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; locked?: boolean }) {
  return <button onClick={onClick} className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition ${active ? "bg-primary/10 text-primary font-medium" : locked ? "text-muted-foreground/50 cursor-pointer" : "text-muted-foreground hover:bg-muted"}`}>{icon}<span className="flex-1 text-left">{label}</span>{locked && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground/50">Pro</Badge>}</button>;
}

function MI({ icon, value, onChange }: { icon: string; value: number; onChange: (v: number) => void }) {
  return <div className="text-center"><p className="text-[10px]">{icon}</p><Input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="h-6 text-[10px] text-center px-0.5" /></div>;
}

function PricingModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted"><X className="h-4 w-4" /></button>
        <div className="text-center mb-5"><div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Crown className="h-6 w-6 text-primary" /></div><h2 className="text-lg font-bold">Upgrade untuk akses lebih</h2><p className="text-sm text-muted-foreground mt-1">Fitur tanpa batas dan hasil maksimal.</p></div>
        <div className="rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-center mb-5"><p className="text-xs text-rose-700">⚠️ Batas plan Gratis tercapai.</p></div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-4"><p className="font-bold mb-1">Free</p><p className="text-xl font-bold mb-2">Gratis</p><p className="text-xs text-muted-foreground">1 strategi, 1 minggu</p><Button variant="outline" className="w-full mt-3 h-9 text-xs" onClick={onClose}>Lanjut Gratis</Button></Card>
          <Card className="p-4 border-primary"><Badge className="mb-1 bg-primary text-primary-foreground text-[10px]">Popular</Badge><p className="font-bold mb-1">Pro</p><p className="text-xl font-bold mb-2">99rb<span className="text-xs font-normal">/bln</span></p><p className="text-xs text-muted-foreground">Unlimited + analytics</p><Button className="w-full mt-3 h-9 text-xs text-primary-foreground" style={{ background: "var(--gradient-hero)" }} onClick={onUpgrade}>Upgrade</Button></Card>
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
          <div className="grid gap-1.5"><Label className="text-sm">Tone (opsional)</Label><Input value={form.tone} onChange={e => update("tone", e.target.value)} /></div>
          <Button onClick={onGenerate} disabled={loading} size="lg" className="h-12 text-base font-semibold text-primary-foreground mt-2" style={{ background: "var(--gradient-hero)" }}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Rocket className="mr-2 h-5 w-5" />Generate Roadmap</>}</Button>
        </div>
      </div>
    </div>
  );
}
