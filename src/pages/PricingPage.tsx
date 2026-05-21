import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Check, Crown, Shield, Loader2, Upload, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const PLANS = [
  { id: "pro", name: "Pro", price: 99000, label: "Rp 99.000", period: "/bulan" },
  { id: "business", name: "Business", price: 249000, label: "Rp 249.000", period: "/bulan" },
];

const PAYMENT_METHODS = [
  { id: "seabank", label: "SeaBank", detail: "901612584706", name: "ANDI FENTY FEBRIANTY" },
  { id: "jago", label: "Bank Jago", detail: "505750977476", name: "ANDI FENTY FEBRIANTY" },
  { id: "emoney", label: "Dana / OVO / ShopeePay", detail: "085877737882", name: "ANDI FENTY FEBRIANTY" },
];

const ADMIN_WA = "6285656787625";

export default function PricingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"plan" | "payment" | "confirm">("plan");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userWA, setUserWA] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `payments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      setScreenshotUrl(publicUrl);
      setUploaded(true);
      toast.success("Screenshot berhasil diupload!");
    } catch (err) {
      toast.error("Gagal upload. Coba lagi.");
    }
    setUploading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
      if (user?.user_metadata?.full_name) setUserName(user.user_metadata.full_name);
    });
  }, []);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  const copyNumber = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Nomor disalin!");
  };

  const handleConfirm = () => {
    if (!userWA || !userName) { toast.error("Isi nama & WhatsApp dulu"); return; }
    if (!uploaded) { toast.error("Upload screenshot bukti transfer dulu"); return; }
    const msg = encodeURIComponent(`✅ KONFIRMASI PEMBAYARAN\n\nNama: ${userName}\nEmail: ${userEmail}\nWhatsApp: ${userWA}\nPlan: ${plan.name} (${plan.label}${plan.period})\nMetode: ${method?.label} → ${method?.detail}\n\n📸 Bukti Transfer:\n${screenshotUrl}\n\nMohon diverifikasi & upgrade plan.`);
    window.open(`https://wa.me/${ADMIN_WA}?text=${msg}`, '_blank');
    toast.success("Konfirmasi terkirim! Kami akan verifikasi dalam 1x24 jam.");
    setStep("confirm");
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4"><Link to="/"><button className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted"><X className="h-4 w-4" /></button></Link></div>

        {/* Step 1: Plan selection */}
        {step === "plan" && <Card className="p-6">
          <div className="text-center mb-6"><Crown className="h-8 w-8 text-primary mx-auto mb-2" /><h1 className="text-xl font-bold">Upgrade Plan</h1><p className="text-sm text-muted-foreground mt-1">Akses penuh semua fitur AI</p></div>

          <div className="space-y-3 mb-6">
            {PLANS.map(p => (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`w-full rounded-xl p-4 text-left border-2 transition ${selectedPlan === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <div><p className="font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.id === "pro" ? "Unlimited strategi + analytics" : "Multi-brand + team"}</p></div>
                  <div className="text-right"><p className="text-lg font-bold">{p.label}</p><p className="text-[10px] text-muted-foreground">{p.period}</p></div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            <div className="grid gap-1.5"><Label className="text-sm">Nama</Label><Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nama lengkap" /></div>
            <div className="grid gap-1.5"><Label className="text-sm">Email</Label><Input value={userEmail} disabled className="bg-muted/50" /></div>
            <div className="grid gap-1.5"><Label className="text-sm">WhatsApp</Label><Input value={userWA} onChange={e => setUserWA(e.target.value)} placeholder="08xxxxxxxxxx" /></div>
          </div>

          <Button onClick={() => { if (!userName || !userWA) { toast.error("Isi nama & WhatsApp"); return; } setStep("payment"); }} className="w-full h-12 text-primary-foreground font-semibold" style={{ background: "var(--gradient-hero)" }}>Lanjut ke Pembayaran →</Button>
        </Card>}

        {/* Step 2: Payment method */}
        {step === "payment" && <Card className="p-6">
          <button onClick={() => setStep("plan")} className="text-xs text-primary mb-4">← Kembali</button>
          <h2 className="text-lg font-bold mb-1">Pilih Metode Pembayaran</h2>
          <p className="text-sm text-muted-foreground mb-4">Transfer <strong>{plan.label}</strong> ke salah satu rekening berikut:</p>

          <div className="space-y-3 mb-6">
            {PAYMENT_METHODS.map(m => (
              <button key={m.id} onClick={() => setSelectedMethod(m.id)} className={`w-full rounded-xl p-4 text-left border-2 transition ${selectedMethod === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="font-semibold text-sm">{m.label}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-bold font-mono">{m.detail}</p>
                  <button onClick={(e) => { e.stopPropagation(); copyNumber(m.detail); }} className="text-xs text-primary"><Copy className="h-4 w-4" /></button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">a.n. {m.name}</p>
              </button>
            ))}
          </div>

          {selectedMethod && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
            <p className="text-xs text-amber-800 font-medium">📌 Transfer tepat <strong>{plan.label}</strong> ke:</p>
            <p className="text-sm font-bold font-mono mt-1">{method?.detail}</p>
            <p className="text-[10px] text-amber-700 mt-1">a.n. {method?.name} ({method?.label})</p>
          </div>}

          {/* Screenshot upload */}
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">📸 Upload Bukti Transfer</Label>
            <label className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition ${uploaded ? "border-emerald-300 bg-emerald-50" : "border-border hover:border-primary"}`}>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : uploaded ? <><Check className="h-5 w-5 text-emerald-600" /><span className="text-xs text-emerald-700 font-medium">Screenshot terupload ✓</span></> : <><Upload className="h-5 w-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Tap untuk upload screenshot</span></>}
            </label>
          </div>

          <Button onClick={handleConfirm} disabled={!selectedMethod || uploading} className="w-full h-12 text-primary-foreground font-semibold" style={{ background: "var(--gradient-hero)" }}>
            Konfirmasi via WhatsApp →
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-3">Klik tombol di atas → otomatis buka WhatsApp admin untuk konfirmasi</p>
        </Card>}

        {/* Step 3: Confirmation */}
        {step === "confirm" && <Card className="p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Check className="h-8 w-8 text-emerald-600" /></div>
          <h2 className="text-lg font-bold">Konfirmasi Terkirim! 🎉</h2>
          <p className="text-sm text-muted-foreground mt-2">Tim kami akan verifikasi pembayaran kamu dalam 1x24 jam. Setelah diverifikasi, plan Pro langsung aktif.</p>
          <p className="text-xs text-muted-foreground mt-4">Cek WhatsApp kamu untuk update status.</p>
          <Link to="/"><Button variant="outline" className="mt-6">Kembali ke Dashboard</Button></Link>
        </Card>}

        <p className="text-center text-[10px] text-muted-foreground mt-4">🔒 Pembayaran aman · Garansi 7 hari uang kembali</p>
      </div>
    </div>
  );
}
