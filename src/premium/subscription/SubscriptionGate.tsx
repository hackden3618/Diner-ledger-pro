import LoadingScreen from "@/components/ui/LoadingScreen";
import { usePathname } from "expo-router";
import React, { ReactNode } from "react";
import PaywallScreen from "./PaywallScreen";
import { useSubscription } from "./SubscriptionProvider";

const PUBLIC_ROUTES = new Set(["/onboarding"]);

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, isEntitled } = useSubscription();

  if (state.status === "loading") {
    return <LoadingScreen />;
  }

  if (PUBLIC_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  if (!isEntitled) {
    return <PaywallScreen />;
  }

  return <>{children}</>;
}
