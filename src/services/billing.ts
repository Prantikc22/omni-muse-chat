import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a checkout session via Supabase Edge Function 'createCheckoutSession'
 */
export async function createCheckoutSessionClient({
  productHandle,
  successUrl,
  cancelUrl,
}: {
  productHandle: string;
  successUrl: string;
  cancelUrl?: string;
}) {
  const userResp = await supabase.auth.getUser();
  const user = (userResp as any)?.data?.user;
  if (!user) throw new Error("Not authenticated");

  const res = await (supabase as any).functions.invoke("createCheckoutSession", {
    body: JSON.stringify({
      user_id: user.id,
      product_handle: productHandle,
      success_url: successUrl,
      cancel_url: cancelUrl || successUrl,
    }),
  });

  if (res?.error) throw res.error;

  const payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

  // ✅ Redirect user to hosted Dodo checkout page
  if (payload?.checkout_url) {
    window.location.href = payload.checkout_url;
  }

  return payload;
}

/**
 * Grant free tier to a user directly (no Dodopayments).
 */
export async function grantFreeTierToUser(userId: string) {
  const { error } = await (supabase as any).from("user_subscriptions").upsert(
    {
      user_id: userId,
      product_id: "free",
      status: "active",
      started_at: new Date().toISOString(),
      metadata: { free_tier: true },
    },
    { onConflict: ["user_id", "product_id"] },
  );

  if (error) {
    console.warn("Failed to grant free tier:", error);
    throw error;
  }
  return true;
}

/**
 * Helper to fetch current active subscription for user
 */
export async function getActiveSubscriptionForUser(userId: string) {
  const resp = await (supabase as any)
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = resp || { data: null, error: null };
  if (error) return null;
  return data;
}
