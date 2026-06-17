import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight } from "@/utils/haptics";

import { useApp } from "@/database/AppContext";
import { useCalculations } from "@/database/CalculationsContext";
import { useRouter } from "expo-router";

/**
 * Renders the home screen dashboard displaying financial overview, quick actions, and recent activity.
 *
 * @param onNavigateToSettings - Optional callback invoked when the settings button is pressed.
 */
export default function HomeScreen({ onNavigateToSettings }: { onNavigateToSettings?: () => void }) {
    const { transactions, takeoutSessions, debtors, creditors, businessName, unreadNotifsCount } = useApp();
    const {
        totalSalesToday,
        grossProfitToday,
        netProfitToday,
        cashAvailableToday,
        mpesaAvailableToday,
        moneyInHouse,
        totalDebts,
        activeDebtorsCount,
        totalCreditors,
        activeCreditorsCount,
    } = useCalculations();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isCompact = width < 380;
    const shouldStackMoneySplit = width < 430;
    const heroAmountSize = isCompact ? 25 : 32;
    const cardAmountSize = isCompact ? 24 : 28;

    // Greeting
    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);


    return (

        <>
            {/* HEADER SECTION */}
            <View className="flex-row justify-between items-center px-4 pt-2 pb-4">
                <View>
                    <Text className="text-[12px] font-bold text-muted-foreground tracking-[0.5px] uppercase">{greeting}</Text>
                    <Text className="text-[20px] font-bold text-foreground">{businessName}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        className="w-10 h-10 rounded-[14px] bg-card border-[0.5px] border-border-light items-center justify-center relative"
                        onPress={() => {
                            hapticLight();
                            router.push('/notifications');
                        }}
                    >
                        <Ionicons name="notifications-outline" size={20} color="#6b7a6d" />
                        {unreadNotifsCount > 0 && (
                            <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-danger" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-[14px] bg-primary/10 border-[0.5px] border-primary/20 items-center justify-center"
                        onPress={() => {
                            hapticLight();
                            if (onNavigateToSettings) onNavigateToSettings();
                        }}
                    >
                        <Text className="text-[14px] font-bold text-primary">
                            {businessName.substring(0, 2).toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
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
                            <Text
                                adjustsFontSizeToFit
                                minimumFontScale={0.74}
                                numberOfLines={1}
                                style={{ fontSize: heroAmountSize }}
                                className="font-bold text-primary-foreground"
                            >
                                KES {totalSalesToday.toLocaleString()}
                            </Text>
                        </View>
                        <View className="bg-warning px-2 py-1 rounded-[6px]">
                            <Text className="text-[10px] font-bold text-primary-foreground">Gross</Text>
                        </View>
                    </View>
                </View>

                {/* 1. Money In-House Card */}
                <View className="bg-card border-[0.5px] border-border-light rounded-[16px] p-5 mb-3 shadow-sm">
                    <View style={shouldStackMoneySplit ? styles.stackCard : styles.rowCard}>
                        <View style={styles.cardPrimary}>
                            <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                                In-House Money (Today)
                            </Text>
                            <Text
                                adjustsFontSizeToFit
                                minimumFontScale={0.74}
                                numberOfLines={1}
                                style={{ fontSize: heroAmountSize }}
                                className="font-bold text-foreground"
                            >
                                KES {moneyInHouse.toLocaleString()}
                            </Text>
                        </View>
                        <View style={[styles.moneySplit, shouldStackMoneySplit ? styles.moneySplitCompact : styles.moneySplitWide]}>
                            <View style={[styles.moneyPill, !shouldStackMoneySplit && styles.moneyPillDivider]}>
                                <View style={styles.moneyIcon}>
                                    <Ionicons name="cash-outline" size={15} color="#1f9f55" />
                                </View>
                                <View style={styles.moneyText}>
                                    <Text className="text-[11px] text-muted-foreground font-bold uppercase">Cash</Text>
                                    <Text className="text-[14px] text-info font-bold">
                                        KES {cashAvailableToday.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.moneyPill}>
                                <View style={styles.moneyIcon}>
                                    <Ionicons name="phone-portrait-outline" size={15} color="#1f9f55" />
                                </View>
                                <View style={styles.moneyText}>
                                    <Text className="text-[11px] text-muted-foreground font-bold uppercase">M-Pesa</Text>
                                    <Text className="text-[14px] text-info font-bold">
                                        KES {mpesaAvailableToday.toLocaleString()}
                                    </Text>
                                </View>
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
                            <Text
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                                numberOfLines={1}
                                style={{ fontSize: cardAmountSize }}
                                className={`font-bold ${totalDebts < 0 ? 'text-primary' : 'text-foreground'}`}
                            >
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
                            <Text
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                                numberOfLines={1}
                                style={{ fontSize: cardAmountSize }}
                                className={`font-bold ${totalCreditors < 0 ? 'text-primary' : 'text-foreground'}`}
                            >
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
                    <View style={isCompact ? styles.profitStack : styles.profitRow}>
                        <View style={styles.profitBlock}>
                            <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                                Gross Profit (Today)
                            </Text>
                            <Text
                                adjustsFontSizeToFit
                                minimumFontScale={0.74}
                                numberOfLines={1}
                                style={{ fontSize: heroAmountSize }}
                                className={`font-bold ${grossProfitToday < 0 ? 'text-destructive' : 'text-primary'}`}
                            >
                                KES {grossProfitToday.toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.profitBlock}>
                            <Text className="text-[12px] text-muted-foreground uppercase tracking-[0.5px] mb-1">
                                Net Profit (Today)
                            </Text>
                            <Text
                                adjustsFontSizeToFit
                                minimumFontScale={0.74}
                                numberOfLines={1}
                                style={{ fontSize: heroAmountSize }}
                                className={`font-bold ${netProfitToday < 0 ? 'text-destructive' : 'text-primary'}`}
                            >
                                KES {netProfitToday.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text className="text-[12px] font-bold text-muted-foreground tracking-[1px] uppercase mb-3">
                    Quick Actions
                </Text>

                {/* QUICK ACTIONS ROW */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, isCompact ? styles.actionButtonCompact : styles.actionButtonWide]}
                        className="bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                        onPress={() => {
                            hapticLight();
                            router.push('/record-sale');
                        }}
                    >
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                            <Ionicons name="receipt-outline" size={20} color="#2ecc71" />
                        </View>
                        <Text className="text-[12px] font-bold text-foreground">Sale</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, isCompact ? styles.actionButtonCompact : styles.actionButtonWide]}
                        className="bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                        onPress={() => {
                            hapticLight();
                            router.push('/record-expense');
                        }}
                    >
                        <View className="w-10 h-10 rounded-full bg-destructive/10 items-center justify-center mb-2">
                            <Ionicons name="trending-down-outline" size={20} color="#e74c3c" />
                        </View>
                        <Text className="text-[12px] font-bold text-foreground">Expense</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, isCompact ? styles.actionButtonCompact : styles.actionButtonWide]}
                        className="bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                        onPress={() => {
                            hapticLight();
                            router.push('/record-purchase');
                        }}
                    >
                        <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center mb-2">
                            <Ionicons name="cart-outline" size={20} color="#3498db" />
                        </View>
                        <Text className="text-[12px] font-bold text-foreground">Buy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, isCompact ? styles.actionButtonCompact : styles.actionButtonWide]}
                        className="bg-card border-[0.5px] border-border-light py-4 rounded-[12px] items-center justify-center shadow-sm"
                        onPress={() => {
                            hapticLight();
                            router.push('/dispatch-takeout');
                        }}
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
                                        onPress={() => {
                                            hapticLight();
                                            router.push({ pathname: '/reconcile-takeout', params: { id: session.id } });
                                        }}
                                    >
                                        <View className="flex-row items-center gap-3 flex-1 mr-2">
                                            <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center">
                                                <Ionicons name="bicycle" size={20} color="#f39c12" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[14px] font-bold text-foreground">
                                                    {session.staffName}
                                                </Text>
                                                <Text className="text-[11px] text-muted-foreground mt-[2px]">
                                                    {itemsCount} items dispatched
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="bg-warning px-2.5 py-1.5 rounded-[8px]">
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
                        <TouchableOpacity onPress={() => {
                            hapticLight();
                            router.push('/ledger');
                        }}>
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
                                    <View className="flex-1 min-w-0">
                                        <Text numberOfLines={1} className="text-[14px] font-bold text-foreground">
                                            {tx.title}
                                        </Text>
                                        <Text numberOfLines={2} className="text-[11px] text-muted-foreground mt-[2px]">
                                            {tx.description}
                                        </Text>
                                    </View>
                                    <Text
                                        style={{ color: txColor }}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.75}
                                        className="text-[13px] font-bold max-w-[98px] text-right"
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
        </>
    );
}

const styles = StyleSheet.create({
    rowCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    stackCard: {
        gap: 14,
    },
    cardPrimary: {
        flexShrink: 1,
        minWidth: 0,
    },
    moneySplit: {
        borderRadius: 14,
        backgroundColor: "rgba(237, 242, 238, 0.95)",
        overflow: "hidden",
    },
    moneySplitWide: {
        flex: 1,
        minWidth: 138,
        flexDirection: "row",
        alignSelf: "stretch",
    },
    moneySplitCompact: {
        flexDirection: "column",
    },
    moneyPill: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    moneyPillDivider: {
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: "rgba(107, 122, 109, 0.35)",
    },
    moneyIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(46, 204, 113, 0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    moneyText: {
        flex: 1,
        minWidth: 0,
    },
    profitRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
    },
    profitStack: {
        gap: 14,
    },
    profitBlock: {
        flex: 1,
        minWidth: 0,
    },
    actionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        minHeight: 100,
    },
    actionButtonWide: {
        flex: 1,
        minWidth: 0,
    },
    actionButtonCompact: {
        flexBasis: "47%",
        flexGrow: 1,
    },
});
