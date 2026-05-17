import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { asArray, asRecord, asString, asStringArray, repairJsonText } from "@/lib/ai-json";
import { createAiGatewayProvider } from "@/lib/ai-gateway";
import { createClient } from "@supabase/supabase-js";
import { getUserPlanAndLimits, checkDailyRateLimit, logUsage } from "@/lib/check-plan";

const InputSchema = z.object({
  niche: z.string().min(1).max(300),
  platform: z.string().min(1).max(100),
  audience: z.string().min(1).max(500),
  message: z.string().min(1).max(500),
  conversionGoal: z.string().min(1).max(300),
  tone: z.string().max(200).optional().default(""),
  postsPerDay: z.number().int().min(1).max(10),
});

const normalizeStrategy = (value: unknown) => {
  const root = asRecord(value);
  const brand = asRecord(root.brand);
  const phases = asArray(root.phases);
  const defaultPillars = [
    { name: "Edukasi", description: "Konten yang mengajari audiens memahami masalah dan solusi utama." },
    { name: "Bukti", description: "Konten studi kasus, hasil, testimoni, dan proses kerja untuk membangun trust." },
    { name: "Konversi", description: "Konten ajakan aksi yang relevan dengan penawaran tanpa terasa memaksa." },
  ];
  const defaultPhases = [
    { name: "Foundation", days: "Day 1-30", objective: "Membangun positioning, pesan utama, dan trust awal.", kpis: ["Reach", "Profile visit", "Engagement"], weeklyThemes: ["Positioning akun", "Masalah audiens", "Edukasi dasar", "Trust building"] },
    { name: "Growth", days: "Day 31-60", objective: "Memperbesar jangkauan dan memperkuat kredibilitas.", kpis: ["Follower growth", "Share", "Save"], weeklyThemes: ["Konten viral relevan", "Story dan opini", "Bukti proses", "Kolaborasi"] },
    { name: "Conversion", days: "Day 61-90", objective: "Mengubah perhatian menjadi leads dan penjualan.", kpis: ["DM masuk", "Lead", "Closing"], weeklyThemes: ["Offer awareness", "Objection handling", "Case study", "Campaign closing"] },
  ];

  return {
    brand: {
      persona: asString(brand.persona, "Persona edukatif yang tegas, relevan, dan fokus membantu audiens mengambil keputusan."),
      voice: asString(brand.voice, "Tegas, praktis, relatable, dan berorientasi hasil."),
      visualStyle: asString(brand.visualStyle, "Visual konsisten dengan hook besar, contoh nyata, warna brand yang mudah dikenali, dan CTA yang jelas."),
      tagline: asString(brand.tagline, "Bangun perhatian, ubah jadi kepercayaan."),
      contentPillars: (asArray(brand.contentPillars).length ? asArray(brand.contentPillars) : defaultPillars).map((item, index) => {
        const pillar = asRecord(item);
        return {
          name: asString(pillar.name, `Pilar ${index + 1}`),
          description: asString(pillar.description, "Konten pendukung positioning brand dan tujuan konversi."),
        };
      }),
      hashtags: asStringArray(brand.hashtags, ["#branding", "#konten", "#bisnis"]),
      dosAndDonts: {
        dos: asStringArray(asRecord(brand.dosAndDonts).dos, ["Konsisten memakai pesan utama dan CTA yang relevan."]),
        donts: asStringArray(asRecord(brand.dosAndDonts).donts, ["Jangan mengganti positioning terlalu sering."]),
      },
    },
    phases: (phases.length ? phases : defaultPhases).map((item, index) => {
      const phase = asRecord(item);
      return {
        name: asString(phase.name, ["Foundation", "Growth", "Conversion"][index] ?? `Phase ${index + 1}`),
        days: asString(phase.days, [`Day 1-30`, `Day 31-60`, `Day 61-90`][index] ?? ""),
        objective: asString(phase.objective, "Meningkatkan trust, awareness, dan konversi secara bertahap."),
        kpis: asStringArray(phase.kpis, ["Reach", "Engagement", "Leads"]),
        weeklyThemes: asStringArray(phase.weeklyThemes, ["Positioning", "Edukasi", "Bukti", "Konversi"]),
      };
    }),
  };
};

