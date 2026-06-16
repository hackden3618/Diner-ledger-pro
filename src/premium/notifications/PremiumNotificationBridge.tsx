import { useApp } from "@/database/AppContext";
import { useSubscription } from "@/premium/subscription/SubscriptionProvider";
import { useEffect } from "react";
import { registerForPushNotificationsAsync, scheduleLocalBusinessAlert } from "./notificationService";

export default function PremiumNotificationBridge() {
  const { businessName, meals, debtors, creditors, transactions } = useApp();
  const { isEntitled } = useSubscription();

  useEffect(() => {
    if (!isEntitled) return;
    registerForPushNotificationsAsync(businessName).catch((error) => {
      console.warn("Push notification registration failed:", error);
    });
  }, [businessName, isEntitled]);

  useEffect(() => {
    if (!isEntitled) return;

    const lowStockMeals = meals.filter((meal) => meal.stock <= meal.lowAlert);
    if (lowStockMeals.length > 0) {
      scheduleLocalBusinessAlert(
        "low_stock",
        "Low stock needs attention",
        `${lowStockMeals.slice(0, 3).map((meal) => meal.name).join(", ")} ${lowStockMeals.length > 3 ? "and more " : ""}below alert level.`,
        8,
      ).catch((error) => console.warn("Low stock notification failed:", error));
    }
  }, [isEntitled, meals]);

  useEffect(() => {
    if (!isEntitled) return;

    const outstandingDebtors = debtors.filter((debtor) => debtor.totalOwed - debtor.totalPaid > 0);
    const outstandingCreditors = creditors.filter((creditor) => creditor.totalOwed - creditor.totalPaid > 0);
    if (outstandingDebtors.length + outstandingCreditors.length > 0) {
      scheduleLocalBusinessAlert(
        "balances",
        "Balances to review",
        `${outstandingDebtors.length} debtor(s), ${outstandingCreditors.length} creditor(s) still open.`,
        24,
      ).catch((error) => console.warn("Balance notification failed:", error));
    }
  }, [creditors, debtors, isEntitled]);

  useEffect(() => {
    if (!isEntitled) return;

    const today = new Date().toDateString();
    const todayTransactions = transactions.filter((tx) => new Date(tx.date).toDateString() === today);
    const hasCollections = todayTransactions.some((tx) => tx.type === "collection");
    const hasMoneyActivity = todayTransactions.some((tx) =>
      ["sale", "debtor_payment", "opening_balance"].includes(tx.type),
    );
    const hour = new Date().getHours();

    if (hour >= 20 && hasMoneyActivity && !hasCollections) {
      scheduleLocalBusinessAlert(
        "collection_pending",
        "Collection not recorded",
        "Cash and M-Pesa collection has not been recorded for today.",
        4,
      ).catch((error) => console.warn("Collection notification failed:", error));
    }
  }, [isEntitled, transactions]);

  return null;
}
