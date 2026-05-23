import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-xl font-bold">Legal</h1>
        </div>

        {/* Privacy Policy */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Privacy Policy</h2>
          <p className="text-xs text-muted-foreground">Terakhir diperbarui: Mei 2026</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Data yang kami kumpulkan:</strong> Nama, email (dari Google OAuth), data strategi konten yang Anda buat, dan metrik performa yang Anda input secara manual.</p>
            <p><strong className="text-foreground">Penggunaan data:</strong> Data digunakan semata-mata untuk menyediakan layanan Influencer Launchpad — generate strategi, analitik, dan insight AI. Kami tidak menjual data Anda ke pihak ketiga.</p>
            <p><strong className="text-foreground">Penyimpanan:</strong> Data disimpan di Supabase (infrastruktur cloud) dengan enkripsi standar industri. Screenshot pembayaran disimpan di storage terenkripsi.</p>
            <p><strong className="text-foreground">AI Processing:</strong> Data brand dan konten Anda diproses oleh AI (Google Gemini) untuk menghasilkan strategi dan insight. Data tidak digunakan untuk training model AI.</p>
            <p><strong className="text-foreground">Cookies:</strong> Kami menggunakan cookies untuk autentikasi sesi login. Tidak ada tracking cookies pihak ketiga selain Meta Pixel untuk keperluan iklan.</p>
            <p><strong className="text-foreground">Hak Anda:</strong> Anda dapat menghapus akun dan semua data kapan saja melalui halaman Settings atau menghubungi admin via WhatsApp.</p>
            <p><strong className="text-foreground">Kontak:</strong> Untuk pertanyaan privasi, hubungi kami di WhatsApp 085656787625.</p>
          </div>
        </section>

        {/* Terms of Service */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Terms of Service</h2>
          <p className="text-xs text-muted-foreground">Terakhir diperbarui: Mei 2026</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Layanan:</strong> Influencer Launchpad adalah platform SaaS yang membantu content creator membuat strategi konten menggunakan AI. Kami menyediakan tools, bukan jaminan hasil.</p>
            <p><strong className="text-foreground">Akun:</strong> Anda bertanggung jawab atas keamanan akun Google yang digunakan untuk login. Satu akun per individu/bisnis.</p>
            <p><strong className="text-foreground">Pembayaran:</strong> Pembayaran dilakukan via transfer bank/e-wallet. Plan aktif setelah verifikasi admin (maksimal 1x24 jam). Garansi uang kembali 7 hari jika tidak puas.</p>
            <p><strong className="text-foreground">Penggunaan yang dilarang:</strong> Dilarang menggunakan platform untuk konten ilegal, SARA, penipuan, atau spam. Pelanggaran mengakibatkan penonaktifan akun tanpa refund.</p>
            <p><strong className="text-foreground">Konten yang dihasilkan:</strong> Konten yang di-generate AI adalah milik Anda sepenuhnya. Kami tidak mengklaim kepemilikan atas output yang dihasilkan.</p>
            <p><strong className="text-foreground">Ketersediaan:</strong> Kami berusaha menjaga uptime 99%, namun tidak menjamin ketersediaan tanpa gangguan. Maintenance dilakukan dengan pemberitahuan minimal 24 jam.</p>
            <p><strong className="text-foreground">Pembatalan:</strong> Anda dapat membatalkan langganan kapan saja. Akses Pro/Business berlaku hingga akhir periode yang sudah dibayar.</p>
            <p><strong className="text-foreground">Perubahan:</strong> Kami berhak mengubah terms ini dengan pemberitahuan 7 hari sebelumnya via email atau dashboard.</p>
          </div>
        </section>

        {/* Refund Policy */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Refund Policy</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Garansi 7 hari uang kembali untuk semua plan berbayar. Jika Anda tidak puas dalam 7 hari pertama setelah aktivasi, hubungi admin via WhatsApp untuk proses refund penuh.</p>
            <p>Setelah 7 hari, refund tidak berlaku. Anda tetap dapat membatalkan langganan untuk periode berikutnya.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
