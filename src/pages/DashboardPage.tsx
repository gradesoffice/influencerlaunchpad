// This file re-exports the dashboard from the existing route component
// We strip TanStack Router specifics and use react-router-dom
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Target, Users, Megaphone, Calendar, Loader2, ChevronDown, ChevronRight, Rocket, TrendingUp, Hash, CheckCircle2, XCircle, Copy, Check, BarChart3, Heart, MessageCircle, Send, ShoppingCart } from "lucide-react";
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
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [formOpen, setFormOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => { loadFromDb(); }, []);

  const loadFromDb = async () => {
    try {
      const { data: strats } = await supabase.from("strategies").select("*").order("created_at", { ascending: false }).limit(1);
      if (strats?.length) {
        const s = strats[0];
        setStrategyId(s.id); setStrategy({ brand: s.brand as any, phases: s.phases as any });
        setForm({ niche: s.niche, platform: s.platform, audience: s.audience, message: s.message, conversionGoal: s.conversion_goal, tone: s.tone || "", postsPerDay: s.posts_per_day });
        setFormOpen(false);
        const { data: savedWeeks } = await supabase.from("weeks").select("week_number, data").eq("strategy_id", s.id);
        if (savedWeeks) { const m: Record<number, WeekPlan> = {}; savedWeeks.forEach(w => m[w.week_number] = w.data as any); setWeeks(m); }
        const { data: savedFb } = await supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions, note").eq("strategy_id", s.id);
        if (savedFb?.length) { const m: Record<string, Feedback> = {}; savedFb.forEach(f => m[`${f.week_number}|${f.day}|${f.slot}`] = f); setFeedback(m); }
      }
    } catch (e) { console.error(e); }
    setInitialLoading(false);
  };

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(s => ({ ...s, [k]: v }));

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) h["Authorization"] = `Bearer ${session.access_token}`;
    return h;
  };

  const generateStrategy = async () => {
    if (!form.niche || !form.audience || !form.message || !form.conversionGoal) { toast.error("Lengkapi semua field."); return; }
    setLoadingStrategy(true); setStrategy(null); setStrategyId(null); setWeeks({});
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/strategy", { method: "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json().catch(() => null); if (e?.code === "PLAN_LIMIT" || e?.code === "RATE_LIMIT") { toast.error(e.error, { action: { label: "Upgrade", onClick: () => navigate("/pricing") } }); } else throw new Error(e?.error || "Gagal"); return; }
      const data = await res.json();
      setStrategy(data); setStrategyId(data.strategyId ?? null);
      toast.success("Strategi siap!"); setFormOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
    finally { setLoadingStrategy(false); }
  };

  const generateWeek = async (weekNumber: number, phaseName: string, weeklyTheme: string) => {
    if (!strategy) return;
    setLoadingWeek(weekNumber);
    try {
      const brandSummary = `Persona: ${strategy.brand.persona}\nVoice: ${strategy.brand.voice}\nVisual: ${strategy.brand.visualStyle}\nTagline: ${strategy.brand.tagline}\nPillars: ${strategy.brand.contentPillars.map(p => p.name).join(", ")}`;
      const headers = await getAuthHeaders();
      const res = await fetch("/api/week", { method: "POST", headers, body: JSON.stringify({ weekNumber, postsPerDay: form.postsPerDay, niche: form.niche, platform: form.platform, audience: form.audience, message: form.message, conversionGoal: form.conversionGoal, brandSummary, phaseName, weeklyTheme, strategyId }) });
      if (!res.ok) { const e = await res.json().catch(() => null); if (e?.code) toast.error(e.error); else throw new Error("Gagal"); return; }
      const data = await res.json();
      setWeeks(w => ({ ...w, [weekNumber]: data })); setOpenWeek(weekNumber);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
    finally { setLoadingWeek(null); }
  };

  const updateFeedback = (key: string, patch: Partial<Feedback>) => {
    const cur = feedback[key] ?? { likes: 0, comments: 0, messages: 0, conversions: 0, note: "" };
    const updated = { ...cur, ...patch };
    setFeedback(f => ({ ...f, [key]: updated }));
    if (strategyId) {
      const [w, d, ...slotParts] = key.split("|");
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) supabase.from("feedback").upsert({ strategy_id: strategyId, user_id: session.user.id, week_number: Number(w), day: Number(d), slot: slotParts.join("|"), ...updated, updated_at: new Date().toISOString() }, { onConflict: "strategy_id,week_number,day,slot" });
      });
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-soft)" }}><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <Toaster richColors position="top-center" />
      {/* Nav */}
      <nav className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg"><Sparkles className="h-5 w-5 text-primary" /> Launchpad</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/strategies" className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Strategi</Link>
          <Link to="/analytics" className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Analytics</Link>
          <Link to="/pricing" className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Pricing</Link>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Logout</button>
        </div>
      </nav>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-6 pb-12 text-sm">
        <Card className="overflow-hidden shadow-xl" style={{ boxShadow: "var(--shadow-card)" }}>
          {strategy && <button onClick={() => setFormOpen(o => !o)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition border-b border-border"><div className="flex items-center gap-3"><Megaphone className="h-4 w-4 text-primary" /><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Profil akun</p><p className="font-semibold">{form.niche || "Detail akun"}</p></div></div>{formOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button>}
          {(!strategy || formOpen) && (
          <div className="grid gap-5 p-8">
            <div className="grid gap-1.5"><Label className="flex items-center gap-2 text-sm"><Megaphone className="h-4 w-4" />Niche</Label><Input value={form.niche} onChange={e => update("niche", e.target.value)} placeholder="Contoh: Coaching produktivitas" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-sm">Platform</Label><select value={form.platform} onChange={e => update("platform", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option></select></div>
              <div className="grid gap-1.5"><Label className="text-sm">Konten/hari</Label><Input type="number" min={1} max={10} value={form.postsPerDay} onChange={e => update("postsPerDay", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-sm"><Users className="h-4 w-4 inline mr-1" />Target audiens</Label><Textarea rows={2} value={form.audience} onChange={e => update("audience", e.target.value)} placeholder="Freelancer 22-35 thn" /></div>
            <div className="grid gap-1.5"><Label className="text-sm"><Sparkles className="h-4 w-4 inline mr-1" />Pesan</Label><Textarea rows={2} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Pesan utama kamu" /></div>
            <div className="grid gap-1.5"><Label className="text-sm"><Target className="h-4 w-4 inline mr-1" />Tujuan konversi</Label><Input value={form.conversionGoal} onChange={e => update("conversionGoal", e.target.value)} placeholder="Jualan ebook, coaching, dll" /></div>
            <div className="grid gap-1.5"><Label className="text-sm">Tone (opsional)</Label><Input value={form.tone} onChange={e => update("tone", e.target.value)} placeholder="Tegas, nyentil, no fluff" /></div>
            <Button onClick={generateStrategy} disabled={loadingStrategy} size="lg" className="mt-2 h-12 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              {loadingStrategy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Rocket className="mr-2 h-4 w-4" />Generate Roadmap</>}
            </Button>
          </div>)}
        </Card>
      </section>

      {/* Roadmap */}
      {strategy && (
        <section className="mx-auto max-w-5xl px-6 pb-24">
          {/* Brand - collapsible */}
          <Card className="mb-8 overflow-hidden">
            <button onClick={() => setBrandOpen(o => !o)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition">
              <div className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-primary" /><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Brand Identity</p><p className="font-semibold">{strategy.brand.tagline}</p></div></div>
              {brandOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
            {brandOpen && <div className="border-t border-border p-6 text-sm space-y-3">
              <p><strong>Persona:</strong> {strategy.brand.persona}</p>
              <p><strong>Voice:</strong> {strategy.brand.voice}</p>
              <p><strong>Visual:</strong> {strategy.brand.visualStyle}</p>
              <div className="flex flex-wrap gap-2 mt-2">{strategy.brand.hashtags.map((h, i) => <Badge key={i} variant="secondary">{h.startsWith("#") ? h : `#${h}`}</Badge>)}</div>
            </div>}
          </Card>

          {/* Progress */}
          {(() => { const total = strategy.phases.reduce((s, p) => s + p.weeklyThemes.length, 0); const done = Object.keys(weeks).length; const pct = total > 0 ? Math.round((done / total) * 100) : 0; return (
            <Card className="mb-6 p-5"><div className="flex items-center justify-between mb-2"><h2 className="text-lg font-bold">Progress</h2><span className="text-sm font-semibold text-primary">{done}/{total} minggu</span></div><div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--gradient-hero)" }} /></div></Card>
          ); })()}

          {/* Phases */}
          <div className="space-y-8">
            {strategy.phases.map((phase, pi) => (
              <div key={pi}>
                <div className="mb-4 border-b border-border pb-3"><p className="text-xs font-semibold uppercase text-primary">Phase {pi + 1} · {phase.days}</p><h3 className="text-xl font-bold">{phase.name}</h3><p className="text-sm text-muted-foreground">{phase.objective}</p></div>
                <div className="grid gap-3">
                  {phase.weeklyThemes.map((theme, wi) => {
                    const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
                    const weekNumber = weekOffset + wi + 1;
                    const wk = weeks[weekNumber];
                    const isOpen = openWeek === weekNumber;
                    return (
                      <Card key={wi} className="overflow-hidden">
                        <button onClick={() => wk ? setOpenWeek(isOpen ? null : weekNumber) : generateWeek(weekNumber, phase.name, theme)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40 transition">
                          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>W{weekNumber}</div><div><p className="text-xs text-muted-foreground">Minggu {weekNumber}</p><p className="font-semibold text-sm">{theme}</p></div></div>
                          {loadingWeek === weekNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : wk ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <Badge variant="outline" className="text-xs">Generate</Badge>}
                        </button>
                        {wk && isOpen && <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                          <p className="text-sm text-muted-foreground"><strong>Fokus:</strong> {wk.focus}</p>
                          {wk.days.map((d, di) => <div key={di} className="rounded border border-border bg-background p-3">
                            <p className="font-semibold text-sm mb-2">Hari {d.day} · {d.dailyGoal}</p>
                            {d.posts.map((post, pi2) => {
                              const fkey = `${weekNumber}|${d.day}|${post.slot}`;
                              return <div key={pi2} className="rounded border border-border/60 p-2 mb-2 text-xs">
                                <div className="flex gap-2 mb-1"><Badge variant="secondary" className="text-xs">{post.slot}</Badge><Badge variant="outline" className="text-xs">{post.format}</Badge></div>
                                <p className="font-semibold">🪝 {post.hook}</p>
                                <p className="mt-1 text-muted-foreground">{post.caption}</p>
                                <p className="mt-1"><strong>CTA:</strong> {post.cta}</p>
                              </div>;
                            })}
                          </div>)}
                        </div>}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
