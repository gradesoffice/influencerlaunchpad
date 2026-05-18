import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Check, Crown, Shield, Headphones, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export default function PricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (document.getElementById("midtrans-snap")) return;
    const s = document.createElement("script");
    s.id = "midtrans-snap"; s.src = "https://app.midtrans.com/snap/snap.js";
    s.setAttribute("data-client-key", import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "");
    document.head.appendChild(s);
  }, []);

  const handleUpgrade = async (plan: "pro" | "business") => {
    setLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const res = await fetch("/api/payment", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan }) });
      if (!res.ok) throw new Error(await res.text());
      const { token } = await res.json();
      (window as any).snap.pay(token, { onSuccess: () => { toast.success("Upgrade berhasil!"); setTimeout(() => navigate("/"), 2000); }, onPending: () => toast.info("Menunggu pembayaran."), onError: () => toast.error("Gagal."), onClose: () => setLoading(null) });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); setLoading(null); }
  };

  return (
    <div className="min-h-screen bg-background/50 flex items-center justify-center p-4">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-2xl">
        {/* Close button */}
        <div className="flex justify-end mb-4">
          <Link to="/"><button className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition"><X className="h-4 w-4" /></button></Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"><Crown className="h-7 w-7 text-primary" /></div>
          <h1 className="text-2xl font-bold">Upgrade untuk akses lebih</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kamu sudah mencapai batas plan Gratis.<br/>Upgrade untuk fitur tanpa batas dan hasil maksimal.</p>
        </div>

        {/* Warning badge */}
        <div className="mx-auto max-w-md mb-6 rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-center">
          <p className="text-sm text-rose-700">⚠️ Kamu hanya bisa membuat <strong>1 strategi per minggu</strong> di plan Gratis.</p>
        </div>

        {/* Plan cards - Free & Pro side by side */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Free */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4"><div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">🚀</div><p className="text-lg font-bold">Free</p></div>
            <p className="text-3xl font-bold mb-1">Gratis</p>
            <p className="text-sm text-muted-foreground mb-5">Coba 1 minggu.</p>
            <div className="space-y-3 mb-6">
              <Feature text="1 strategi aktif" />
              <Feature text="Breakdown 1 minggu" />
              <Feature text="Brand identity lengkap" />
              <Limit text="Tanpa analytics" />
              <Limit text="Tanpa feedback tracking" />
            </div>
            <Button variant="outline" className="w-full h-11" onClick={() => navigate("/")}>Pakai Gratis</Button>
          </Card>

          {/* Pro */}
          <Card className="p-6 border-primary relative">
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">Popular</Badge>
            <div className="flex items-center gap-3 mb-4"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">👑</div><p className="text-lg font-bold">Pro</p></div>
            <p className="text-3xl font-bold mb-1">Rp 99.000 <span className="text-base font-normal text-muted-foreground">/bulan</span></p>
            <p className="text-sm text-muted-foreground mb-5">Untuk hasil tanpa batas.</p>
            <div className="space-y-3 mb-6">
              <Feature text="Strategi tanpa batas" />
              <Feature text="Roadmap 6 bulan" />
              <Feature text="Analytics lengkap" />
              <Feature text="Feedback tracking" />
              <Feature text="AI insights & saran" />
            </div>
            <Button className="w-full h-11 text-primary-foreground" style={{ background: "var(--gradient-hero)" }} disabled={loading !== null} onClick={() => handleUpgrade("pro")}>{loading === "pro" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade ke Pro"}</Button>
          </Card>
        </div>

        {/* Business - collapsible below */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">🏢</div><div><p className="font-bold">Business</p><p className="text-xs text-muted-foreground">Untuk tim & agency</p></div></div>
            <p className="text-xl font-bold">Rp 249.000<span className="text-sm font-normal text-muted-foreground">/bln</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <Feature text="Semua fitur Pro" />
            <Feature text="Roadmap 1 tahun" />
            <Feature text="Multi-brand (5 akun)" />
            <Feature text="Priority AI" />
            <Feature text="Team collaboration" />
            <Feature text="Dedicated support" />
          </div>
          <Button variant="outline" className="w-full h-11" disabled={loading !== null} onClick={() => handleUpgrade("business")}>{loading === "business" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade ke Business"}</Button>
        </Card>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-lg border border-border">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-xs font-semibold">Aman & Terpercaya</p>
            <p className="text-[10px] text-muted-foreground">Data kamu aman 100%</p>
          </div>
          <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-lg border border-border">
            <Headphones className="h-5 w-5 text-primary" />
            <p className="text-xs font-semibold">Dukungan Prioritas</p>
            <p className="text-[10px] text-muted-foreground">Kamu didahulukan</p>
          </div>
          <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-lg border border-border">
            <RotateCcw className="h-5 w-5 text-primary" />
            <p className="text-xs font-semibold">Batalkan Kapan Saja</p>
            <p className="text-[10px] text-muted-foreground">Tanpa biaya tambahan</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">🔒 Pembayaran aman & terenkripsi</p>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500 shrink-0" /><span>{text}</span></div>;
}

function Limit({ text }: { text: string }) {
  return <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="h-4 w-4 shrink-0 text-center">—</span><span>{text}</span></div>;
}
