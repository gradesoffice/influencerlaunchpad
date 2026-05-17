import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowLeft, Sparkles, Rocket, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  { name: "Free", price: "Gratis", period: "", description: "Coba 1 minggu.", icon: <Sparkles className="h-6 w-6" />, features: ["1 strategi aktif", "Breakdown 1 minggu", "Brand identity lengkap"], limitations: ["Tanpa analytics", "Tanpa feedback tracking"], cta: "Mulai Gratis", popular: false },
  { name: "Pro", price: "Rp 99.000", period: "/bulan", description: "Untuk kreator serius.", icon: <Rocket className="h-6 w-6" />, features: ["Unlimited strategi", "Roadmap 6 bulan", "Analytics lengkap", "Feedback tracking", "AI belajar dari performa"], limitations: [], cta: "Upgrade ke Pro", popular: true },
  { name: "Business", price: "Rp 249.000", period: "/bulan", description: "Untuk tim & agency.", icon: <Building2 className="h-6 w-6" />, features: ["Semua fitur Pro", "Roadmap 1 tahun", "Multi-akun (5 brand)", "Priority AI", "Dedicated support"], limitations: [], cta: "Hubungi Kami", popular: false },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (document.getElementById("midtrans-snap")) return;
    const s = document.createElement("script");
    s.id = "midtrans-snap"; s.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    s.setAttribute("data-client-key", import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "");
    document.head.appendChild(s);
  }, []);

  const handleUpgrade = async (plan: "pro" | "business") => {
    setLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const res = await fetch("/api/payment", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan }) });
      if (!res.ok) throw new Error(await res.text());
      const { token } = await res.json();
      (window as any).snap.pay(token, { onSuccess: () => { toast.success("Upgrade berhasil!"); setTimeout(() => window.location.href = "/", 2000); }, onPending: () => toast.info("Menunggu pembayaran."), onError: () => toast.error("Gagal."), onClose: () => setLoading(null) });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); setLoading(null); }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--gradient-soft)" }}>
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-5xl">
        <Link to="/"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button></Link>
        <div className="text-center mb-12"><h1 className="text-4xl font-bold">Pilih Plan</h1><p className="mt-3 text-lg text-muted-foreground">Mulai gratis, upgrade kapan saja.</p></div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map(plan => (
            <Card key={plan.name} className={`relative p-6 flex flex-col ${plan.popular ? "border-primary shadow-lg scale-[1.02]" : ""}`}>
              {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">Populer</Badge>}
              <div className="mb-4 flex items-center gap-3"><div className={`p-2 rounded-lg ${plan.popular ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{plan.icon}</div><h3 className="text-xl font-bold">{plan.name}</h3></div>
              <div className="mb-4"><span className="text-3xl font-bold">{plan.price}</span>{plan.period && <span className="text-muted-foreground">{plan.period}</span>}</div>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
              <div className="flex-1 space-y-3 mb-6">
                {plan.features.map((f, i) => <div key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /><span>{f}</span></div>)}
                {plan.limitations.map((l, i) => <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="h-4 w-4 mt-0.5 shrink-0 text-center">—</span><span>{l}</span></div>)}
              </div>
              <Button className={`w-full h-11 ${plan.popular ? "text-primary-foreground" : ""}`} variant={plan.popular ? "default" : "outline"} style={plan.popular ? { background: "var(--gradient-hero)" } : undefined} disabled={loading !== null} onClick={() => { if (plan.name === "Free") window.location.href = "/"; else handleUpgrade(plan.name.toLowerCase() as "pro" | "business"); }}>
                {loading === plan.name.toLowerCase() ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.cta}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
