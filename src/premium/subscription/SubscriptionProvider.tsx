import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  activateVerifiedSubscription,
  getDaysRemaining,
  getSubscriptionState,
  rememberCheckoutReference,
  startTrial as startTrialInStore,
  SubscriptionState,
} from "./subscriptionStore";
import { SubscriptionPlanId } from "./plans";
import { initiateStkPush, verifyPayment } from "../payments/paymentGateway";

type CheckoutState = {
  planId?: SubscriptionPlanId;
  checkoutRequestId?: string;
  message?: string;
};

type SubscriptionContextValue = {
  state: SubscriptionState;
  isEntitled: boolean;
  daysRemaining: number;
  checkout: CheckoutState;
  refreshSubscription: () => void;
  startTrial: () => void;
  startPayment: (args: {
    planId: SubscriptionPlanId;
    phoneNumber: string;
    businessName: string;
  }) => Promise<void>;
  verifyLatestPayment: () => Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({ status: "loading", lifetime: false });
  const [checkout, setCheckout] = useState<CheckoutState>({});

  const refreshSubscription = useCallback(() => {
    setState(getSubscriptionState());
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const startTrial = useCallback(() => {
    setState(startTrialInStore());
  }, []);

  const startPayment: SubscriptionContextValue["startPayment"] = useCallback(
    async ({ planId, phoneNumber, businessName }) => {
      const response = await initiateStkPush({ planId, phoneNumber, businessName });
      rememberCheckoutReference(response.checkoutRequestId);
      setCheckout({
        planId,
        checkoutRequestId: response.checkoutRequestId,
        message: response.customerMessage || "STK Push sent. Complete payment on the customer phone.",
      });
      refreshSubscription();
    },
    [refreshSubscription],
  );

  const verifyLatestPayment = useCallback(async () => {
    if (!checkout.checkoutRequestId || !checkout.planId) {
      return false;
    }

    const result = await verifyPayment(checkout.checkoutRequestId);
    if (!result.paid || !result.receiptReference) {
      setCheckout((current) => ({
        ...current,
        message: result.message || "Payment is not confirmed yet.",
      }));
      return false;
    }

    setState(activateVerifiedSubscription(checkout.planId, result.receiptReference));
    setCheckout({});
    return true;
  }, [checkout.checkoutRequestId, checkout.planId]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      state,
      isEntitled: state.status === "trial" || state.status === "active",
      daysRemaining: getDaysRemaining(state.lifetime ? undefined : state.paidUntil || state.trialEndsAt),
      checkout,
      refreshSubscription,
      startTrial,
      startPayment,
      verifyLatestPayment,
    }),
    [checkout, refreshSubscription, startPayment, startTrial, state, verifyLatestPayment],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}
