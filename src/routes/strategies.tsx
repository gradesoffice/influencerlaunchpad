import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/strategies")({
  head: () => ({ meta: [{ title: "Strategi Saya — Influencer Launchpad" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/login" });
    }
  },
  component: StrategiesPage,
});

type StrategyItem = {
  id: string;
  niche: string;
  platform: string;
  created_at: string;
  posts_per_day: number;
  brand: { tagline?: string };
};

function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStrategies(); }, []);

  const loadStrategies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("strategies")
      .select("id, niche, platform, created_at, posts_per_day, brand")
      .order("created_at", { ascending: false });
    setStrategies((data as unknown as StrategyItem[]) ?? []);
    setLoading(false);
  };

  const deleteStrategy = async (id: string) => {
    if (!confirm("Hapus strategi ini? Semua data minggu dan feedback akan ikut terhapus.")) return;
    const { error } = await supabase.from("strategies").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus"); return; }
    toast.success("Strategi dihapus");
    setStrategies(s => s.filter(x => x.id !== id));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--gradient-soft)" }}>
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button></Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Strategi Saya</h1>
          <Link to="/"><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Buat Baru</Button></Link>
        </div>

        {strategies.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold">Belum ada strategi</h2>
            <p className="mt-1 text-sm text-muted-foreground">Buat strategi pertama kamu.</p>
            <Link to="/"><Button className="mt-4">Buat Strategi</Button></Link>
          </Card>
        ) : (
          <div className="grid gap-3">
            {strategies.map(s => (
              <Card key={s.id} className="p-5 flex items-center justify-between gap-4 hover:shadow-md transition">
                <Link to="/" className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.niche}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="secondary">{s.platform}</Badge>
                    <Badge variant="outline">{s.posts_per_day} konten/hari</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  {s.brand?.tagline && <p className="mt-1 text-xs italic text-muted-foreground truncate">{s.brand.tagline}</p>}
                </Link>
                <Button variant="ghost" size="sm" onClick={() => deleteStrategy(s.id)} className="text-destructive hover:text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
