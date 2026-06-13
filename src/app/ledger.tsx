import { useApp } from "@/database/AppContext";
import { buildMoneyLedger, buildTrialBalance, summarizeAccounting } from "@/utils/accounting";
import { generateLedgerPDF } from "@/utils/pdfGenerator";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View, FlatList } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";

type Period = "today" | "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    all: "All Time",
};

export default function LedgerScreen() {
    const {
        transactions,
        debtors,
        creditors,
        businessName,
        reportPeriod,
        setReportPeriod,
    } = useApp();
    const [generating, setGenerating] = useState(false);
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 12);

    const filtered = useMemo(() => {
        const now = new Date();
        return transactions.filter((t) => {
            if (t.type === "day_close") return false;
            const d = new Date(t.date);
            if (reportPeriod === "today")
                return d.toDateString() === now.toDateString();
            if (reportPeriod === "week") {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                return d >= weekAgo;
            }
            if (reportPeriod === "month")
                return (
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear()
                );
            if (reportPeriod === "year") return d.getFullYear() === now.getFullYear();
            return true;
        });
    }, [transactions, reportPeriod]);

    const ledgerEntries = useMemo(() => buildMoneyLedger(filtered), [filtered]);
    const summary = useMemo(
        () => summarizeAccounting(filtered, debtors, creditors),
        [filtered, debtors, creditors],
    );
    const trialBalanceRows = useMemo(
        () => buildTrialBalance(filtered, debtors, creditors),
        [filtered, debtors, creditors],
    );
    const trialDebitTotal = trialBalanceRows.reduce((sum, row) => sum + row.debitBalance, 0);
    const trialCreditTotal = trialBalanceRows.reduce((sum, row) => sum + row.creditBalance, 0);

    const handleGeneratePDF = async () => {
        setGenerating(true);
        try {
            await generateLedgerPDF(
                businessName,
                filtered,
                debtors,
                creditors,
                PERIOD_LABELS[reportPeriod],
                summary,
            );
        } catch {
            Alert.alert(
                "PDF Error",
                "Could not generate the report. Please try again.",
            );
        } finally {
            setGenerating(false);
        }
    };

    const ListHeader = () => (
        <>
            {/* Period Selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
                <View className="flex-row gap-2">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                        <TouchableOpacity
                            key={p}
                            className={`py-1.5 px-3 rounded-full ${reportPeriod === p
                                ? "bg-primary"
                                : "bg-muted border border-border-strong"
                                }`}
                            onPress={() => setReportPeriod(p)}
                        >
                            <Text
                                className={`text-[11px] font-bold ${reportPeriod === p ? "text-background" : "text-muted-foreground"
                                    }`}
                            >
                                {PERIOD_LABELS[p]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Money Ledger Summary */}
            <View className="flex-row gap-2 px-4 py-2">
                <View className="flex-1 bg-muted rounded-xl p-3 border border-border">
                    <Text className="text-[9px] text-muted-foreground uppercase tracking-widest">
                        Money In (Dr)
                    </Text>
                    <Text className="text-[15px] font-bold text-primary mt-0.5">
                        KES {summary.totalDebits.toLocaleString()}
                    </Text>
                </View>
                <View className="flex-1 bg-muted rounded-xl p-3 border border-border">
                    <Text className="text-[9px] text-muted-foreground uppercase tracking-widest">
                        Money Out (Cr)
                    </Text>
                    <Text className="text-[15px] font-bold text-destructive mt-0.5">
                        KES {summary.totalCredits.toLocaleString()}
                    </Text>
                </View>
            </View>
            <View className="mx-4 mb-2 bg-primary/10 border border-primary/20 rounded-xl p-3">
                <View className="flex-row justify-between items-center">
                    <Text className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        Closing Money In Hand
                    </Text>
                    <Text
                        className={`text-[16px] font-bold ${summary.closingBalance >= 0 ? "text-primary" : "text-destructive"
                            }`}
                    >
                        KES {summary.closingBalance.toLocaleString()}
                    </Text>
                </View>
                <Text className="text-[9px] text-muted-foreground mt-1">
                    Trial Balance Dr KES {trialDebitTotal.toLocaleString()} · Cr KES {trialCreditTotal.toLocaleString()}
                </Text>
                <Text className="text-[9px] text-muted-foreground mt-1">
                    Cash KES {summary.cashBalance.toLocaleString()} · M-Pesa KES {summary.mpesaBalance.toLocaleString()}
                </Text>
            </View>

            <View className="mx-4 mb-3 bg-card border border-border rounded-xl p-3">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Unadjusted Trial Balance
                </Text>
                {trialBalanceRows.slice(0, 8).map((row) => (
                    <View key={row.account} className="flex-row items-center py-1 border-b border-border-light">
                        <View className="flex-1 pr-2">
                            <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>
                                {row.account}
                            </Text>
                            <Text className="text-[9px] text-muted-foreground">{row.type}</Text>
                        </View>
                        <Text className="w-20 text-right text-[11px] text-destructive">
                            {row.debitBalance ? `KES ${row.debitBalance.toLocaleString()}` : ""}
                        </Text>
                        <Text className="w-20 text-right text-[11px] text-primary">
                            {row.creditBalance ? `KES ${row.creditBalance.toLocaleString()}` : ""}
                        </Text>
                    </View>
                ))}
                {trialBalanceRows.length > 8 ? (
                    <Text className="text-[9px] text-muted-foreground mt-2">
                        Full account list is included in the PDF export.
                    </Text>
                ) : null}
            </View>

            {/* Table Header */}
            <View className="flex-row border-b border-primary/20 pb-2 mb-1 px-4">
                <Text className="flex-[2] text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    Date / Ref / Entry
                </Text>
                <Text className="w-20 text-right text-[9px] font-bold text-destructive uppercase tracking-widest">
                    Debit
                </Text>
                <Text className="w-20 text-right text-[9px] font-bold text-primary uppercase tracking-widest">
                    Credit
                </Text>
                <Text className="w-24 text-right text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    Balance
                </Text>
            </View>
        </>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
            <ScreenHeader title="Ledger & Trial Balance" subtitle={businessName} />
            <View className="flex-1 w-full bg-background">
                <FlatList
                    data={ledgerEntries}
                    keyExtractor={(item, idx) => `${item.transactionId}-${idx}`}
                    ListHeaderComponent={<ListHeader />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <Ionicons
                                name="document-text-outline"
                                size={40}
                                color="#8a9e8c"
                            />
                            <Text className="text-[13px] text-muted-foreground mt-3">
                                No entries for this period
                            </Text>
                        </View>
                    }
                    renderItem={({ item: line }) => {
                        const dateStr = new Date(line.timestamp).toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "short",
                        });
                        const timeStr = new Date(line.timestamp).toLocaleTimeString("en-KE", {
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                        return (
                            <View className="flex-row items-start py-2.5 border-b border-border px-4">
                                <View className="flex-[2] pr-2">
                                    <Text
                                        className="text-[12px] font-semibold text-foreground"
                                        numberOfLines={1}
                                    >
                                        {line.description}
                                    </Text>
                                    <Text
                                        className="text-[10px] text-muted-foreground mt-[1px]"
                                        numberOfLines={1}
                                    >
                                        {line.reference} · {line.paymentMethod.toUpperCase()} · {line.account}
                                    </Text>
                                    <Text className="text-[9px] text-muted-foreground mt-[1px]">
                                        {dateStr} {timeStr}
                                        {line.createdBy ? ` · ${line.createdBy}` : ""}
                                    </Text>
                                </View>
                                <Text className="w-20 text-right text-[12px] font-bold text-destructive">
                                    {line.debit > 0 ? `KES ${line.debit.toLocaleString()}` : ""}
                                </Text>
                                <Text className="w-20 text-right text-[12px] font-bold text-primary">
                                    {line.credit > 0 ? `KES ${line.credit.toLocaleString()}` : ""}
                                </Text>
                                <Text className="w-24 text-right text-[12px] font-bold text-foreground">
                                    KES {line.runningBalance.toLocaleString()}
                                </Text>
                            </View>
                        );
                    }}
                    ListFooterComponent={<View className="h-4" />}
                />

                {/* PDF Button */}
                <View className="px-4 pt-2 border-t border-border" style={{ paddingBottom: bottomInset }}>
                    <TouchableOpacity
                        className={`flex-row items-center justify-center py-3 rounded-[12px] gap-2 ${generating ? "bg-muted" : "bg-primary"
                            }`}
                        onPress={handleGeneratePDF}
                        disabled={generating}
                    >
                        <Ionicons
                            name="download-outline"
                            size={18}
                            color={generating ? "#8a9e8c" : "#0d1a12"}
                        />
                        <Text
                            className={`text-[13px] font-bold ${generating ? "text-muted-foreground" : "text-background"
                                }`}
                        >
                            {generating ? "Generating PDF..." : "Download PDF Report"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView >
    );
}
