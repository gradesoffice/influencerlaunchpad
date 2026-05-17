import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, Target, Users, Megaphone, Calendar, Loader2, ChevronDown, ChevronRight, Rocket, TrendingUp, Hash, CheckCircle2, XCircle, Copy, Check, BarChart3, Heart, MessageCircle, Send, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roadmap 90 Hari Menuju Influencer — Brand & Konten Harian" },
      { name: "description", content: "Generate strategi 90 hari, brand identity konsisten, dan breakdown konten harian untuk akun media sosial kamu." },
    ],
  }),
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/login" });
    }
  },
  component: Index,
});

type FormState = {
  niche: string;
  platform: string;
  audience: string;
  message: string;
  conversionGoal: string;
  tone: string;
  postsPerDay: number;
};

type Strategy = {
  brand: {
    persona: string; voice: string; visualStyle: string; tagline: string;
    contentPillars: { name: string; description: string }[];
    hashtags: string[];
    dosAndDonts: { dos: string[]; donts: string[] };
  };
  phases: {
    name: string; days: string; objective: string; kpis: string[]; weeklyThemes: string[];
  }[];
};

type WeekPlan = {
  weekNumber: number; theme: string; focus: string;
  days: {
    day: number; dayLabel: string; dailyGoal: string;
    posts: { slot: string; format: string; hook: string; caption: string; cta: string; hashtags: string[]; visualIdea: string; conversionTie: string }[];
  }[];
};

const initial: FormState = {
  niche: "", platform: "Instagram", audience: "", message: "", conversionGoal: "", tone: "", postsPerDay: 2,
};

type Feedback = { likes: number; comments: number; messages: number; conversions: number; note: string };
const FEEDBACK_KEY = "influencer-feedback-v1";

