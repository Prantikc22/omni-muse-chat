import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog"; // if you have a Dialog; otherwise use simple markup
import { Button } from "@/components/ui/button";
import { createCheckoutSessionClient } from "@/services/billing";
import { toast } from "sonner";

// If you don't have a Dialog component, use simple conditional rendering with a fixed overlay.

export default function PricingModal({ open, onOpenChange, currentPlan }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPlan?: string | null;
}) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    { handle: "free", title: "Free", priceText: "Free" },
    { handle: "starter", title: "Starter", priceText: "$2.99 / mo" },
    { handle: "pro", title: "Pro", priceText: "$7.99 / mo" },
    { handle: "premium", title: "Premium", priceText: "$14.99 / mo" }, // added
    { handle: "business", title: "Business", priceText: "$24.99 / mo" },
  ];
  

  const subscribe = async (planHandle: string) => {
    setLoadingPlan(planHandle);
    try {
      if (planHandle === "free") {
        // if you want to directly call grantFreeTierToUser from client, do it elsewhere; here we just close
        toast.success("Free plan selected (client-side).");
        onOpenChange(false);
        return;
      }
      const session = await createCheckoutSessionClient({
        productHandle: planHandle,
        successUrl: window.location.origin + "/billing/success",
        cancelUrl: window.location.origin + "/billing/cancel",
      });

      // dodge variations in response shape
      const url = session?.checkout_url || session?.url || session?.payment_url || session?.session?.url;
      if (!url) {
        console.error("Missing checkout url in session", session);
        toast.error("Failed to create checkout session");
        setLoadingPlan(null);
        return;
      }
      // redirect
      window.location.href = url;
    } catch (err: any) {
      console.error("subscribe error", err);
      toast.error(err?.message || "Subscription failed");
      setLoadingPlan(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="bg-card p-6 z-10 rounded-lg w-[520px] max-w-full">
        <h3 className="text-lg font-semibold mb-2">Upgrade plan</h3>
        <p className="text-sm mb-4">Current plan: {currentPlan || "Free"}</p>
        <div className="grid grid-cols-2 gap-3">
          {plans.map(p => (
            <div key={p.handle} className="p-3 border rounded flex flex-col justify-between">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-muted-foreground">{p.priceText}</div>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => subscribe(p.handle)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === p.handle ? "Loading..." : (p.handle === currentPlan ? "Current" : (p.handle === "free" ? "Activate free" : "Upgrade"))}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </div>
  );
}
