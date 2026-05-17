import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Target, Megaphone, Loader2, ChevronRight, Rocket, TrendingUp, Copy, Check, BarChart3, Heart, MessageCircle, Send, ShoppingCart, Crown, Settings, LogOut, X } from "lucide-react";
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => { loadFromDb(); }, []);

  const loadFromDb = async () => {
    try {
      const { data: strats } = await supabase.from("strategies").select("*").order("created_at", { ascending: false }).limit(1);
      if (strats?.length) {
        const s = strats[0];
        setStrategyId(s.id); setStrategy({ brand: s.brand as any, phases: s.phases as any });
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
      const data = await res.json();
      setStrategy(data); setStrategyId(data.strategyId ?? null); toast.success("Strategi siap!"); setShowForm(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } finally { setLoadingStrategy(false); }
  };

  const generateWeek = async (weekNumber: number, phaseName: string, weeklyTheme: string) => {
    if (!strategy) return; setLoadingWeek(weekNumber);
    try {
      const brandSummary = `Persona: ${strategy.brand.persona}\nVoice: ${strategy.brand.voice}\nVisual: ${strategy.brand.visualStyle}\nTagline: ${strategy.brand.tagline}\nPillars: ${strategy.brand.contentPillars.map(p => p.name).join(", ")}`;
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
    const updated = { ...cur, ...patch };
    setFeedback(f => ({ ...f, [key]: updated }));
    if (strategyId) { const [w, d, ...s] = key.split("|"); supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) supabase.from("feedback").upsert({ strategy_id: strategyId, user_id: session.user.id, week_number: Number(w), day: Number(d), slot: s.join("|"), ...updated, updated_at: new Date().toISOString() }, { onConflict: "strategy_id,week_number,day,slot" }); }); }
  };

  // Computed
  const totalWeeksAvailable = strategy?.phases.reduce((s, p) => s + p.weeklyThemes.length, 0) ?? 0;
  const completedWeeks = Object.keys(weeks).length;
  const progressPct = totalWeeksAvailable > 0 ? Math.round((completedWeeks / totalWeeksAvailable) * 100) : 0;
  const totalPosts = Object.values(weeks).reduce((s, w) => s + w.days.reduce((a, d) => a + d.posts.length, 0), 0);
  const fbVals = Object.values(feedback);
  const totalLikes = fbVals.reduce((s, f) => s + f.likes, 0);
  const totalConversions = fbVals.reduce((s, f) => s + f.conversions, 0);

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // === FORM VIEW (no strategy yet) ===
  if (showForm || !strategy) return (
    <div className="min-h-screen bg-background p-6">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" /> Launchpad</div>
          <button onClick={handleLogout} className="text-xs text-muted-foreground">Logout</button>
        </div>
        <h1 className="text-2xl font-bold mb-1">Buat Strategi Baru</h1>
        <p className="text-sm text-muted-foreground mb-6">Isi profil akun medsos kamu.</p>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label className="text-sm font-medium">Niche / Topik</Label><Input value={form.niche} onChange={e => update("niche", e.target.value)} placeholder="Coaching produktivitas" /></div>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-sm">Platform</Label><select value={form.platform} onChange={e => update("platform", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option></select></div><div className="grid gap-1.5"><Label className="text-sm">Konten/hari</Label><Input type="number" min={1} max={10} value={form.postsPerDay} onChange={e => update("postsPerDay", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} /></div></div>
          <div className="grid gap-1.5"><Label className="text-sm">Target Audiens</Label><Textarea rows={2} value={form.audience} onChange={e => update("audience", e.target.value)} placeholder="Freelancer 22-35 thn" /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Pesan Utama</Label><Textarea rows={2} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Produktivitas = sistem, bukan motivasi" /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Tujuan Konversi</Label><Input value={form.conversionGoal} onChange={e => update("conversionGoal", e.target.value)} placeholder="Jualan ebook, coaching" /></div>
          <div className="grid gap-1.5"><Label className="text-sm">Tone (opsional)</Label><Input value={form.tone} onChange={e => update("tone", e.target.value)} placeholder="Tegas, nyentil" /></div>
          <Button onClick={generateStrategy} disabled={loadingStrategy} size="lg" className="h-12 text-base font-semibold text-primary-foreground mt-2" style={{ background: "var(--gradient-hero)" }}>{loadingStrategy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Rocket className="mr-2 h-5 w-5" />Generate Roadmap</>}</Button>
        </div>
      </div>
    </div>
  );

  // === DASHBOARD VIEW (has strategy) ===
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* Header - light */}
      <div className="border-b border-border px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Hi, {form.niche.split(" ")[0]} 👋</p>
            <p className="text-sm font-semibold">Siap bangun brand?</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/pricing"><Crown className="h-5 w-5 text-amber-500" /></Link>
            <Link to="/analytics"><BarChart3 className="h-5 w-5 text-muted-foreground" /></Link>
            <button onClick={() => setShowForm(true)}><Settings className="h-5 w-5 text-muted-foreground" /></button>
            <button onClick={handleLogout}><LogOut className="h-5 w-5 text-muted-foreground" /></button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard icon={<Heart className="h-4 w-4 text-rose-500" />} label="Likes" value={totalLikes} />
          <MetricCard icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} label="Konten" value={totalPosts} />
          <MetricCard icon={<ShoppingCart className="h-4 w-4 text-primary" />} label="Konversi" value={totalConversions} />
        </div>

        {/* Phases with visual week icons */}
        {strategy.phases.map((phase, pi) => {
          const weekOffset = strategy.phases.slice(0, pi).reduce((s, p) => s + p.weeklyThemes.length, 0);
          return (
            <div key={pi}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Phase {pi + 1} · {phase.name}</p>
                <p className="text-xs text-primary font-medium">Minggu {weekOffset + 1}-{weekOffset + phase.weeklyThemes.length}</p>
              </div>

              {/* Week circles */}
              <div className="flex gap-3 overflow-x-auto pb-3 mb-2">
                {phase.weeklyThemes.map((theme, wi) => {
                  const wn = weekOffset + wi + 1;
                  const done = !!weeks[wn];
                  const active = openWeek === wn;
                  return (
                    <button key={wi} onClick={() => done ? setOpenWeek(active ? null : wn) : generateWeek(wn, phase.name, theme)} className="flex flex-col items-center gap-1 shrink-0">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold transition-all ${active ? "ring-2 ring-primary ring-offset-2" : ""} ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {loadingWeek === wn ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : wn}
                      </div>
                      <span className="text-[10px] text-muted-foreground w-12 text-center truncate">{theme.split(" ").slice(0, 2).join(" ")}</span>
                    </button>
                  );
                })}
                {/* Progress circle */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="relative flex h-11 w-11 items-center justify-center">
                    <svg className="h-11 w-11 -rotate-90"><circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" className="text-muted" strokeWidth="3" /><circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" className="text-primary" strokeWidth="3" strokeDasharray={`${progressPct * 1.13} 113`} strokeLinecap="round" /></svg>
                    <span className="absolute text-[10px] font-bold">{progressPct}%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Progress</span>
                </div>
              </div>

              {/* KPI badges for phase */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {phase.kpis.slice(0, 3).map((k, i) => <Badge key={i} variant="outline" className="text-[10px] shrink-0">{k}</Badge>)}
              </div>
            </div>
          );
        })}

        {/* Expanded week content */}
        {openWeek && weeks[openWeek] && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Minggu {openWeek}</p>
              <button onClick={() => setOpenWeek(null)} className="text-xs text-muted-foreground">Tutup</button>
            </div>
            <p className="text-xs text-muted-foreground">{weeks[openWeek].focus}</p>
            {weeks[openWeek].days.map((d, di) => (
              <div key={di} className="space-y-2">
                <p className="text-xs font-semibold text-primary">Hari {d.day} · {d.dayLabel}</p>
                {d.posts.map((post, pi2) => {
                  const fkey = `${openWeek}|${d.day}|${post.slot}`;
                  const fb = feedback[fkey];
                  const isCopied = copiedKey === fkey;
                  const fbOpen = openFeedback === fkey;
                  const hasStats = fb && (fb.likes + fb.comments + fb.messages + fb.conversions > 0);
                  return (
                    <div key={pi2} className={`rounded-lg border p-3 ${hasStats ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[10px]">{post.format}</Badge>{hasStats && <Badge className="bg-primary/20 text-primary text-[10px]">✓ Tercatat</Badge>}</div>
                      <p className="text-sm font-semibold">🪝 {post.hook}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.caption}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => copyPost(fkey, post)} className="h-7 text-[10px] px-2">{isCopied ? <><Check className="h-3 w-3 mr-1" />OK</> : <><Copy className="h-3 w-3 mr-1" />Salin</>}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpenFeedback(fbOpen ? null : fkey)} className="h-7 text-[10px] px-2"><BarChart3 className="h-3 w-3 mr-1" />Performa</Button>
                      </div>
                      {fbOpen && <div className="mt-2 grid grid-cols-4 gap-2">
                        <MiniInput icon="❤️" value={fb?.likes ?? 0} onChange={v => updateFeedback(fkey, { likes: v })} />
                        <MiniInput icon="💬" value={fb?.comments ?? 0} onChange={v => updateFeedback(fkey, { comments: v })} />
                        <MiniInput icon="📩" value={fb?.messages ?? 0} onChange={v => updateFeedback(fkey, { messages: v })} />
                        <MiniInput icon="🛒" value={fb?.conversions ?? 0} onChange={v => updateFeedback(fkey, { conversions: v })} />
                      </div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </Card>
        )}

        {/* Bottom spacer removed - no fixed bottom nav */}

        {/* Pricing Modal Overlay */}
        {showPricing && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-background rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowPricing(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"><X className="h-4 w-4" /></button>
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Crown className="h-6 w-6 text-primary" /></div>
                <h2 className="text-xl font-bold">Upgrade untuk akses lebih</h2>
                <p className="mt-1 text-sm text-muted-foreground">Upgrade untuk fitur tanpa batas.</p>
              </div>
              <div className="rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-center mb-6"><p className="text-sm text-rose-700">⚠️ Kamu sudah mencapai batas plan Gratis.</p></div>
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <Card className="p-5"><div className="flex items-center gap-2 mb-3">🚀 <span className="font-bold">Free</span></div><p className="text-2xl font-bold mb-3">Gratis</p><div className="space-y-2 text-sm mb-4"><PF text="1 strategi" /><PF text="1 minggu" /><PL text="Tanpa analytics" /></div><Button variant="outline" className="w-full" onClick={() => setShowPricing(false)}>Lanjut Gratis</Button></Card>
                <Card className="p-5 border-primary"><Badge className="mb-2 bg-primary text-primary-foreground">Popular</Badge><div className="flex items-center gap-2 mb-3">👑 <span className="font-bold">Pro</span></div><p className="text-2xl font-bold mb-3">Rp 99.000<span className="text-sm font-normal text-muted-foreground">/bln</span></p><div className="space-y-2 text-sm mb-4"><PF text="Strategi tanpa batas" /><PF text="6 bulan roadmap" /><PF text="Analytics & insights" /></div><Button className="w-full text-primary-foreground" style={{ background: "var(--gradient-hero)" }} onClick={() => { setShowPricing(false); navigate("/pricing"); }}>Upgrade Pro</Button></Card>
              </div>
              <p className="text-center text-xs text-muted-foreground">🔒 Pembayaran aman · Batalkan kapan saja</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <Card className="p-3 text-center"><div className="flex justify-center mb-1">{icon}</div><p className="text-lg font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></Card>;
}

function MiniInput({ icon, value, onChange }: { icon: string; value: number; onChange: (v: number) => void }) {
  return <div className="text-center"><p className="text-xs mb-0.5">{icon}</p><Input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="h-7 text-xs text-center px-1" /></div>;
}

function PF({ text }: { text: string }) { return <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span>{text}</span></div>; }
function PL({ text }: { text: string }) { return <div className="flex items-center gap-2 text-muted-foreground"><span className="h-3.5 w-3.5 shrink-0 text-center">—</span><span>{text}</span></div>; }