function Index() {
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
  const [formOpen, setFormOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load last strategy from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: strats } = await supabase
          .from("strategies")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);
        if (strats && strats.length > 0) {
          const s = strats[0];
          setStrategyId(s.id);
          setStrategy({ brand: s.brand as Strategy["brand"], phases: s.phases as Strategy["phases"] });
          setForm({ niche: s.niche, platform: s.platform, audience: s.audience, message: s.message, conversionGoal: s.conversion_goal, tone: s.tone || "", postsPerDay: s.posts_per_day });
          setFormOpen(false);

          // Load saved weeks
          const { data: savedWeeks } = await supabase
            .from("weeks")
            .select("week_number, data")
            .eq("strategy_id", s.id);
          if (savedWeeks) {
            const wMap: Record<number, WeekPlan> = {};
            savedWeeks.forEach(w => { wMap[w.week_number] = w.data as unknown as WeekPlan; });
            setWeeks(wMap);
          }

          // Load saved feedback
          const { data: savedFb } = await supabase
            .from("feedback")
            .select("week_number, day, slot, likes, comments, messages, conversions, note")
            .eq("strategy_id", s.id);
          if (savedFb && savedFb.length > 0) {
            const fbMap: Record<string, Feedback> = {};
            savedFb.forEach(f => { fbMap[`${f.week_number}|${f.day}|${f.slot}`] = { likes: f.likes, comments: f.comments, messages: f.messages, conversions: f.conversions, note: f.note }; });
            setFeedback(fbMap);
          }
        }
      } catch (e) { console.error("Failed to load strategy:", e); }
      setInitialLoading(false);
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback)); } catch {}
  }, [feedback]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(s => ({ ...s, [k]: v }));

  const buildFeedbackInsights = (): string => {
    const entries = Object.entries(feedback).filter(([, v]) => v.likes + v.comments + v.messages + v.conversions > 0);
    if (!entries.length) return "";
    const enriched = entries.map(([key, v]) => {
      const [w, d, ...slot] = key.split("|");
      const wk = weeks[Number(w)];
      const day = wk?.days.find(x => String(x.day) === d);
      const post = day?.posts.find(p => p.slot === slot.join("|"));
      const score = v.conversions * 5 + v.messages * 2 + v.comments * 1.5 + v.likes * 0.1;
      return { key, v, post, score };
    }).filter(x => x.post);
    enriched.sort((a, b) => b.score - a.score);
    const top = enriched.slice(0, 5).map(e => `BAGUS — Hook: "${e.post!.hook}" | Format: ${e.post!.format} | ${e.v.likes} likes, ${e.v.comments} komen, ${e.v.messages} DM, ${e.v.conversions} konversi${e.v.note ? ` | Catatan: ${e.v.note}` : ""}`);
    const bottom = enriched.slice(-3).filter(e => e.score < (enriched[0]?.score ?? 1) / 4).map(e => `KURANG — Hook: "${e.post!.hook}" | Format: ${e.post!.format}`);
    return [...top, ...bottom].join("\n");
  };

  const aggStats = useMemo(() => {
    const vals = Object.values(feedback);
    return vals.reduce((a, v) => ({ posts: a.posts + 1, likes: a.likes + v.likes, comments: a.comments + v.comments, messages: a.messages + v.messages, conversions: a.conversions + v.conversions }), { posts: 0, likes: 0, comments: 0, messages: 0, conversions: 0 });
  }, [feedback]);

  const copyPost = async (key: string, post: WeekPlan["days"][0]["posts"][0]) => {
    const text = `${post.hook}\n\n${post.caption}\n\n${post.cta}\n\n${post.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setOpenFeedback(key);
      toast.success("Konten disalin! Catat performanya setelah posting.");
      setTimeout(() => setCopiedKey(c => c === key ? null : c), 2000);
    } catch { toast.error("Gagal menyalin"); }
  };

  const updateFeedback = (key: string, patch: Partial<Feedback>) => {
    const cur = feedback[key] ?? { likes: 0, comments: 0, messages: 0, conversions: 0, note: "" };
    const updated = { ...cur, ...patch };
    setFeedback(f => ({ ...f, [key]: updated }));

    // Save to Supabase in background
    if (strategyId) {
      const [w, d, ...slotParts] = key.split("|");
      import("@/integrations/supabase/client").then(({ supabase: sb }) => {
        sb.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            sb.from("feedback").upsert({
              strategy_id: strategyId,
              user_id: session.user.id,
              week_number: Number(w),
              day: Number(d),
              slot: slotParts.join("|"),
              likes: updated.likes,
              comments: updated.comments,
              messages: updated.messages,
              conversions: updated.conversions,
              note: updated.note,
              updated_at: new Date().toISOString(),
            }, { onConflict: "strategy_id,week_number,day,slot" }).then(({ error }) => {
              if (error) {
                console.error("[feedback] save error:", error.message);
                toast.error("Gagal simpan performa");
              }
            });
          }
        });
      });
    }
  };

  const generateStrategy = async () => {
    if (!form.niche || !form.audience || !form.message || !form.conversionGoal) {
      toast.error("Lengkapi dulu niche, audiens, pesan, dan tujuan konversi.");
      return;
    }
    setLoadingStrategy(true); setStrategy(null); setStrategyId(null); setWeeks({}); setOpenWeek(null);
    try {
      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data: { session } } = await sb.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch("/api/strategy", { method: "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.code === "PLAN_LIMIT" || errData?.code === "RATE_LIMIT") {
          toast.error(errData.error, { action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" } });
        } else {
          throw new Error(errData?.error || await res.text());
        }
        return;
      }
      const data = (await res.json()) as Strategy & { strategyId?: string };
      setStrategy(data);
      setStrategyId(data.strategyId ?? null);
      toast.success("Strategi & roadmap 90 hari siap!");
      setTimeout(() => document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate");
    } finally { setLoadingStrategy(false); }
  };

  const generateWeek = async (weekNumber: number, phaseName: string, weeklyTheme: string) => {
    if (!strategy) return;
    setLoadingWeek(weekNumber);
    try {
      const brandSummary = `Persona: ${strategy.brand.persona}\nVoice: ${strategy.brand.voice}\nVisual: ${strategy.brand.visualStyle}\nTagline: ${strategy.brand.tagline}\nPillars: ${strategy.brand.contentPillars.map(p => p.name).join(", ")}\nDo: ${strategy.brand.dosAndDonts.dos.join("; ")}\nDon't: ${strategy.brand.dosAndDonts.donts.join("; ")}`;
      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data: { session } } = await sb.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch("/api/week", { method: "POST", headers, body: JSON.stringify({ weekNumber, postsPerDay: form.postsPerDay, niche: form.niche, platform: form.platform, audience: form.audience, message: form.message, conversionGoal: form.conversionGoal, brandSummary, phaseName, weeklyTheme, feedbackInsights: buildFeedbackInsights(), strategyId }) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.code === "PLAN_LIMIT" || errData?.code === "RATE_LIMIT") {
          toast.error(errData.error, { action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" } });
        } else {
          throw new Error(errData?.error || "Gagal generate minggu");
        }
        return;
      }
      const data = (await res.json()) as WeekPlan;
      setWeeks(w => ({ ...w, [weekNumber]: data }));
      setOpenWeek(weekNumber);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate minggu");
    } finally { setLoadingWeek(null); }
  };

  const handleLogout = async () => {
    const { supabase: sb } = await import("@/integrations/supabase/client");
    await sb.auth.signOut();
    window.location.href = "/login";
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-soft)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <Toaster richColors position="top-center" />
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-5xl px-6 pt-6 pb-16">
          {/* Navigation */}
          <nav className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2 font-bold text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Launchpad
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/strategies" className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Strategi</Link>
              <Link to="/analytics" className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Analytics</Link>
              <Link to="/pricing" className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Pricing</Link>
              <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/40 transition text-muted-foreground">Logout</button>
            </div>
          </nav>
          {/* Hero text */}
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Roadmap <span style={{ backgroundImage: "var(--gradient-hero)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Konten</span> Kamu
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Brand identity + breakdown konten per hari, powered by AI.
            </p>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 pb-16 text-sm">
        <Card className="overflow-hidden shadow-xl" style={{ boxShadow: "var(--shadow-card)" }}>
          {strategy && (
            <button onClick={() => setFormOpen(o => !o)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition border-b border-border">
              <div className="flex items-center gap-3">
                <Megaphone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Profil akun</p>
                  <p className="font-semibold">{form.niche || "Detail akun medsos"}</p>
                </div>
              </div>
              {formOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {(!strategy || formOpen) && (
          <div className="grid gap-5 p-8">
            <Field icon={<Megaphone className="h-4 w-4" />} label="Akun medsos kamu tentang apa? (niche)">
              <Input value={form.niche} onChange={e => update("niche", e.target.value)} placeholder="Contoh: Coaching produktivitas untuk freelancer" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field icon={<Calendar className="h-4 w-4" />} label="Platform utama">
                <select value={form.platform} onChange={e => update("platform", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option>
                </select>
              </Field>
              <Field icon={<TrendingUp className="h-4 w-4" />} label="Konten per hari">
                <Input type="number" min={1} max={10} value={form.postsPerDay} onChange={e => update("postsPerDay", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} />
              </Field>
            </div>
            <Field icon={<Users className="h-4 w-4" />} label="Target audiens">
              <Textarea rows={2} value={form.audience} onChange={e => update("audience", e.target.value)} placeholder="Contoh: Freelancer 22-35 thn yang sering burnout & susah fokus" />
            </Field>
            <Field icon={<Sparkles className="h-4 w-4" />} label="Pesan / keinginan yang ingin disampaikan">
              <Textarea rows={2} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Contoh: Produktivitas itu soal sistem, bukan motivasi. Kerja lebih sedikit, hasil lebih besar." />
            </Field>
            <Field icon={<Target className="h-4 w-4" />} label="Tujuan konversi">
              <Input value={form.conversionGoal} onChange={e => update("conversionGoal", e.target.value)} placeholder="Contoh: Jualan ebook + waiting list cohort coaching" />
            </Field>
            <Field icon={<Hash className="h-4 w-4" />} label="Tone of voice (opsional)">
              <Input value={form.tone} onChange={e => update("tone", e.target.value)} placeholder="Contoh: Tegas, sedikit nyentil, no fluff" />
            </Field>
            <Button onClick={generateStrategy} disabled={loadingStrategy} size="lg" className="mt-2 h-12 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}>
              {loadingStrategy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyusun strategi…</> : <><Rocket className="mr-2 h-4 w-4" /> Generate Roadmap 90 Hari</>}
            </Button>
          </div>
          )}
        </Card>
      </section>

      {strategy && (
        <section id="roadmap" className="mx-auto max-w-5xl px-6 pb-24">
          {/* Brand Identity - Collapsible */}
          <Card className="mb-8 overflow-hidden">
            <button onClick={() => setBrandOpen(o => !o)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Brand Identity</p>
                  <p className="font-semibold">{strategy.brand.tagline}</p>
                </div>
              </div>
              {brandOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
            {brandOpen && (
              <div className="border-t border-border p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Detail label="Persona" value={strategy.brand.persona} />
                    <Detail label="Voice" value={strategy.brand.voice} />
                    <Detail label="Visual Style" value={strategy.brand.visualStyle} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Pillars</p>
                    <div className="mt-2 space-y-2">
                      {strategy.brand.contentPillars.map((p, i) => (
                        <div key={i} className="rounded-lg border border-border/60 p-3">
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="text-sm text-muted-foreground">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Hashtag Inti</p>
                    <div className="flex flex-wrap gap-2">
                      {strategy.brand.hashtags.map((h, i) => <Badge key={i} variant="secondary">{h.startsWith("#") ? h : `#${h}`}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Dos</p>
                    <ul className="space-y-1 text-sm">
                      {strategy.brand.dosAndDonts.dos.map((d, i) => <li key={i} className="flex gap-2"><span className="text-green-600">✓</span>{d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Donts</p>
                    <ul className="space-y-1 text-sm">
                      {strategy.brand.dosAndDonts.donts.map((d, i) => <li key={i} className="flex gap-2"><span className="text-destructive">✗</span>{d}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Card>
          {aggStats.posts > 0 && (
            <Card className="mt-12 p-5" style={{ background: "var(--gradient-soft)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Performa konten kamu</p>
                  <p className="mt-1 text-sm text-muted-foreground">AI akan replikasi pola dari konten yang menang saat generate minggu berikutnya.</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <Stat label="Konten dicatat" value={aggStats.posts} />
                  <Stat label="Likes" value={aggStats.likes} />
                  <Stat label="Komentar" value={aggStats.comments} />
                  <Stat label="DM" value={aggStats.messages} />
                  <Stat label="Konversi" value={aggStats.conversions} highlight />
                </div>
              </div>
            </Card>
          )}

          {/* Progress indicator */}
          {(() => {
            const totalWeeks = strategy.phases.reduce((s, p) => s + p.weeklyThemes.length, 0);
            const completedWeeks = Object.keys(weeks).length;
            const pct = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;
            return (
              <Card className="mt-14 mb-6 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Roadmap Progress</h2>
                  <span className="text-sm font-semibold text-primary">{completedWeeks}/{totalWeeks} minggu</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--gradient-hero)" }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{pct}% selesai — {totalWeeks - completedWeeks} minggu lagi</p>
              </Card>
            );
          })()}

          <div className="space-y-8">
            {strategy.phases.map((phase, pi) => (
              <div key={pi}>
                <div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>Phase {pi + 1} · {phase.days}</p>
                    <h3 className="text-2xl font-bold">{phase.name}</h3>
                    <p className="mt-1 text-muted-foreground">{phase.objective}</p>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {phase.kpis.map((k, i) => <Badge key={i} variant="outline">KPI: {k}</Badge>)}
                </div>
                <div className="grid gap-3">
                  {phase.weeklyThemes.map((theme, wi) => {
                    const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
                    const weekNumber = weekOffset + wi + 1;
                    const wk = weeks[weekNumber];
                    const isOpen = openWeek === weekNumber;
                    return (
                      <Card key={wi} className="overflow-hidden">
                        <button onClick={() => wk ? setOpenWeek(isOpen ? null : weekNumber) : generateWeek(weekNumber, phase.name, theme)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>W{weekNumber}</div>
                            <div>
                              <p className="text-xs text-muted-foreground">Minggu {weekNumber} · Hari {(weekNumber - 1) * 7 + 1}-{weekNumber * 7}</p>
                              <p className="font-semibold">{theme}</p>
                            </div>
                          </div>
                          {loadingWeek === weekNumber ? <Loader2 className="h-5 w-5 animate-spin" /> : wk ? (isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />) : <Badge>Generate breakdown harian</Badge>}
                        </button>
                        {wk && isOpen && (
                          <div className="border-t border-border bg-muted/20 p-5">
                            <p className="mb-4 text-sm text-muted-foreground"><strong className="text-foreground">Fokus minggu:</strong> {wk.focus}</p>
                            <div className="space-y-4">
                              {wk.days.map((d, di) => (
                                <DayCard key={di} d={d} weekNumber={weekNumber} feedback={feedback} copiedKey={copiedKey} openFeedback={openFeedback} onCopy={copyPost} onFeedbackToggle={setOpenFeedback} onFeedbackUpdate={updateFeedback} />
                              ))}
                            </div>
                          </div>
                        )}
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

function DayCard({ d, weekNumber, feedback, copiedKey, openFeedback, onCopy, onFeedbackToggle, onFeedbackUpdate }: {
  d: WeekPlan["days"][0]; weekNumber: number;
  feedback: Record<string, Feedback>; copiedKey: string | null; openFeedback: string | null;
  onCopy: (key: string, post: WeekPlan["days"][0]["posts"][0]) => void;
  onFeedbackToggle: (key: string | null) => void;
  onFeedbackUpdate: (key: string, patch: Partial<Feedback>) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Hari {d.day} · {d.dayLabel}</p>
        <p className="text-xs text-muted-foreground">{d.posts.length} konten</p>
      </div>
      <p className="mb-3 text-sm italic text-muted-foreground">🎯 {d.dailyGoal}</p>
      <div className="grid gap-3">
        {d.posts.map((post, pi2) => {
          const fkey = `${weekNumber}|${d.day}|${post.slot}`;
          const fb = feedback[fkey];
          const isCopied = copiedKey === fkey;
          const fbOpen = openFeedback === fkey;
          const hasStats = fb && (fb.likes + fb.comments + fb.messages + fb.conversions > 0);
          return (
            <div key={pi2} className={`rounded-md border p-3 transition ${hasStats ? "border-primary/40 bg-primary/5" : "border-border/60"}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{post.slot}</Badge>
                <Badge variant="outline">{post.format}</Badge>
                {hasStats && <Badge className="bg-primary text-primary-foreground"><BarChart3 className="mr-1 h-3 w-3" />Tercatat</Badge>}
              </div>
              <p className="font-semibold text-sm">🪝 {post.hook}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{post.caption}</p>
              <p className="mt-2 text-sm"><strong>CTA:</strong> {post.cta}</p>
              <p className="mt-1 text-xs text-muted-foreground"><strong>Visual:</strong> {post.visualIdea}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--primary)" }}><strong>→ Konversi:</strong> {post.conversionTie}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {post.hashtags.map((h, hi) => <span key={hi} className="text-xs text-muted-foreground">{h.startsWith("#") ? h : `#${h}`}</span>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onCopy(fkey, post)} className="h-8">
                  {isCopied ? <><Check className="mr-1 h-3.5 w-3.5" />Tersalin</> : <><Copy className="mr-1 h-3.5 w-3.5" />Salin konten</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onFeedbackToggle(fbOpen ? null : fkey)} className="h-8">
                  <BarChart3 className="mr-1 h-3.5 w-3.5" />{hasStats ? "Edit performa" : "Catat performa"}
                </Button>
              </div>
              {fbOpen && (
                <div className="mt-3 rounded-md border border-border bg-background p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performa konten ini</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatInput icon={<Heart className="h-3.5 w-3.5" />} label="Likes" value={fb?.likes ?? 0} onChange={v => onFeedbackUpdate(fkey, { likes: v })} />
                    <StatInput icon={<MessageCircle className="h-3.5 w-3.5" />} label="Komentar" value={fb?.comments ?? 0} onChange={v => onFeedbackUpdate(fkey, { comments: v })} />
                    <StatInput icon={<Send className="h-3.5 w-3.5" />} label="DM" value={fb?.messages ?? 0} onChange={v => onFeedbackUpdate(fkey, { messages: v })} />
                    <StatInput icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Konversi" value={fb?.conversions ?? 0} onChange={v => onFeedbackUpdate(fkey, { conversions: v })} />
                  </div>
                  <Textarea rows={2} className="mt-2 text-sm" placeholder="Catatan singkat (opsional)..." value={fb?.note ?? ""} onChange={e => onFeedbackUpdate(fkey, { note: e.target.value })} />
                  <p className="mt-2 text-xs text-muted-foreground">💡 Data ini dipakai AI saat generate minggu berikutnya.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center gap-2 text-sm font-medium">{icon}{label}</Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StatInput({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-1">
      <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">{icon}{label}</Label>
      <Input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm" />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