export const Route = createFileRoute("/api/strategy")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // Check auth & plan
          const planCheck = await getUserPlanAndLimits(request);
          if (planCheck.error) return new Response(planCheck.error, { status: planCheck.status });
          const { user, limits, db } = planCheck;

          // Check strategy limit
          const { count: stratCount } = await db
            .from("strategies")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          if ((stratCount ?? 0) >= limits.maxStrategies) {
            return new Response(JSON.stringify({ error: "Upgrade plan untuk membuat strategi baru", code: "PLAN_LIMIT" }), { status: 403, headers: { "Content-Type": "application/json" } });
          }

          // Check daily rate limit
          const withinLimit = await checkDailyRateLimit(db, user.id, "generate_strategy", limits.dailyGenerateLimit);
          if (!withinLimit) {
            return new Response(JSON.stringify({ error: "Batas generate harian tercapai. Coba lagi besok atau upgrade plan.", code: "RATE_LIMIT" }), { status: 429, headers: { "Content-Type": "application/json" } });
          }

          const body = await request.json();
          const input = InputSchema.parse(body);
          const key = process.env.AI_GATEWAY_API_KEY;
          if (!key) return new Response("Missing AI_GATEWAY_API_KEY", { status: 500 });

          const gateway = createAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          const { object } = await generateObject({
            model,
            output: "no-schema",
            experimental_repairText: repairJsonText,
            temperature: 0.3,
            maxOutputTokens: 6000,
            system:
              "Kamu adalah ahli strategi influencer & personal branding. Jawab HANYA JSON valid tanpa markdown. Bahasa Indonesia natural dan praktis. Fokus pada konsistensi brand dan konversi.",
            prompt: `Buat strategi 90 hari menuju influencer untuk akun berikut.

Niche/Topik akun: ${input.niche}
Platform utama: ${input.platform}
Target audiens: ${input.audience}
Pesan/keinginan yang ingin disampaikan: ${input.message}
Tujuan konversi: ${input.conversionGoal}
Tone of voice (opsional): ${input.tone || "tentukan tone yang paling cocok"}
Konten per hari: ${input.postsPerDay}

Buat:
1. Brand identity yang konsisten: persona, voice, visual style, tagline, 3-5 content pillars, 5-15 hashtag inti, do's & don'ts.
2. Tepat 3 phase (Day 1-30 Foundation, Day 31-60 Growth, Day 61-90 Conversion). Untuk tiap phase: nama, rentang hari, objective, KPI, dan 4-5 weekly themes.
Pastikan semuanya selaras dengan tujuan konversi.

Kembalikan JSON dengan struktur persis:
{"brand":{"persona":"","voice":"","visualStyle":"","tagline":"","contentPillars":[{"name":"","description":""}],"hashtags":[""],"dosAndDonts":{"dos":[""],"donts":[""]}},"phases":[{"name":"","days":"","objective":"","kpis":[""],"weeklyThemes":[""]}]}`,
          });

          const result = normalizeStrategy(object);

          // Save to Supabase
          let strategyId: string | null = null;
          const { data: saved, error: dbError } = await db.from("strategies").insert({
            user_id: user.id,
            niche: input.niche,
            platform: input.platform,
            audience: input.audience,
            message: input.message,
            conversion_goal: input.conversionGoal,
            tone: input.tone || "",
            posts_per_day: input.postsPerDay,
            brand: result.brand as unknown as Record<string, unknown>,
            phases: result.phases as unknown as Record<string, unknown>[],
          }).select("id").single();
          if (dbError) console.error("[strategy] DB error:", dbError.message);
          strategyId = saved?.id ?? null;

          // Log usage
          await logUsage(db, user.id, "generate_strategy");

          return Response.json({ ...result, strategyId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "error";
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
