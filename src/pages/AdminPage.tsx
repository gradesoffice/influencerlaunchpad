import { useState, useEffect } from "react";
import { Loader2, Check, X, Crown, ArrowLeft, Users, CreditCard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const ADMIN_EMAILS = ["gradesofficialid@gmail.com", "gradesofficial@gmail.com", "gradesoffice@gmail.com"];

type UserRow = { id: string; email: string; plan: string; expires_at: string | null; created_at: string };

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "credits" | "stats">("stats");

  useEffect(() => { checkAdmin(); }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      setIsAdmin(false); setLoading(false); return;
    }
    setIsAdmin(true);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    // Load all strategies (has user email via join or we get from user_plans)
    const { data: plans } = await (supabase.from("user_plans") as any).select("user_id, plan, expires_at, created_at").order("created_at", { ascending: false });
    // Load strategies to get emails
    const { data: strats } = await (supabase.from("strategies") as any).select("user_id, niche").order("created_at", { ascending: false });
    
    // Build user list with emails from auth (we'll use user_id for now, email from strategies niche as fallback)
    const userMap = new Map<string, UserRow>();
    (plans ?? []).forEach((p: any) => {
      userMap.set(p.user_id, { id: p.user_id, email: "", plan: p.plan, expires_at: p.expires_at, created_at: p.created_at });
    });
    setUsers(Array.from(userMap.values()));
  };

  const findUserByEmail = async (email: string): Promise<string | null> => {
    // Search in Supabase auth via admin or strategies table
    const { data } = await (supabase.from("strategies") as any).select("user_id").limit(100);
    // We can't directly query auth.users from client, so we'll use a workaround
    // For now, search usage_logs or strategies
    const { data: allPlans } = await (supabase.from("user_plans") as any).select("user_id, plan");
    
    // Try to find via supabase auth
    // Actually we need to use the email directly - let's query via RPC or just accept user_id
    // Best approach: search by checking if email matches in auth
    return null; // Will use direct user_id input as fallback
  };

  const approvePlanByEmail = async (emailOrId: string, plan: string) => {
    setProcessing(emailOrId);
    try {
      let userId = emailOrId;
      
      // If it looks like an email, try to find user_id
      if (emailOrId.includes("@")) {
        // Use Supabase admin API workaround - check strategies table
        const { data: strats } = await (supabase.from("strategies") as any).select("user_id");
        // We can't resolve email->id from client without admin API
        // So we'll use a different approach: query all user_plans and match
        toast.error("Gunakan user_id (UUID). Cek di Supabase → Authentication → Users.");
        setProcessing(null);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await (supabase.from("user_plans") as any).upsert({ user_id: userId, plan, expires_at: expiresAt.toISOString() }, { onConflict: "user_id" });
      toast.success(`Plan ${plan} aktif!`);
      await loadData();
    } catch { toast.error("Gagal"); }
    setProcessing(null);
  };

  const revokePlan = async (userId: string) => {
    setProcessing(userId);
    await (supabase.from("user_plans") as any).update({ plan: "free", expires_at: null }).eq("user_id", userId);
    toast.success("Revoked ke Free");
    await loadData();
    setProcessing(null);
  };

  const addCredits = async (userId: string, amount: number) => {
    setProcessing(userId);
    try {
      const { data: existing } = await (supabase.from("image_credits") as any).select("credits").eq("user_id", userId).single();
      if (existing) {
        await (supabase.from("image_credits") as any).update({ credits: existing.credits + amount, updated_at: new Date().toISOString() }).eq("user_id", userId);
      } else {
        await (supabase.from("image_credits") as any).insert({ user_id: userId, credits: amount });
      }
      toast.success(`+${amount} credits!`);
    } catch { toast.error("Gagal"); }
    setProcessing(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center p-6"><div className="text-center"><p className="text-2xl mb-2">🔒</p><p className="text-sm text-muted-foreground">Access denied.</p><a href="/" className="text-xs text-primary mt-4 block">← Kembali</a></div></div>;

  // Stats
  const totalUsers = users.length;
  const proUsers = users.filter(u => u.plan === "pro").length;
  const bizUsers = users.filter(u => u.plan === "business").length;
  const freeUsers = users.filter(u => u.plan === "free").length;
  const estRevenue = proUsers * 99000 + bizUsers * 249000;

  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 md:p-8">
      <Toaster richColors position="top-center" />
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <h1 className="text-xl font-bold">Admin</h1>
          </div>
          <Badge className="bg-rose-500 text-white text-[9px]">PRIVATE</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button onClick={() => setActiveTab("stats")} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition ${activeTab === "stats" ? "bg-white shadow-sm" : "text-muted-foreground"}`}><BarChart3 className="h-3.5 w-3.5 inline mr-1.5" />Laporan</button>
          <button onClick={() => setActiveTab("plans")} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition ${activeTab === "plans" ? "bg-white shadow-sm" : "text-muted-foreground"}`}><Crown className="h-3.5 w-3.5 inline mr-1.5" />Plans</button>
          <button onClick={() => setActiveTab("credits")} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition ${activeTab === "credits" ? "bg-white shadow-sm" : "text-muted-foreground"}`}><CreditCard className="h-3.5 w-3.5 inline mr-1.5" />Credits</button>
        </div>

        {/* STATS TAB */}
        {activeTab === "stats" && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center"><p className="text-2xl font-bold">{totalUsers}</p><p className="text-[10px] text-muted-foreground">Total Users</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{freeUsers}</p><p className="text-[10px] text-muted-foreground">Free</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-bold text-primary">{proUsers}</p><p className="text-[10px] text-muted-foreground">Pro</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-bold text-violet-600">{bizUsers}</p><p className="text-[10px] text-muted-foreground">Business</p></Card>
          </div>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Estimasi MRR</p>
            <p className="text-3xl font-bold">Rp {estRevenue.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{proUsers} Pro × 99rb + {bizUsers} Biz × 249rb</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold mb-3">User Terdaftar</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono truncate">{u.id.slice(0, 8)}...</p>
                    <Badge className={`text-[8px] mt-0.5 ${u.plan === "business" ? "bg-violet-600" : u.plan === "pro" ? "bg-primary" : "bg-muted text-muted-foreground"}`}>{u.plan}</Badge>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "—"}</p>
                </div>
              ))}
            </div>
          </Card>
        </>}

        {/* PLANS TAB */}
        {activeTab === "plans" && <>
          <Card className="p-5">
            <p className="text-xs font-semibold mb-1">Upgrade User Plan</p>
            <p className="text-[10px] text-muted-foreground mb-3">Paste user_id → pilih plan → approve. Cek user_id di Supabase → Authentication → Users.</p>
            <PlanForm onSubmit={approvePlanByEmail} processing={processing} />
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold mb-3">Active Plans</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {users.filter(u => u.plan !== "free").map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono truncate">{u.id}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={u.plan === "business" ? "bg-violet-600" : "bg-primary"}>{u.plan}</Badge>
                      {u.expires_at && <span className="text-[9px] text-muted-foreground">exp: {new Date(u.expires_at).toLocaleDateString("id-ID")}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-rose-500" onClick={() => revokePlan(u.id)} disabled={processing === u.id}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              {users.filter(u => u.plan !== "free").length === 0 && <p className="text-xs text-muted-foreground italic">Belum ada user berbayar.</p>}
            </div>
          </Card>
        </>}

        {/* CREDITS TAB */}
        {activeTab === "credits" && <>
          <Card className="p-5">
            <p className="text-xs font-semibold mb-1">Tambah Image Credits</p>
            <p className="text-[10px] text-muted-foreground mb-3">User bayar → paste user_id → pilih paket → tambah.</p>
            <CreditForm onSubmit={addCredits} processing={processing} />
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold mb-2">Pricing Reference</p>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="rounded-lg bg-muted/30 p-2"><p className="font-bold">10 gambar</p><p className="text-muted-foreground">Rp 18.000</p></div>
              <div className="rounded-lg bg-primary/10 p-2"><p className="font-bold">30 gambar</p><p className="text-muted-foreground">Rp 39.000</p></div>
              <div className="rounded-lg bg-muted/30 p-2"><p className="font-bold">50 gambar</p><p className="text-muted-foreground">Rp 59.000</p></div>
            </div>
          </Card>
        </>}
      </div>
    </div>
  );
}

function PlanForm({ onSubmit, processing }: { onSubmit: (id: string, plan: string) => void; processing: string | null }) {
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState("pro");
  return (
    <div className="flex gap-2">
      <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="user_id (UUID)" className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs" />
      <select value={plan} onChange={e => setPlan(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
        <option value="pro">Pro (99rb)</option>
        <option value="business">Business (249rb)</option>
      </select>
      <Button size="sm" className="h-9" onClick={() => { if (userId.trim()) onSubmit(userId.trim(), plan); }} disabled={!userId.trim() || processing === userId}>
        {processing === userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function CreditForm({ onSubmit, processing }: { onSubmit: (id: string, amount: number) => void; processing: string | null }) {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("10");
  return (
    <div className="flex gap-2">
      <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="user_id (UUID)" className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs" />
      <select value={amount} onChange={e => setAmount(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
        <option value="10">+10 (Rp 18rb)</option>
        <option value="30">+30 (Rp 39rb)</option>
        <option value="50">+50 (Rp 59rb)</option>
        <option value="5">+5 (custom)</option>
        <option value="100">+100 (custom)</option>
      </select>
      <Button size="sm" className="h-9 bg-violet-600 hover:bg-violet-700" onClick={() => { if (userId.trim()) onSubmit(userId.trim(), parseInt(amount)); }} disabled={!userId.trim() || processing === userId}>
        {processing === userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
    </div>
  );
}
