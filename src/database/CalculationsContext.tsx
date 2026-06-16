import { createContext, ReactNode, useContext } from "react";

import { useApp } from "./AppContext";

interface CalculationsProviderType {
    cashInToday: number,
    cashOutToday: number,
    mpesaInToday: number,
    mpesaOutToday: number,
    expensesToday: number,
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
}


const CalculationsContext = createContext<CalculationsProviderType | undefined>(undefined);

export function CalculationsProvider({ children }: { children: ReactNode }) {
    const { transactions, debtors, creditors } = useApp();

    // Compute stats for current day
    const todayTx = transactions.filter((t) => {
        const txDate = new Date(t.date).toDateString();
        const now = new Date().toDateString();

        return txDate === now;
    });

    const cashInToday = todayTx
        .filter(
            (t) =>
                (t.type === "sale" && t.paymentMethod === "cash") ||
                (t.type === "debtor_payment" && t.paymentMethod === "cash") ||
                (t.type === "opening_balance" && t.paymentMethod === "cash")
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const cashOutToday = todayTx
        .filter(
            (t) =>
                (t.type === "purchase" && t.paymentMethod === "cash") ||
                (t.type === "purchase_payment" && t.paymentMethod === "cash") ||
                (t.type === "expense" && t.paymentMethod === "cash") ||
                (t.type === "creditor_payment" && t.paymentMethod === "cash") ||
                (t.type === "collection" && t.paymentMethod === "cash")
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const mpesaInToday = todayTx
        .filter(
            (t) =>
                (t.type === "sale" && t.paymentMethod === "mpesa") ||
                (t.type === "debtor_payment" && t.paymentMethod === "mpesa") ||
                (t.type === "opening_balance" && t.paymentMethod === "mpesa")
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const mpesaOutToday = todayTx
        .filter(
            (t) =>
                (t.type === "purchase" && t.paymentMethod === "mpesa") ||
                (t.type === "purchase_payment" && t.paymentMethod === "mpesa") ||
                (t.type === "expense" && t.paymentMethod === "mpesa") ||
                (t.type === "creditor_payment" && t.paymentMethod === "mpesa") ||
                (t.type === "collection" && t.paymentMethod === "mpesa")
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const expensesToday = todayTx
        .filter((t) => t.type === "expense" && (t.paymentMethod === "cash" || t.paymentMethod === "mpesa"))
        .reduce((sum, t) => sum + t.amount, 0);

    const purchasesToday = todayTx
        .filter((t) => t.type === "purchase")
        .reduce((sum, t) => sum + t.amount, 0);

    const totalSalesToday = todayTx
        .filter((t) => t.type === "sale")
        .reduce((sum, t) => sum + t.amount, 0);

    const paidSalesToday = todayTx
        .filter((t) => t.type === "sale" && (t.paymentMethod === "cash" || t.paymentMethod === "mpesa"))
        .reduce((sum, t) => sum + t.amount, 0);

    // Opening balance should come from today's opening_balance transaction, not global setting
    const cashOpeningBalanceToday = todayTx
        .filter((t) => t.type === "opening_balance" && t.paymentMethod === "cash")
        .reduce((s, t) => s + t.amount, 0);
    const mpesaOpeningBalanceToday = todayTx
        .filter((t) => t.type === "opening_balance" && t.paymentMethod === "mpesa")
        .reduce((s, t) => s + t.amount, 0);

    const grossProfitToday = totalSalesToday - purchasesToday;
    const netProfitToday = grossProfitToday - expensesToday;

    const openingBalanceToday = cashOpeningBalanceToday + mpesaOpeningBalanceToday;

    const cashAvailableToday = cashInToday - cashOutToday
    const mpesaAvailableToday = mpesaInToday - mpesaOutToday


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
