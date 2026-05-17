import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/payment-webhook")({
  server: {
    handlers: {
      // Midtrans notification webhook
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const { order_id, transaction_status, fraud_status } = body;

          console.log("[webhook] Midtrans notification:", { order_id, transaction_status, fraud_status });

          // Only process successful payments
          const isSuccess = (transaction_status === "capture" && fraud_status === "accept") ||
                            transaction_status === "settlement";

          if (!isSuccess) {
            return Response.json({ status: "noted" });
          }

          // Parse plan from order_id: INF-PRO-userid-timestamp or INF-BUSINESS-userid-timestamp
          const parts = order_id.split("-");
          const planRaw = parts[1]?.toLowerCase();
          const plan = planRaw === "pro" ? "pro" : planRaw === "business" ? "business" : null;

          if (!plan) {
            console.error("[webhook] Cannot parse plan from order_id:", order_id);
            return Response.json({ status: "error", message: "Invalid order_id format" });
          }

          // Use service role or anon to update (webhook has no user token)
          const sbUrl = process.env.SUPABASE_URL;
          const sbKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!sbUrl || !sbKey) return new Response("Missing env", { status: 500 });

          const db = createClient(sbUrl, sbKey);

          // Find user by order_id
          const { data: planRow } = await db
            .from("user_plans")
            .select("user_id")
            .eq("midtrans_order_id", order_id)
            .single();

          if (!planRow) {
            console.error("[webhook] No user found for order:", order_id);
            return Response.json({ status: "error", message: "Order not found" });
          }

          // Upgrade plan - set expiry to 30 days from now
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error } = await db
            .from("user_plans")
            .update({
              plan,
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", planRow.user_id);

          if (error) {
            console.error("[webhook] DB update error:", error.message);
            return Response.json({ status: "error" });
          }

          console.log("[webhook] User upgraded:", planRow.user_id, "→", plan);
          return Response.json({ status: "ok" });
        } catch (e) {
          console.error("[webhook] Error:", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
