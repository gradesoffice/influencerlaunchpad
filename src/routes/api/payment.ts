import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { z } from "zod";
import { getUserPlanAndLimits } from "@/lib/check-plan";

const PLAN_PRICES = {
  pro: { price: 99000, name: "Pro Plan - Influencer Launchpad" },
  business: { price: 249000, name: "Business Plan - Influencer Launchpad" },
} as const;

const CreatePaymentSchema = z.object({
  plan: z.enum(["pro", "business"]),
});

export const Route = createFileRoute("/api/payment")({
  server: {
    handlers: {
      // Create Midtrans Snap token
      POST: async ({ request }: { request: Request }) => {
        try {
          const planCheck = await getUserPlanAndLimits(request);
          if (planCheck.error) return new Response(planCheck.error, { status: planCheck.status });
          const { user, db } = planCheck;

          const body = await request.json();
          const { plan } = CreatePaymentSchema.parse(body);
          const planInfo = PLAN_PRICES[plan];

          const serverKey = process.env.MIDTRANS_SERVER_KEY;
          if (!serverKey) return new Response("Missing MIDTRANS_SERVER_KEY", { status: 500 });

          const orderId = `INF-${plan.toUpperCase()}-${user.id.substring(0, 8)}-${Date.now()}`;

          // Create Midtrans Snap transaction
          const authString = btoa(`${serverKey}:`);
          const midtransRes = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${authString}`,
            },
            body: JSON.stringify({
              transaction_details: {
                order_id: orderId,
                gross_amount: planInfo.price,
              },
              item_details: [{
                id: plan,
                price: planInfo.price,
                quantity: 1,
                name: planInfo.name,
              }],
              customer_details: {
                email: user.email,
              },
              metadata: {
                user_id: user.id,
                plan,
              },
            }),
          });

          if (!midtransRes.ok) {
            const err = await midtransRes.text();
            console.error("[payment] Midtrans error:", err);
            return new Response("Payment gateway error", { status: 502 });
          }

          const { token, redirect_url } = await midtransRes.json();

          // Save order reference
          await db.from("user_plans").upsert({
            user_id: user.id,
            midtrans_order_id: orderId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          return Response.json({ token, redirect_url, orderId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "error";
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
