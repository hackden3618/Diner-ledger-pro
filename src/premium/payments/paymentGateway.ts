import Constants from "expo-constants";
import { getPlan, SubscriptionPlanId } from "../subscription/plans";

export type StkPushRequest = {
  planId: SubscriptionPlanId;
  phoneNumber: string;
  businessName: string;
};

export type StkPushResponse = {
  checkoutRequestId: string;
  merchantRequestId?: string;
  customerMessage?: string;
};

export type PaymentVerificationResponse = {
  paid: boolean;
  receiptReference?: string;
  message?: string;
};

const paymentsApiBaseUrl =
  process.env.EXPO_PUBLIC_PAYMENTS_API_URL ||
  (Constants.expoConfig?.extra?.paymentsApiBaseUrl as string | undefined);

export const PAYMENT_SETUP_NOTES = {
  tillNumber: "TODO: Add your M-Pesa Till/Paybill number in your backend environment, not in the app.",
  backendBaseUrl: "Set EXPO_PUBLIC_PAYMENTS_API_URL to your backend URL, e.g. https://api.yourdomain.com",
  requiredBackendSecrets: [
    "DARAJA_CONSUMER_KEY",
    "DARAJA_CONSUMER_SECRET",
    "DARAJA_PASSKEY",
    "DARAJA_SHORTCODE_OR_TILL",
    "DARAJA_CALLBACK_URL",
  ],
};

function requirePaymentsBackend() {
  if (!paymentsApiBaseUrl) {
    throw new Error(
      "Payment backend is not configured. Set EXPO_PUBLIC_PAYMENTS_API_URL and implement the STK Push endpoints described in src/premium/payments/paymentGateway.ts.",
    );
  }
  return paymentsApiBaseUrl.replace(/\/$/, "");
}

export async function initiateStkPush({
  planId,
  phoneNumber,
  businessName,
}: StkPushRequest): Promise<StkPushResponse> {
  const plan = getPlan(planId);
  const baseUrl = requirePaymentsBackend();

  // Backend endpoint contract:
  // POST /payments/mpesa/stk-push
  // Body: { phoneNumber, amountKes, planId, businessName }
  // Backend must call Safaricom Daraja and return checkoutRequestId.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${baseUrl}/payments/mpesa/stk-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber,
        amountKes: plan.priceKes,
        planId,
        businessName,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Could not initiate M-Pesa STK Push. Please try again.");
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function verifyPayment(checkoutRequestId: string): Promise<PaymentVerificationResponse> {
  const baseUrl = requirePaymentsBackend();

  // Backend endpoint contract:
  // GET /payments/mpesa/verify/:checkoutRequestId
  // Response: { paid: boolean, receiptReference?: string, message?: string }
  // Only unlock premium after the backend confirms Daraja callback success.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${baseUrl}/payments/mpesa/verify/${encodeURIComponent(checkoutRequestId)}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Could not verify payment yet. Please try again after the STK prompt completes.");
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
