// src/pages/BillingSuccess.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Accept both names used by providers: session_id or subscription_id
  const incomingId =
    searchParams.get("session_id") || searchParams.get("subscription_id") || null;
  const status = (
    searchParams.get("status") || searchParams.get("state") || ""
  ).toLowerCase();

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null); // true = found, false = not found
  const [infoSource, setInfoSource] = useState<
    "checkout_sessions" | "user_subscriptions" | null
  >(null);

  useEffect(() => {
    (async () => {
      try {
        if (!incomingId) {
          setVerified(false);
          setLoading(false);
          // No id -> return to app after short delay
          window.setTimeout(() => navigate("/"), 3000);
          return;
        }

        setLoading(true);

        // Cast supabase to any to avoid generated type issues
        const sb = supabase as any;

        // 1) Try exact match in checkout_sessions by dodopay_session_id
        const { data: checkoutRows, error: chkErr } = await sb
          .from("checkout_sessions")
          .select("id, user_id, product_id, dodopay_session_id, status, created_at")
          .eq("dodopay_session_id", incomingId)
          .limit(1);

        if (!chkErr && Array.isArray(checkoutRows) && checkoutRows.length > 0) {
          setVerified(true);
          setInfoSource("checkout_sessions");
          setLoading(false);
          // Auto-redirect to app after short delay so user returns
          window.setTimeout(() => navigate("/"), 2000);
          return;
        }

        // 2) Try exact match in user_subscriptions by dodopay_subscription_id
        const { data: subsRows, error: subsErr } = await sb
          .from("user_subscriptions")
          .select("id, user_id, product_id, status, started_at")
          .eq("dodopay_subscription_id", incomingId)
          .limit(1);

        if (!subsErr && Array.isArray(subsRows) && subsRows.length > 0) {
          setVerified(true);
          setInfoSource("user_subscriptions");
          setLoading(false);
          window.setTimeout(() => navigate("/"), 2000);
          return;
        }

        // Nothing found
        setVerified(false);
        setLoading(false);

        // If not found, gentle UX: show toast and return to app after a short timeout
        window.setTimeout(() => {
          try {
            toast.success(
              "Returning to app — it may take a moment for the webhook to arrive."
            );
          } catch (e) {
            /* ignore toast problems */
          }
          navigate("/");
        }, 5000);
      } catch (err) {
        console.error("BillingSuccess verification error", err);
        setVerified(false);
        setLoading(false);
        window.setTimeout(() => navigate("/"), 3000);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingId]);

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="bg-card p-8 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">
          {status === "active"
            ? "Subscription active!"
            : status === "cancelled"
            ? "Subscription cancelled"
            : "Billing result"}
        </h1>

        <p className="mb-4">
          {incomingId ? (
            <>We received the payment provider response. ID: <code>{incomingId}</code></>
          ) : (
            <>No session or subscription id was provided in the URL.</>
          )}
        </p>

        <div className="mb-4">
          {loading ? (
            <div>Verifying…</div>
          ) : verified === true ? (
            <div className="text-green-500">Verification succeeded. Redirecting back to the app…</div>
          ) : (
            <div>
              <div className="mb-2 text-yellow-400">Could not verify the session automatically.</div>
              <div className="text-sm">You will be returned to the app shortly. If the subscription doesn't appear, wait a minute for the webhook to finish or contact support.</div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => navigate("/")}>Back to app now</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload / Re-check
          </Button>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Note: this page will automatically return you to the app after verification. If you prefer, click "Back to app now".
        </div>
      </div>
    </div>
  );
}
