import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, Heart, MessageCircle, Send, ShoppingCart, ArrowLeft, Loader2, Calendar, Sparkles, FileText, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); const { data } = await supabase.from("strategies").select("id, niche, platform, created_at, posts_per_day, brand, phases").order("created_at", { ascending: false }); if (data?.length) { setStrategies(data); await sel(data[0].id); } setLoading(false); };
  const sel = async (id: string) => { setSelected(id); const [{ data: w }, { data: f }] = await Promise.all([supabase.from("weeks").select("week_number, data").eq("strategy_id", id), supabase.from("feedback").select("week_number, day, slot, likes, comments, messages, conversions").eq("strategy_id", id)]); setWeekData(w ?? []); setFeedbackData(f ?? []); };

  const cur = strategies.find(s => s.id === selected);
  const totalWeeks = weekData.length;
  const totalPosts = weekData.reduce((s: number, w: any) => s + (w.data?.days?.reduce((a: number, d: any) => a + (d.posts?.length ?? 0), 0) ?? 0), 0);
  const totals = feedbackData.reduce((a: any, f: any) => ({ posts: a.posts + 1, likes: a.likes + f.likes, comments: a.comments + f.comments, messages: a.messages + f.messages, conversions: a.conversions + f.conversions }), { posts: 0, likes: 0, comments: 0, messages: 0, conversions: 0 });

  const formatCounts: Record<string, number> = {};
  weekData.forEach((w: any) => w.data?.days?.forEach((d: any) => d.posts?.forEach((p: any) => { formatCounts[p.format || "Lainnya"] = (formatCounts[p.format || "Lainnya"] ?? 0) + 1; })));
  const formatChart = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!strategies.length) return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-soft)" }}><Card className="p-12 text-center"><p>Belum ada strategi.</p><Link to="/"><Button className="mt-4">Buat Strategi</Button></Link></Card></div>;

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--gradient-soft)" }}>
      <div className="mx-auto max-w-6xl">
        <Link to="/"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button></Link>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-6"><BarChart3 className="h-8 w-8 text-primary" /> Analytics</h1>
        {strategies.length > 1 && <div className="mb-6 flex flex-wrap gap-2">{strategies.map(s => <Button key={s.id} variant={selected === s.id ? "default" : "outline"} size="sm" onClick={() => sel(s.id)}>{s.niche.substring(0, 25)}</Button>)}</div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <SC icon={<Sparkles className="h-5 w-5" />} label="Strategi" value={strategies.length} />
          <SC icon={<Calendar className="h-5 w-5" />} label="Minggu" value={totalWeeks} />
          <SC icon={<FileText className="h-5 w-5" />} label="Total Konten" value={totalPosts} />
          <SC icon={<ShoppingCart className="h-5 w-5" />} label="Konversi" value={totals.conversions} highlight />
        </div>
        {formatChart.length > 0 && <Card className="p-6 mb-8"><h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Format Konten</h3><ResponsiveContainer width="100%" height={200}><BarChart data={formatChart} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} /><Tooltip /><Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>{formatChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></Card>}
        {totals.posts > 0 && <Card className="p-6"><h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Performa</h3><div className="grid gap-4 sm:grid-cols-4"><SC icon={<Heart className="h-5 w-5" />} label="Likes" value={totals.likes} /><SC icon={<MessageCircle className="h-5 w-5" />} label="Komentar" value={totals.comments} /><SC icon={<Send className="h-5 w-5" />} label="DM" value={totals.messages} /><SC icon={<ShoppingCart className="h-5 w-5" />} label="Konversi" value={totals.conversions} highlight /></div></Card>}
      </div>
    </div>
  );
}

function SC({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return <Card className="p-4"><div className="flex items-center gap-3"><div className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p></div></div></Card>;
}
