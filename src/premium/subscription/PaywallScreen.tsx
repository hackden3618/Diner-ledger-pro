import { useApp } from "@/database/AppContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUBSCRIPTION_PLANS, SubscriptionPlanId, TRIAL_DAYS } from "./plans";
import { useSubscription } from "./SubscriptionProvider";
import { useCustomAlert } from "@/context/AlertContext";

function fmtKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export default function PaywallScreen() {
    const { showAlert } = useCustomAlert();
  const { businessName } = useApp();
  const {
    state,
    daysRemaining,
    checkout,
    startTrial,
    startPayment,
    verifyLatestPayment,
  } = useSubscription();
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("monthly");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId)!;
  const trialAlreadyUsed = Boolean(state.trialStartedAt);

  const handleStartTrial = () => {
    startTrial();
    showAlert("Trial Started", `${TRIAL_DAYS} days of full access have been activated.`);
  };

  const handleStartPayment = async () => {
    if (!phoneNumber.trim()) {
      showAlert("Phone Required", "Enter the M-Pesa phone number that should receive the STK Push.");
      return;
    }

    try {
      setBusy(true);
      await startPayment({
        planId: selectedPlanId,
        phoneNumber: phoneNumber.trim(),
        businessName,
      });
      showAlert(
        "STK Push Sent",
        "Complete payment on the phone, then tap Confirm Payment. Access unlocks only after payment is verified.",
      );
    } catch (error) {
      showAlert(
        "Payment Setup Needed",
        error instanceof Error ? error.message : "Could not start payment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPayment = async () => {
    try {
      setBusy(true);
      const paid = await verifyLatestPayment();
      showAlert(
        paid ? "Payment Confirmed" : "Still Waiting",
        paid ? "Premium access is active." : checkout.message || "Payment has not been confirmed yet.",
      );
    } catch (error) {
      showAlert(
        "Verification Failed",
        error instanceof Error ? error.message : "Could not verify payment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "var(--background)" }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-7 mt-2">
            <View className="w-16 h-16 rounded-[20px] bg-primary/15 items-center justify-center mb-4">
              <Ionicons name="shield-checkmark" size={34} color="#2ecc71" />
            </View>
            <Text className="text-[26px] font-black text-foreground text-center">
              MealTrack Pro Premium
            </Text>
            <Text className="text-[13px] text-muted-foreground text-center mt-2 leading-5">
              Professional accounting, inventory controls, reports, maintenance,
              customer support, updates from user requests, and custom-code support.
            </Text>
          </View>

          {state.status === "expired" ? (
            <View className="bg-destructive/10 border border-destructive/25 rounded-[14px] p-4 mb-4">
              <Text className="text-[13px] font-bold text-destructive">Access expired</Text>
              <Text className="text-[12px] text-muted-foreground mt-1">
                Renew to continue using operational screens and ledger tools.
              </Text>
            </View>
          ) : null}

          {state.status === "trial" ? (
            <View className="bg-primary/10 border border-primary/25 rounded-[14px] p-4 mb-4">
              <Text className="text-[13px] font-bold text-primary">Trial active</Text>
              <Text className="text-[12px] text-muted-foreground mt-1">
                {daysRemaining} days remaining.
              </Text>
            </View>
          ) : null}

          <View className="gap-3 mb-5">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  className={`rounded-[16px] border p-4 ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  activeOpacity={0.85}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[16px] font-black text-foreground">{plan.label}</Text>
                        <View className="px-2 py-1 rounded-full bg-primary/15">
                          <Text className="text-[9px] font-bold text-primary uppercase">{plan.badge}</Text>
                        </View>
                      </View>
                      <Text className="text-[12px] text-muted-foreground mt-1 leading-5">
                        {plan.description}
                      </Text>
                    </View>
                    <Text className="text-[18px] font-black text-primary">
                      {fmtKes(plan.priceKes)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!trialAlreadyUsed ? (
            <TouchableOpacity
              className="rounded-[16px] bg-foreground py-4 items-center mb-3"
              onPress={handleStartTrial}
              disabled={busy}
            >
              <Text className="text-[14px] font-black text-background">
                Start {TRIAL_DAYS}-Day Free Trial
              </Text>
            </TouchableOpacity>
          ) : null}

          <View className="bg-card border border-border rounded-[16px] p-4 mb-3">
            <Text className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
              Pay with M-Pesa STK Push
            </Text>
            <TextInput
              className="bg-input border border-border rounded-[12px] px-4 py-3 text-foreground text-[14px] mb-3"
              placeholder="Phone e.g. 2547XXXXXXXX"
              placeholderTextColor="var(--muted-dark)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <TouchableOpacity
              className="rounded-[14px] bg-primary py-4 items-center"
              onPress={handleStartPayment}
              disabled={busy}
            >
              <Text className="text-[14px] font-black text-primary-foreground">
                Pay {fmtKes(selectedPlan.priceKes)} for {selectedPlan.label}
              </Text>
            </TouchableOpacity>
            {checkout.checkoutRequestId ? (
              <TouchableOpacity
                className="rounded-[14px] bg-input border border-primary/30 py-4 items-center mt-3"
                onPress={handleVerifyPayment}
                disabled={busy}
              >
                <Text className="text-[14px] font-black text-primary">
                  Confirm Payment
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text className="text-[11px] text-muted-foreground text-center leading-5">
            Payment unlock requires backend verification from M-Pesa. Do not place Daraja secrets in the mobile app.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
