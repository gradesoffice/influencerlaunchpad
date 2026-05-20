import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Rocket, BarChart3, Calendar, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Influencer Launchpad — AI Content Strategy untuk 1 Tahun" },
      { name: "description", content: "Generate roadmap konten, brand identity, dan breakdown harian dengan AI. Dari nol sampai influencer." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="h-5 w-5 text-primary" /> Influencer Launchpad
        </div>
        <div className="flex items-center gap-3">
          <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
          <Link to="/login"><Button size="sm">Masuk</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
          <Badge variant="secondary" className="mb-6">AI-Powered Content Planner</Badge>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Dari <span style={{ backgroundImage: "var(--gradient-hero)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Nol</span> ke Influencer<br />dalam 1 Tahun
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Masukkan niche & target kamu. AI bikin brand identity, roadmap konten per hari, dan track performa — semua otomatis.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/login"><Button size="lg" className="h-12 px-8 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>Mulai Gratis <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/pricing"><Button size="lg" variant="outline" className="h-12 px-8 text-base">Lihat Pricing</Button></Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold mb-12">Semua yang Kamu Butuhkan</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard icon={<Rocket className="h-6 w-6" />} title="Brand Identity Instan" desc="AI generate persona, voice, visual style, tagline, content pillars, dan hashtag — konsisten dari hari pertama." />
          <FeatureCard icon={<Calendar className="h-6 w-6" />} title="Roadmap Konten Harian" desc="Breakdown per hari: hook, caption, CTA, visual idea, hashtag. Tinggal eksekusi." />
          <FeatureCard icon={<BarChart3 className="h-6 w-6" />} title="Analytics & Feedback Loop" desc="Catat performa konten. AI belajar dari data kamu dan improve strategi minggu berikutnya." />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold mb-12">Cara Kerjanya</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <Step num="1" title="Isi Profil Akun" desc="Niche, platform, audiens, pesan, dan tujuan konversi kamu." />
          <Step num="2" title="AI Generate Roadmap" desc="Strategi 1 tahun + breakdown konten per hari, siap posting." />
          <Step num="3" title="Eksekusi & Track" desc="Posting konten, catat performa, AI makin pintar tiap minggu." />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Card className="p-10" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-2xl font-bold">Siap Jadi Influencer?</h2>
          <p className="mt-2 text-muted-foreground">Gratis 1 minggu. Tanpa kartu kredit.</p>
          <Link to="/login"><Button size="lg" className="mt-6 h-12 px-8 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>Mulai Sekarang</Button></Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2025 Influencer Launchpad. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>{num}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
