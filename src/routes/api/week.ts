import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { asArray, asNumber, asRecord, asString, asStringArray, repairJsonText } from "@/lib/ai-json";
import { createAiGatewayProvider } from "@/lib/ai-gateway";
import { getUserPlanAndLimits, checkDailyRateLimit, logUsage } from "@/lib/check-plan";

const InputSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  postsPerDay: z.number().int().min(1).max(10),
  niche: z.string().min(1).max(300),
  platform: z.string().min(1).max(100),
  audience: z.string().min(1).max(500),
  message: z.string().min(1).max(500),
  conversionGoal: z.string().min(1).max(300),
  brandSummary: z.string().min(1).max(2000),
  phaseName: z.string().min(1).max(200),
  weeklyTheme: z.string().min(1).max(300),
  feedbackInsights: z.string().max(4000).optional().default(""),
  strategyId: z.string().nullish(),
});

const normalizeWeek = (value: unknown, input: z.infer<typeof InputSchema>) => {
  const root = asRecord(value);
  const startDay = (input.weekNumber - 1) * 7 + 1;
  const days = asArray(root.days);
  const sourceDays = days.length ? days : Array.from({ length: 7 }, (_, index) => ({ day: startDay + index, posts: [] }));

  return {
    weekNumber: asNumber(root.weekNumber, input.weekNumber),
    theme: asString(root.theme, input.weeklyTheme),
    focus: asString(root.focus, `Menjalankan tema ${input.weeklyTheme} dengan konten yang menjaga brand dan mengarah ke ${input.conversionGoal}.`),
    days: sourceDays.map((dayItem, dayIndex) => {
      const day = asRecord(dayItem);
      const posts = asArray(day.posts);
      const sourcePosts = posts.length ? posts : Array.from({ length: input.postsPerDay }, (_, index) => ({ slot: `Konten ${index + 1}` }));
      return {
        day: asNumber(day.day, startDay + dayIndex),
        dayLabel: asString(day.dayLabel, `Hari ${startDay + dayIndex}`),
        dailyGoal: asString(day.dailyGoal, "Membangun awareness, trust, dan dorongan aksi."),
        posts: sourcePosts.map((postItem, postIndex) => {
          const post = asRecord(postItem);
          return {
            slot: asString(post.slot, `Konten ${postIndex + 1}`),
            format: asString(post.format, "Video pendek"),
            hook: asString(post.hook, `Hook konten ${postIndex + 1}`),
            caption: asString(post.caption, "Caption singkat yang konsisten dengan brand."),
            cta: asString(post.cta, "Ajak audiens komentar atau DM."),
            hashtags: asStringArray(post.hashtags, ["#konten", "#branding", "#bisnis"]),
            visualIdea: asString(post.visualIdea, "Visual sederhana dengan teks hook besar dan contoh nyata."),
            conversionTie: asString(post.conversionTie, `Mengarah ke ${input.conversionGoal} secara soft-selling.`),
          };
        }),
      };
    }),
  };
};

export const Route = createFileRoute("/api/week")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // Check auth & plan
          const planCheck = await getUserPlanAndLimits(request);
          if (planCheck.error) return new Response(planCheck.error, { status: planCheck.status });
          const { user, limits, db } = planCheck;

          const body = await request.json();
          const input = InputSchema.parse(body);

          // Check week limit per plan
          if (input.weekNumber > limits.maxWeeksPerStrategy) {
            return new Response(JSON.stringify({ error: `Plan kamu hanya bisa generate sampai minggu ${limits.maxWeeksPerStrategy}. Upgrade untuk akses lebih.`, code: "PLAN_LIMIT" }), { status: 403, headers: { "Content-Type": "application/json" } });
          }

          // Check daily rate limit
          const withinLimit = await checkDailyRateLimit(db, user.id, "generate_week", limits.dailyGenerateLimit);
          if (!withinLimit) {
            return new Response(JSON.stringify({ error: "Batas generate harian tercapai. Coba lagi besok atau upgrade plan.", code: "RATE_LIMIT" }), { status: 429, headers: { "Content-Type": "application/json" } });
          }

          const key = process.env.AI_GATEWAY_API_KEY;
          if (!key) return new Response("Missing AI_GATEWAY_API_KEY", { status: 500 });

          const gateway = createAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          const startDay = (input.weekNumber - 1) * 7 + 1;
          const endDay = startDay + 6;

          const { object } = await generateObject({
            model,
            output: "no-schema",
            experimental_repairText: repairJsonText,
            temperature: 0.25,
            maxOutputTokens: Math.min(14000, 3000 + input.postsPerDay * 900),
            system:
              "Kamu adalah content strategist influencer. Jawab HANYA JSON valid tanpa markdown. Buat breakdown harian spesifik, actionable, dan KONSISTEN dengan brand identity. Bahasa Indonesia. Setiap konten mendekatkan audiens ke tujuan konversi tanpa terasa hard-selling tiap hari.",
            prompt: `Buat breakdown konten untuk Minggu ke-${input.weekNumber} (Hari ${startDay} - ${endDay}).

Phase: ${input.phaseName}
Tema minggu ini: ${input.weeklyTheme}

Konteks akun:
- Niche: ${input.niche}
- Platform: ${input.platform}
- Audiens: ${input.audience}
- Pesan: ${input.message}
- Tujuan konversi: ${input.conversionGoal}

Brand identity (WAJIB konsisten):
${input.brandSummary}

${input.feedbackInsights ? `INSIGHTS PERFORMA KONTEN SEBELUMNYA (WAJIB dipakai untuk meningkatkan kualitas):
${input.feedbackInsights}

Replikasi pola hook, format, angle, dan tone dari konten yang performanya BAGUS. Hindari pola dari konten yang performanya buruk. Tetap variatif tapi prioritaskan formula yang terbukti.` : ""}

Buat tepat 7 hari. Tiap hari WAJIB ${input.postsPerDay} konten (slot misal: pagi/siang/malam atau feed/story/reels). Tiap konten berisi: format, hook (kalimat pembuka kuat), caption singkat siap pakai, CTA, 3-7 hashtag relevan, visualIdea (deskripsi visual/shot), conversionTie (bagaimana konten ini menggerakkan audiens menuju tujuan konversi). Variasikan tipe konten (educate, entertain, inspire, story, soft-sell) tapi tone & visual style tetap konsisten.

Kembalikan JSON dengan struktur persis:
{"weekNumber":${input.weekNumber},"theme":"","focus":"","days":[{"day":${startDay},"dayLabel":"","dailyGoal":"","posts":[{"slot":"","format":"","hook":"","caption":"","cta":"","hashtags":[""],"visualIdea":"","conversionTie":""}]}]}`,
          });

          const result = normalizeWeek(object, input);

          // Save to Supabase if strategyId provided
          if (input.strategyId) {
            const { error: dbError } = await db.from("weeks").upsert({
              strategy_id: input.strategyId,
              user_id: user.id,
              week_number: input.weekNumber,
              data: result as unknown as Record<string, unknown>,
            }, { onConflict: "strategy_id,week_number" });
            if (dbError) console.error("[week] DB error:", dbError.message);
          }

          // Log usage
          await logUsage(db, user.id, "generate_week");

          return Response.json(result);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "error";
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
