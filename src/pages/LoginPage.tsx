import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, Rocket, BarChart3, Calendar, ArrowRight } from "lucide-react";
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
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal login");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <Toaster richColors position="top-center" />
      <nav className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg"><Sparkles className="h-5 w-5 text-primary" /> Influencer Launchpad</div>
        <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
      </nav>
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
          <Badge variant="secondary" className="mb-6">AI-Powered Content Planner</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Dari <span style={{ backgroundImage: "var(--gradient-hero)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Nol</span> ke Influencer dalam 1 Tahun</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">AI bikin brand identity, roadmap konten per hari, dan track performa — semua otomatis.</p>
          <Card className="mx-auto mt-8 max-w-sm p-6 shadow-xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <Button onClick={onGoogle} disabled={loading} variant="outline" className="w-full h-12 text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><svg className="h-5 w-5 mr-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Masuk dengan Google</>)}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Gratis 1 minggu. Tanpa kartu kredit.</p>
          </Card>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold mb-10">Semua yang Kamu Butuhkan</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FC icon={<Rocket className="h-6 w-6" />} title="Brand Identity Instan" desc="Persona, voice, visual style, tagline, content pillars, hashtag." />
          <FC icon={<Calendar className="h-6 w-6" />} title="Roadmap Konten Harian" desc="Hook, caption, CTA, visual idea, hashtag. Tinggal eksekusi." />
          <FC icon={<BarChart3 className="h-6 w-6" />} title="Analytics & Feedback" desc="Catat performa. AI belajar dan improve strategi." />
        </div>
      </section>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">&copy; 2025 Influencer Launchpad</footer>
    </div>
  );
}

function FC({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return <Card className="p-6 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{desc}</p></Card>;
}
