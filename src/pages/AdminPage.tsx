import { useState, useEffect } from "react";
import { Loader2, Check, X, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

// Admin email whitelist - only these can access
const ADMIN_EMAILS = ["gradesofficialid@gmail.com"];

type PendingPayment = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  phone: string;
  plan: string;
  screenshot_url: string;
  created_at: string;
  status: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; plan: string; expires_at: string | null }[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

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
    // Load user_plans
    const { data: plans } = await (supabase.from("user_plans") as any).select("user_id, plan, expires_at, created_at").order("created_at", { ascending: false });
    setUsers((plans ?? []).map((p: any) => ({ id: p.user_id, email: "", plan: p.plan, expires_at: p.expires_at })));
  };

  const approvePlan = async (userId: string, plan: string) => {
    setProcessing(userId);
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error } = await (supabase.from("user_plans") as any).upsert({
        user_id: userId,
        plan: plan,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success(`Plan ${plan} diaktifkan!`);
      await loadData();
    } catch (e) {
      toast.error("Gagal update plan");
      console.error(e);
    }
    setProcessing(null);
  };

  const revokePlan = async (userId: string) => {
    setProcessing(userId);
    try {
      await (supabase.from("user_plans") as any).update({ plan: "free", expires_at: null }).eq("user_id", userId);
      toast.success("Plan di-revoke ke Free");
      await loadData();
    } catch { toast.error("Gagal"); }
    setProcessing(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 md:p-8">
      <Toaster richColors position="top-center" />
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-xl font-bold flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Admin Panel</h1>
        </div>

        {/* Quick approve */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Quick Approve</h2>
          <p className="text-xs text-muted-foreground mb-3">Paste user_id dari Supabase, pilih plan, klik approve.</p>
          <QuickApprove onApprove={approvePlan} processing={processing} />
        </Card>

        {/* User list */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Active Plans ({users.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono truncate">{u.id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={u.plan === "business" ? "bg-violet-600" : u.plan === "pro" ? "bg-primary" : "bg-muted text-muted-foreground"}>{u.plan}</Badge>
                    {u.expires_at && <span className="text-[10px] text-muted-foreground">exp: {new Date(u.expires_at).toLocaleDateString("id-ID")}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {u.plan !== "pro" && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => approvePlan(u.id, "pro")} disabled={processing === u.id}>Pro</Button>}
                  {u.plan !== "business" && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => approvePlan(u.id, "business")} disabled={processing === u.id}>Biz</Button>}
                  {u.plan !== "free" && <Button size="sm" variant="ghost" className="h-7 text-[10px] text-rose-500" onClick={() => revokePlan(u.id)} disabled={processing === u.id}><X className="h-3 w-3" /></Button>}
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-xs text-muted-foreground italic">Belum ada user.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickApprove({ onApprove, processing }: { onApprove: (userId: string, plan: string) => void; processing: string | null }) {
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState("pro");

  return (
    <div className="flex gap-2">
      <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="user_id (UUID)" className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs" />
      <select value={plan} onChange={e => setPlan(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
        <option value="pro">Pro</option>
        <option value="business">Business</option>
      </select>
      <Button size="sm" className="h-9" onClick={() => { if (userId.trim()) onApprove(userId.trim(), plan); }} disabled={!userId.trim() || processing === userId}>
        {processing === userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
    </div>
  );
}
