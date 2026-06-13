import { useApp } from "@/database/AppContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
    const { transactions, takeoutSessions, debtors, creditors } = useApp();
    const router = useRouter();

    // Compute stats for current day
    const todayTx = transactions.filter((t) => {
        const txDate = new Date(t.date).toDateString();
        const now = new Date().toDateString();

        return txDate === now;
    });

    const cashInToday = todayTx
        .filter(
            (t) =>
                t.type === "sale" && t.paymentMethod === "cash" ||
                t.type === "debtor_payment" && t.paymentMethod === "cash" ||
                t.type === "opening_balance" && t.paymentMethod === "cash"
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const cashOutToday = todayTx
        .filter(
            (t) =>
                t.type === "purchase" && t.paymentMethod === "cash" ||
                t.type === "expense" && t.paymentMethod === "cash" ||
                t.type === "creditor_payment" && t.paymentMethod === "cash" ||
                t.type === "collection"
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const mpesaInToday = todayTx
        .filter(
            (t) =>
                t.type === "sale" && t.paymentMethod === "mpesa" ||
                t.type === "debtor_payment" && t.paymentMethod === "mpesa"
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const mpesaOutToday = todayTx
        .filter(
            (t) =>
                t.type === "purchase" && t.paymentMethod === "mpesa" ||
                t.type === "expense" && t.paymentMethod === "mpesa" ||
                t.type === "creditor_payment" && t.paymentMethod === "mpesa"
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

    const grossProfitToday = totalSalesToday - purchasesToday;
    const netProfitToday = grossProfitToday - expensesToday;


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
        <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
        >
            <Text className="text-[12px] font-bold text-muted-foreground tracking-[1px] uppercase mb-3">
                Financial Overview
            </Text>

            {/* 0. Total Sales Card */}
            <View className="bg-primary border-[0.5px] border-primary-dark rounded-[16px] p-5 mb-3 shadow-md">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-[12px] text-primary-foreground/80 uppercase tracking-[0.5px] mb-1">
                            Total Sales (Today)
                        </Text>
                        <Text className="text-[32px] font-bold text-primary-foreground">
                            KES {totalSalesToday.toLocaleString()}
                        </Text>
                    </View>
                    <View className="bg-primary-dark/20 px-2 py-1 rounded-[6px]">
                        <Text className="text-[10px] font-bold text-primary-foreground">Gross</Text>
                    </View>
                </View>
            </View>

            {/* 1. Money In-House Card */}
            <View className="bg-card border-[0.5px] border-border-light rounded-[16px] p-5 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                            In-House Money (Today)
                        </Text>
                        <Text className="text-[32px] font-bold text-foreground">
                            KES {moneyInHouse.toLocaleString()}
                        </Text>
                    </View>
                    <View className="flex-row rounded-xl h-full flex-1 ml-3 p-4 justify-around bg-muted">
                        <View className="flex-1 justify-around items-center"
                            style={{ borderRightWidth: 1, borderRightColor: "grey" }}
                        >
                            <Text className="text-primary font-bold">Cash</Text>
                            <Text className="text-info font-bold">KES {(cashAvailableToday).toLocaleString()}</Text>
                        </View>
                        <View className="flex-1 justify-around items-center" >
                            <Text className="text-primary font-bold">M-Pesa</Text>
                            <Text className="text-info font-bold">KES {(mpesaAvailableToday).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 2. To be Collected Card */}
            <View className="bg-card border-[0.5px] border-border-light rounded-[16px] p-5 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                            To be Collected
                        </Text>
                        <Text className={`text-[28px] font-bold ${totalDebts < 0 ? 'text-primary' : 'text-foreground'}`}>
                            KES {totalDebts.toLocaleString()}
                        </Text>
                    </View>
                    {activeDebtorsCount > 0 && (
                        <View className={`${totalDebts < 0 ? 'bg-primary/10' : 'bg-destructive/10'} px-2 py-1 rounded-[6px]`}>
                            <Text className={`text-[10px] font-bold ${totalDebts < 0 ? 'text-primary' : 'text-destructive'}`}>{activeDebtorsCount} Accounts</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* 3. Amount Owed Card */}
            <View className="bg-card border-[0.5px] border-border-light rounded-[16px] p-5 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                            Amount We Owe
                        </Text>
                        <Text className={`text-[28px] font-bold ${totalCreditors < 0 ? 'text-primary' : 'text-foreground'}`}>
                            KES {totalCreditors.toLocaleString()}
                        </Text>
                    </View>
                    {activeCreditorsCount > 0 && (
                        <View className={`${totalCreditors < 0 ? 'bg-primary/10' : 'bg-warning/10'} px-2 py-1 rounded-[6px]`}>
                            <Text className={`text-[10px] font-bold ${totalCreditors < 0 ? 'text-primary' : 'text-warning'}`}>{activeCreditorsCount} Suppliers</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* 4. Net Profit Card */}
            <View className="bg-card border-[0.5px] border-border-light rounded-[16px] p-5 mb-6 shadow-sm">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                            Gross Profit (Today)
                        </Text>
                        <Text className="text-[32px] font-bold text-foreground">
                            KES {grossProfitToday.toLocaleString()}
                        </Text>
                    </View>
                    <View>
                        <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                            Net Profit (Today)
                        </Text>
                        <Text className="text-[32px] font-bold text-foreground">
                            KES {netProfitToday.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            <Text className="text-[12px] font-bold text-muted-foreground tracking-[1px] uppercase mb-3">
                Quick Actions
            </Text>

            {/* QUICK ACTIONS ROW */}
            <View className="flex-row gap-3 mb-6">
                <TouchableOpacity
                    className="flex-1 bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                    onPress={() => router.push('/record-sale')}
                >
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                        <Ionicons name="receipt-outline" size={20} color="#2ecc71" />
                    </View>
                    <Text className="text-[12px] font-bold text-foreground">Sale</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                    onPress={() => router.push('/record-expense')}
                >
                    <View className="w-10 h-10 rounded-full bg-destructive/10 items-center justify-center mb-2">
                        <Ionicons name="trending-down-outline" size={20} color="#e74c3c" />
                    </View>
                    <Text className="text-[12px] font-bold text-foreground">Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                    onPress={() => router.push('/record-purchase')}
                >
                    <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center mb-2">
                        <Ionicons name="cart-outline" size={20} color="#3498db" />
                    </View>
                    <Text className="text-[12px] font-bold text-foreground">Buy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                    onPress={() => router.push('/dispatch-takeout')}
                >
                    <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center mb-2">
                        <Ionicons name="bicycle-outline" size={20} color="#f39c12" />
                    </View>
                    <Text className="text-[12px] font-bold text-foreground">Dispatch</Text>
                </TouchableOpacity>
            </View>

            {/* Active Takeouts */}
            {takeoutSessions && takeoutSessions.length > 0 && (
                <View className="mb-6">
                    <Text className="text-[12px] font-bold text-warning tracking-[1px] uppercase mb-3">
                        Active Takeouts ({takeoutSessions.length})
                    </Text>
                    <View className="gap-2">
                        {takeoutSessions.map((session, idx) => {
                            const itemsCount = JSON.parse(session.dispatchedItems).reduce(
                                (s: number, i: any) => s + i.qty,
                                0,
                            );
                            return (
                                <TouchableOpacity
                                    key={session.id}
                                    className="flex-row items-center justify-between bg-card border-[0.5px] border-warning/50 p-4 rounded-[12px] shadow-sm"
                                    onPress={() => router.push({ pathname: '/reconcile-takeout', params: { id: session.id } })}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center">
                                            <Ionicons name="bicycle" size={20} color="#f39c12" />
                                        </View>
                                        <View>
                                            <Text className="text-[14px] font-bold text-foreground">
                                                {session.staffName}
                                            </Text>
                                            <Text className="text-[11px] text-muted-foreground mt-[2px]">
                                                {itemsCount} items dispatched
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="bg-warning px-3 py-1.5 rounded-[8px]">
                                        <Text className="text-[11px] font-bold text-primary-foreground">
                                            Reconcile
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Recent activity list */}
            <View className="mb-4">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-[12px] font-bold text-muted-foreground tracking-[1px] uppercase">
                        Recent Activity
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/ledger')}>
                        <Text className="text-[11px] font-bold text-primary uppercase">View Ledger</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-card border-[0.5px] border-border-light rounded-[16px] overflow-hidden shadow-sm">
                    {transactions.slice(0, 5).map((tx, idx) => {
                        const isOutflow = ["expense", "purchase", "creditor_payment", "collection", "refund"].includes(tx.type);
                        const isFlow = ["takeaway", "consumed", "adjustment", "day_close", "takeout_reconciliation"].includes(tx.type);
                        const txColor = isFlow ? "#f39c12" : isOutflow ? "#e74c3c" : "#2ecc71";
                        const amtSign = isOutflow ? "-" : "+";
                        const isLast = idx === Math.min(transactions.length, 5) - 1;

                        return (
                            <View
                                key={idx}
                                className={`flex-row items-center p-4 ${!isLast ? 'border-b-[0.5px] border-border-light' : ''} gap-3`}
                            >
                                <View
                                    className={`w-10 h-10 rounded-full items-center justify-center ${isOutflow ? "bg-destructive/10" : isFlow ? "bg-warning/10" : "bg-primary/10"
                                        }`}
                                >
                                    <Ionicons
                                        name={isOutflow ? "trending-down" : isFlow ? "swap-horizontal" : "trending-up"}
                                        size={18}
                                        color={txColor}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[14px] font-bold text-foreground">
                                        {tx.title}
                                    </Text>
                                    <Text className="text-[11px] text-muted-foreground mt-[2px]">
                                        {tx.description}
                                    </Text>
                                </View>
                                <Text
                                    style={{ color: txColor }}
                                    className="text-[14px] font-bold"
                                >
                                    {isFlow
                                        ? "Flow"
                                        : `${amtSign}KES ${tx.amount.toLocaleString()}`}
                                </Text>
                            </View>
                        );
                    })}
                    {transactions.length === 0 && (
                        <View className="p-6 items-center">
                            <Text className="text-[12px] text-muted-foreground italic">No transactions recorded yet.</Text>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
