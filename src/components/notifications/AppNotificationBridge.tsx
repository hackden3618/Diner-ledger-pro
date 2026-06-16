import { useApp } from "@/database/AppContext";
import { useEffect } from "react";
import {
  registerForPushNotificationsAsync,
  scheduleLocalBusinessAlert,
} from "@/premium/notifications/notificationService";
import { useAutoDayClose } from "@/utils/autoDayClose";

export default function AppNotificationBridge() {
  const { businessName, meals, debtors, creditors, transactions } = useApp();
  useAutoDayClose();

  useEffect(() => {
    registerForPushNotificationsAsync(businessName).catch((error) => {
      console.warn("Push notification registration failed:", error);
    });
  }, [businessName]);

  useEffect(() => {
    const lowStockMeals = meals.filter((meal) => meal.stock <= meal.lowAlert);
    if (lowStockMeals.length === 0) return;

    scheduleLocalBusinessAlert(
      "low_stock",
      "Low stock needs attention",
      `${lowStockMeals.slice(0, 3).map((meal) => meal.name).join(", ")} ${lowStockMeals.length > 3 ? "and more " : ""}below alert level.`,
      8,
    ).catch((error) => console.warn("Low stock notification failed:", error));
  }, [meals]);

  useEffect(() => {
    const outstandingDebtors = debtors.filter((debtor) => debtor.totalOwed - debtor.totalPaid > 0);
    const outstandingCreditors = creditors.filter((creditor) => creditor.totalOwed - creditor.totalPaid > 0);
    if (outstandingDebtors.length + outstandingCreditors.length === 0) return;

    scheduleLocalBusinessAlert(
      "balances",
      "Balances to review",
      `${outstandingDebtors.length} debtor(s), ${outstandingCreditors.length} creditor(s) still open.`,
      24,
    ).catch((error) => console.warn("Balance notification failed:", error));
  }, [creditors, debtors]);

  useEffect(() => {
    const today = new Date().toDateString();
    const todayTransactions = transactions.filter((tx) => new Date(tx.date).toDateString() === today);
    const hasCollections = todayTransactions.some((tx) => tx.type === "collection");
    const hasMoneyActivity = todayTransactions.some((tx) =>
      ["sale", "debtor_payment", "opening_balance"].includes(tx.type),
    );
    const hour = new Date().getHours();

    if (hour < 20 || !hasMoneyActivity || hasCollections) return;

    scheduleLocalBusinessAlert(
      "collection_pending",
      "Collection not recorded",
      "Cash and M-Pesa collection has not been recorded for today.",
      4,
    ).catch((error) => console.warn("Collection notification failed:", error));
  }, [transactions]);

  return null;
}
