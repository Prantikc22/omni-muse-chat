// src/components/BillingButton.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSessionClient, grantFreeTierToUser } from "@/services/billing";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function BillingButton({ productHandle }: { productHandle: string }) {
  const { user } = useAuth();

  const handleSubscribe = async () => {
    try {
      if (!user) throw new Error("Not signed in");
      if (productHandle === "free") {
        await grantFreeTierToUser(user.id);
        toast.success("Free tier activated");
        return;
      }

      const successUrl = `${window.location.origin}/billing/success`;
      const cancelUrl = `${window.location.origin}/billing/cancel`;

      const result: any = await createCheckoutSessionClient({
        productHandle,
        successUrl,
        cancelUrl
      });

      if (!result?.checkout_url) throw new Error("Missing checkout URL");
      // redirect user to payment page
      window.location.href = result.checkout_url;
    } catch (err: any) {
      console.error("subscribe error", err);
      toast.error(err.message || "Subscription failed");
    }
  };

  return (
    <Button onClick={handleSubscribe}>
      {productHandle === 'free' ? 'Activate Free' : `Subscribe (${productHandle})`}
    </Button>
  );
}
