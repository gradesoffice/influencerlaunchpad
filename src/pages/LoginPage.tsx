import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, Rocket, BarChart3, Users, Gauge, Lightbulb, Check, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const onGoogle = async () => {
    setLoading(true);
    try { const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }); if (error) throw error; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster richColors position="top-center" />

      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold"><div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Rocket className="h-4 w-4 text-primary" /></div><span className="text-sm">Influencer Launchpad</span></div>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#fitur">Fitur</a><a href="#manfaat">Manfaat</a><Link to="/pricing">Harga</Link><a href="#testimoni">Testimoni</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onGoogle}>Login</Button>
          <Button size="sm" className="text-primary-foreground" style={{ background: "var(--gradient-hero)" }} onClick={onGoogle}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mulai Gratis"}</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">Bangun Kontenmu<br/>Dengan Strategi.<br/><span className="text-primary">Ciptakan Algoritma FYP-mu Sendiri.</span></h1>
          <p className="mt-5 text-muted-foreground text-lg">Platform all-in-one untuk influencer & brand membuat strategi, mengelola konten, dan mengukur performa dalam satu tempat.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" className="h-12 px-6 text-primary-foreground gap-2" style={{ background: "var(--gradient-hero)" }} onClick={onGoogle}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Mulai Gratis Sekarang <ArrowRight className="h-4 w-4" /></>}</Button>
            <Button size="lg" variant="outline" className="h-12 px-6 gap-2"><Play className="h-4 w-4" /> Lihat Demo</Button>
          </div>
          <div className="mt-6 flex gap-6 text-xs text-muted-foreground">
            <span>🎁 Gratis 7 hari</span><span>✓ Mudah digunakan</span><span>💳 Tanpa kartu kredit</span>
          </div>
        </div>
        {/* Dashboard preview mockup */}
        <div className="hidden md:block">
          <Card className="p-4 shadow-2xl rounded-2xl border-2 border-border/50 bg-[#faf9f7]">
            <div className="flex gap-3">
              <div className="w-32 space-y-2 border-r border-border pr-3">
                <div className="flex items-center gap-2 text-xs font-bold mb-3"><Rocket className="h-3 w-3 text-primary" />Launchpad</div>
                <div className="text-[10px] text-primary font-medium bg-primary/10 rounded px-2 py-1">🏠 Home</div>
                <div className="text-[10px] text-muted-foreground px-2 py-1">📋 Roadmap</div>
                <div className="text-[10px] text-muted-foreground px-2 py-1">📊 Analytics</div>
                <div className="text-[10px] text-muted-foreground px-2 py-1">👥 Audiens</div>
                <div className="text-[10px] text-muted-foreground px-2 py-1">🎯 KPI</div>
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-xs font-semibold">Hi, Brand Studio 👋</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white border p-2 text-center"><p className="text-[10px] text-muted-foreground">Reach</p><p className="text-sm font-bold">12.4K</p></div>
                  <div className="rounded-lg bg-white border p-2 text-center"><p className="text-[10px] text-muted-foreground">Engagement</p><p className="text-sm font-bold">2.8K</p></div>
                  <div className="rounded-lg bg-white border p-2 text-center"><p className="text-[10px] text-muted-foreground">Save</p><p className="text-sm font-bold">1.2K</p></div>
                </div>
                <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{i}</div>)}<div className="h-7 w-7 rounded-full border-2 border-primary flex items-center justify-center text-[8px] font-bold">75%</div></div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="bg-[#faf9f7] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm text-muted-foreground mb-2">Dipercaya oleh creator & brand di seluruh Indonesia</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-40 mb-12 text-lg font-bold text-muted-foreground">
            <span>tokopedia</span><span>Shopee</span><span>Lazada</span><span>blibli</span><span>traveloka</span>
          </div>
          <div className="grid gap-6 md:grid-cols-5">
            <FC icon={<Sparkles className="h-6 w-6 text-primary" />} title="Strategi Terstruktur" desc="Roadmap step-by-step dengan fase & milestone. AI generate konten harian siap posting." />
            <FC icon={<BarChart3 className="h-6 w-6 text-violet-500" />} title="Analytics Lengkap" desc="Pantau reach, engagement, konversi per platform. Lihat tren naik-turun real-time." />
            <FC icon={<Users className="h-6 w-6 text-emerald-500" />} title="Kenali Audiens" desc="Pahami siapa yang engage. Rekomendasi jam posting & format terbaik." />
            <FC icon={<Gauge className="h-6 w-6 text-rose-500" />} title="KPI Tracker" desc="Target likes, DM, konversi per minggu. Progress bar visual yang memotivasi." />
            <FC icon={<Lightbulb className="h-6 w-6 text-amber-500" />} title="Insight Cerdas AI" desc="AI analisis data-mu: format terbaik, waktu posting optimal, do's & don'ts otomatis." />
          </div>
        </div>
      </section>

      {/* Stats + Testimonials */}
      <section id="manfaat" className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold">Semua yang kamu butuhkan untuk <span className="text-primary">tumbuh lebih cepat</span></h2>
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div><p className="text-2xl font-bold">10K+</p><p className="text-xs text-muted-foreground">Creator Aktif</p></div>
                <div><p className="text-2xl font-bold">500+</p><p className="text-xs text-muted-foreground">Brand Terpercaya</p></div>
                <div><p className="text-2xl font-bold">1M+</p><p className="text-xs text-muted-foreground">Konten Terkelola</p></div>
                <div><p className="text-2xl font-bold">95%</p><p className="text-xs text-muted-foreground">User Puas</p></div>
              </div>
            </div>
            <div id="testimoni" className="grid gap-4">
              <Card className="p-5"><p className="text-sm italic text-muted-foreground mb-3">"Influencer Launchpad bantu aku merapikan konten, konten lebih terstruktur. Dalam 1 bulan, engagement Reels-ku naik 25% karena ikutan saran AI-nya!"</p><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">N</div><div><p className="text-sm font-medium">Nadia Rahma</p><p className="text-xs text-muted-foreground">Content Creator · ⭐⭐⭐⭐⭐</p></div></div></Card>
              <Card className="p-5"><p className="text-sm italic text-muted-foreground mb-3">"Tim kami handle 4 brand sekaligus pakai Business plan. Semua roadmap & analytics terpisah per brand. Game changer!"</p><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600">D</div><div><p className="text-sm font-medium">Dimas Pratama</p><p className="text-xs text-muted-foreground">Digital Marketing Agency · ⭐⭐⭐⭐⭐</p></div></div></Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#faf9f7]">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Card className="p-8 flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: "var(--gradient-hero)" }}>
            <div className="text-left text-white"><h2 className="text-xl font-bold">Siap bawa brand kamu ke level berikutnya?</h2><p className="text-sm opacity-80 mt-1">Mulai gratis sekarang. Upgrade kapan saja.</p></div>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shrink-0 h-12 px-6 font-semibold" onClick={onGoogle}>Mulai Gratis Sekarang <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2025 Influencer Launchpad. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FC({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return <Card className="p-5 text-center"><div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-[#faf9f7] flex items-center justify-center">{icon}</div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{desc}</p></Card>;
}
