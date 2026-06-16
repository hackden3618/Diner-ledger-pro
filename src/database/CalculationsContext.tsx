import { createContext, ReactNode, useContext } from "react";
import { useApp } from "./AppContext";

interface CalculationsProviderType {
    cashInToday: number,
    cashOutToday: number,
    mpesaInToday: number,
    mpesaOutToday: number,
    expensesToday: number,
    totalBusinessLossToday: number,
    purchasesToday: number,
    totalSalesToday: number,
    paidSalesToday: number,
    grossProfitToday: number,
    netProfitToday: number,
    cashOpeningBalanceToday: number,
    mpesaOpeningBalanceToday: number,
    openingBalanceToday: number,
    cashAvailableToday: number,
    mpesaAvailableToday: number,
    moneyInToday: number,
    moneyOutToday: number,
    moneyInHouse: number,
    totalDebts: number,
    activeDebtorsCount: number,
    totalCreditors: number,
    activeCreditorsCount: number,
    cashBeforeChange: number,
}


const CalculationsContext = createContext<CalculationsProviderType | undefined>(undefined);

export function CalculationsProvider({ children }: { children: ReactNode }) {
    const { transactions, debtors, creditors, activeBusinessDay } = useApp();

    // Compute stats for current active business day
    const todayTx = transactions.filter((t) => t.business_day_id === activeBusinessDay.id);

    const cashInToday = todayTx
        .filter(
            (t) =>
                (t.type === "sale" && t.paymentMethod === "cash") ||
                (t.type === "debtor_payment" && t.paymentMethod === "cash") ||
                (t.type === "opening_balance" && t.paymentMethod === "cash") ||
                (t.type === "adjustment" && t.amount > 0 && t.paymentMethod === "cash")
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const cashOutToday = todayTx
        .filter(
            (t) =>
                (t.type === "purchase" && t.paymentMethod === "cash") ||
                (t.type === "purchase_payment" && t.paymentMethod === "cash") ||
                (t.type === "expense" && t.paymentMethod === "cash") ||
                (t.type === "business_loss" && t.paymentMethod === "cash") ||
                (t.type === "creditor_payment" && t.paymentMethod === "cash") ||
                (t.type === "collection" && t.paymentMethod === "cash") ||
                (t.type === "adjustment" && t.amount < 0 && t.paymentMethod === "cash")
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const mpesaInToday = todayTx
        .filter(
            (t) =>
                (t.type === "sale" && t.paymentMethod === "mpesa") ||
                (t.type === "debtor_payment" && t.paymentMethod === "mpesa") ||
                (t.type === "opening_balance" && t.paymentMethod === "mpesa") ||
                (t.type === "adjustment" && t.amount > 0 && t.paymentMethod === "mpesa")
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const mpesaOutToday = todayTx
        .filter(
            (t) =>
                (t.type === "purchase" && t.paymentMethod === "mpesa") ||
                (t.type === "purchase_payment" && t.paymentMethod === "mpesa") ||
                (t.type === "expense" && t.paymentMethod === "mpesa") ||
                (t.type === "business_loss" && t.paymentMethod === "mpesa") ||
                (t.type === "creditor_payment" && t.paymentMethod === "mpesa") ||
                (t.type === "collection" && t.paymentMethod === "mpesa") ||
                (t.type === "adjustment" && t.amount < 0 && t.paymentMethod === "mpesa")
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expensesToday = todayTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalBusinessLossToday = todayTx
        .filter((t) => t.type === "business_loss")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Non-cash adjustments (like creditor write-offs which are gains)
    const nonCashGainsToday = todayTx
        .filter((t) => t.type === "adjustment" && t.amount > 0 && t.paymentMethod === "none")
        .reduce((sum, t) => sum + t.amount, 0);

    const purchasesToday = todayTx
        .filter((t) => t.type === "purchase")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalSalesToday = todayTx
        .filter((t) => t.type === "sale")
        .reduce((sum, t) => sum + t.amount, 0);

    const paidSalesToday = todayTx
        .filter((t) => t.type === "sale" && (t.paymentMethod === "cash" || t.paymentMethod === "mpesa"))
        .reduce((sum, t) => sum + t.amount, 0);

    const cashOpeningBalanceToday = todayTx
        .filter((t) => t.type === "opening_balance" && t.paymentMethod === "cash")
        .reduce((s, t) => s + t.amount, 0);
    const mpesaOpeningBalanceToday = todayTx
        .filter((t) => t.type === "opening_balance" && t.paymentMethod === "mpesa")
        .reduce((s, t) => s + t.amount, 0);

    const grossProfitToday = totalSalesToday - purchasesToday;
    const netProfitToday = grossProfitToday - expensesToday - totalBusinessLossToday + nonCashGainsToday;

    const openingBalanceToday = cashOpeningBalanceToday + mpesaOpeningBalanceToday;

    const cashAvailableToday = cashInToday - cashOutToday;
    const cashBeforeChange = cashAvailableToday; // Backwards compatibility for UI
    const mpesaAvailableToday = mpesaInToday - mpesaOutToday;

    const moneyInToday = cashInToday + mpesaInToday;
    const moneyOutToday = cashOutToday + mpesaOutToday;

    const moneyInHouse = moneyInToday - moneyOutToday;

    // Global Debtors / Creditors
    const totalDebts = debtors.reduce((sum, d) => sum + (d.totalOwed - d.totalPaid), 0);
    const activeDebtorsCount = debtors.filter(d => (d.totalOwed - d.totalPaid) !== 0).length;

    const totalCreditors = creditors.reduce((sum, c) => sum + (c.totalOwed - c.totalPaid), 0);
    const activeCreditorsCount = creditors.filter(c => (c.totalOwed - c.totalPaid) !== 0).length;

    return (
        <CalculationsContext.Provider
            value={{
                cashInToday,
                cashOutToday,
                mpesaInToday,
                mpesaOutToday,
                expensesToday,
                totalBusinessLossToday,
                purchasesToday,
                totalSalesToday,
                paidSalesToday,
                grossProfitToday,
                netProfitToday,
                cashOpeningBalanceToday,
                mpesaOpeningBalanceToday,
                openingBalanceToday,
                cashAvailableToday,
                mpesaAvailableToday,
                moneyInToday,
                moneyOutToday,
                moneyInHouse,
                totalDebts,
                activeDebtorsCount,
                totalCreditors,
                activeCreditorsCount,
                cashBeforeChange,
            }}
        >
            {children}
        </CalculationsContext.Provider>
    )

}

export function useCalculations() {
    const context = useContext(CalculationsContext);
    if (!context) throw new Error("useCalculations must be used within a CalculationsProvider");
    return context;
}
