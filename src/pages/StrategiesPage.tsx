import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); const { data } = await supabase.from("strategies").select("id, niche, platform, created_at, posts_per_day, brand").order("created_at", { ascending: false }); setStrategies(data ?? []); setLoading(false); };
  const del = async (id: string) => { if (!confirm("Hapus strategi ini?")) return; await supabase.from("strategies").delete().eq("id", id); setStrategies(s => s.filter(x => x.id !== id)); toast.success("Dihapus"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--gradient-soft)" }}>
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-3xl">
        <Link to="/"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button></Link>
        <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Strategi Saya</h1><Link to="/"><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Buat Baru</Button></Link></div>
        {strategies.length === 0 ? <Card className="p-12 text-center"><p className="text-muted-foreground">Belum ada strategi.</p><Link to="/"><Button className="mt-4">Buat Strategi</Button></Link></Card> : (
          <div className="grid gap-3">{strategies.map(s => (
            <Card key={s.id} className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0"><p className="font-semibold truncate">{s.niche}</p><div className="mt-1 flex gap-2"><Badge variant="secondary">{s.platform}</Badge><span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("id-ID")}</span></div></div>
              <Button variant="ghost" size="sm" onClick={() => del(s.id)} className="text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}
