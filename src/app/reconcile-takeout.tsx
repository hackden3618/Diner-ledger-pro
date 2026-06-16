import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, useWindowDimensions } from 'react-native';
import { useApp } from "@/database/AppContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCustomAlert } from "@/context/AlertContext";
import InfoAlert from "@/components/ui/InfoAlert";

export default function ReconcileTakeoutScreen() {
    const { showAlert } = useCustomAlert();
    const { reconcileTakeout, takeoutSessions } = useApp();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const bottomInset = Math.max(insets.bottom, 12);
    const isCompact = width < 380;

    const [session, setSession] = useState<any>(null);

    const [items, setItems] = useState<
        {
            mealId: number;
            name: string;
            dispatchedQty: number;
            price: number;
            unsold: number;
        }[]
    >([]);
    const [cashAmount, setCashAmount] = useState("");
    const [mpesaAmount, setMpesaAmount] = useState("");
    const [unifiedDebtors, setUnifiedDebtors] = useState<{ name: string; amount: number }[]>([]);

    useEffect(() => {
        if (id) {
            const activeSession = takeoutSessions.find(s => s.id === parseInt(id, 10));
            if (activeSession) {
                setSession(activeSession);
                const dispatchedItems = JSON.parse(activeSession.dispatchedItems);
                setItems(
                    dispatchedItems.map((item: any) => ({
                        mealId: item.mealId,
                        name: item.name,
                        dispatchedQty: item.qty,
                        price: item.price,
                        unsold: 0,
                    }))
                );
                
                // For initial load, put all expected revenue into Cash Input for ease of use
                const expectedCash = dispatchedItems.reduce((sum: number, item: any) => sum + item.qty * item.price, 0) + (activeSession.changeProvided || 0);
                setCashAmount(expectedCash.toString());
                setMpesaAmount("0");
            }
        }
    }, [id, takeoutSessions]);

    const handleUpdateItem = (mealId: number, value: string) => {
        const numValue = parseInt(value) || 0;
        setItems((prev) =>
            prev.map((item) => {
                if (item.mealId === mealId) {
                    return { ...item, unsold: Math.min(Math.max(0, numValue), item.dispatchedQty) };
                }
                return item;
            })
        );
    };

    // Calculate dynamic totals
    const expectedSalesRevenue = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.dispatchedQty - item.unsold) * item.price, 0);
    }, [items]);

    const floatGiven = session?.changeProvided || 0;
    const totalExpectedMoney = expectedSalesRevenue + floatGiven;

    const collectedCash = parseFloat(cashAmount) || 0;
    const collectedMpesa = parseFloat(mpesaAmount) || 0;
    const totalCollected = collectedCash + collectedMpesa;

    // The amount that wasn't collected in physical money must be accounted for in Debtors
    const targetUncollected = totalExpectedMoney - totalCollected;
    const actualCreditAmount = unifiedDebtors.reduce((s, d) => s + d.amount, 0);
    const shortfall = targetUncollected - actualCreditAmount;

    // Auto-update Cash input if user clicks a helper button
    const setAllToCash = () => {
        setCashAmount(totalExpectedMoney.toString());
        setMpesaAmount("0");
    };

    const addUnifiedDebtor = () => {
        setUnifiedDebtors((prev) => [...prev, { name: "", amount: 0 }]);
    };

    const addForgotDebtors = () => {
        showAlert(
            "Unknown Debtors",
            "This will assign the remaining balance as a liability to the staff member. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Assign to Staff", onPress: () => {
                    setUnifiedDebtors((prev) => [...prev, { name: `Unknown Debtor - ${session.staffName}`, amount: shortfall }]);
                }}
            ]
        );
    };

    const updateUnifiedDebtor = (index: number, field: "name" | "amount", value: string) => {
        setUnifiedDebtors((prev) =>
            prev.map((debtor, i) => {
                if (i === index) {
                    if (field === "amount") {
                        return { ...debtor, amount: parseFloat(value) || 0 };
                    }
                    return { ...debtor, name: value };
                }
                return debtor;
            })
        );
    };

    const removeUnifiedDebtor = (index: number) => {
        setUnifiedDebtors((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!session) return;

        // If there's a shortfall, ask the user to assign it to the staff member
        if (shortfall > 0) {
            showAlert(
                "Shortfall Detected",
                `The entered money and debtors are short by KES ${shortfall}. This will be systematically logged as a debt owed by ${session.staffName}. Proceed?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm", style: "destructive", onPress: submitReconciliation }
                ]
            );
            return;
        }

        submitReconciliation();
    };

    const submitReconciliation = () => {
        try {
            reconcileTakeout(session.id, session.staffName, {
                items: items.map((i) => ({
                    mealId: i.mealId,
                    unsold: i.unsold,
                })),
                totalCash: collectedCash,
                totalMpesa: collectedMpesa,
                globalDebtors: unifiedDebtors.filter((d) => d.name.trim() !== "" && d.amount > 0),
            });

            showAlert("Success", "Reconciliation completed successfully.", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            showAlert(
                "Reconciliation Failed",
                error instanceof Error ? error.message : "The takeout session could not be reconciled.",
            );
        }
    };

    if (!session) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4', justifyContent: 'center', alignItems: 'center' }}>
                <Text className="text-muted-foreground">Loading session...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
            <ScreenHeader title="Reconcile Takeout" subtitle={`Staff: ${session.staffName}`} />

            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: bottomInset + 112 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6">
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-4 uppercase">Dispatched Items</Text>
                        {items.map((item, itemIdx) => (
                            <View
                                key={itemIdx}
                                className="mb-4 bg-card p-4 rounded-[16px] border border-border shadow-sm flex-row justify-between items-center"
                            >
                                <View className="flex-1 mr-4">
                                    <Text className="text-[16px] font-bold text-foreground">{item.name}</Text>
                                    <Text className="text-[12px] text-muted-foreground mt-1">Dispatched: {item.dispatchedQty}</Text>
                                </View>

                                <View className="w-[100px]">
                                    <Text className="text-[10px] font-medium text-destructive mb-1.5 text-center uppercase tracking-[0.5px]">Unsold</Text>
                                    <TextInput
                                        className="bg-input border border-border-light rounded-[10px] h-11 text-center text-[14px] font-bold text-foreground"
                                        keyboardType="numeric"
                                        value={item.unsold.toString()}
                                        onChangeText={(val) => handleUpdateItem(item.mealId, val)}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-[16px]">
                        <Text className="text-[11px] font-bold text-primary tracking-[1px] mb-2 uppercase">Expected Money</Text>
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-[13px] text-muted-foreground">Expected Sales Revenue:</Text>
                            <Text className="text-[13px] font-bold text-foreground">KES {expectedSalesRevenue.toLocaleString()}</Text>
                        </View>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-[13px] text-muted-foreground">Change Float Given:</Text>
                            <Text className="text-[13px] font-bold text-foreground">KES {floatGiven.toLocaleString()}</Text>
                        </View>
                        <View className="flex-row justify-between items-center border-t border-primary/20 pt-2">
                            <Text className="text-[14px] font-bold text-primary">Total Expected:</Text>
                            <Text className="text-[16px] font-black text-primary">KES {totalExpectedMoney.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] uppercase">Money Brought In</Text>
                            <TouchableOpacity onPress={setAllToCash} className="bg-primary/10 px-2 py-1 rounded">
                                <Text className="text-[10px] font-bold text-primary">Set All to Cash</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View className={`${isCompact ? 'gap-3' : 'flex-row gap-3'}`}>
                            <View className="flex-1">
                                <Text className="text-[10px] font-bold text-primary mb-1.5 uppercase tracking-[0.5px]">Cash</Text>
                                <View className="flex-row items-center bg-card border border-primary/30 rounded-[16px] px-4 py-2 h-[60px] shadow-sm">
                                    <Text className="text-[16px] font-bold text-primary mr-2">KES</Text>
                                    <TextInput
                                        className="flex-1 text-[20px] font-bold text-foreground h-full"
                                        keyboardType="numeric"
                                        value={cashAmount}
                                        onChangeText={setCashAmount}
                                    />
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] font-bold text-info mb-1.5 uppercase tracking-[0.5px]">M-Pesa</Text>
                                <View className="flex-row items-center bg-card border border-info/30 rounded-[16px] px-4 py-2 h-[60px] shadow-sm">
                                    <Text className="text-[16px] font-bold text-info mr-2">KES</Text>
                                    <TextInput
                                        className="flex-1 text-[20px] font-bold text-foreground h-full"
                                        keyboardType="numeric"
                                        value={mpesaAmount}
                                        onChangeText={setMpesaAmount}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {targetUncollected > 0 && (
                        <View className="mb-6 bg-destructive/5 p-4 rounded-[16px] border border-destructive/20">
                            <View className="flex-row justify-between items-center mb-4 border-b border-destructive/20 pb-3">
                                <View>
                                    <Text className="text-[14px] font-bold text-destructive">Target Uncollected: KES {targetUncollected.toLocaleString()}</Text>
                                    <Text className={`text-[11px] font-medium mt-1 ${shortfall === 0 ? 'text-primary' : 'text-destructive/80'}`}>
                                        Accumulated: KES {actualCreditAmount.toLocaleString()} 
                                        {shortfall !== 0 && ` (Short: KES ${shortfall})`}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={addUnifiedDebtor} className="bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                                    <Text className="text-[12px] font-bold text-destructive">+ Add Debtor</Text>
                                </TouchableOpacity>
                            </View>

                            <InfoAlert message="Use unique names for all debtors to prevent false allocation." />
                            <View className="mt-2" />

                            {unifiedDebtors.map((debtor, idx) => (
                                <View key={idx} className="flex-row gap-2 mb-3 items-center">
                                    <TextInput
                                        className="flex-[2] bg-card border border-border rounded-[10px] h-11 px-4 text-[14px] text-foreground"
                                        placeholder="Debtor Name"
                                        placeholderTextColor="#a1b0a3"
                                        value={debtor.name}
                                        onChangeText={(val) => updateUnifiedDebtor(idx, "name", val)}
                                    />
                                    <TextInput
                                        className="flex-1 bg-card border border-border rounded-[10px] h-11 text-center text-[14px] font-bold text-foreground"
                                        placeholder="Amount"
                                        placeholderTextColor="#a1b0a3"
                                        keyboardType="numeric"
                                        value={debtor.amount ? debtor.amount.toString() : ""}
                                        onChangeText={(val) => updateUnifiedDebtor(idx, "amount", val)}
                                    />
                                    <TouchableOpacity onPress={() => removeUnifiedDebtor(idx)} className="w-11 h-11 bg-card border border-border rounded-[10px] items-center justify-center">
                                        <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {shortfall > 0 && (
                                <TouchableOpacity onPress={addForgotDebtors} className="mt-2 bg-destructive/20 py-3 rounded-[10px] items-center">
                                    <Text className="text-[13px] font-bold text-destructive">Forgot Debtors? KES {shortfall.toLocaleString()} Unaccounted</Text>
                                </TouchableOpacity>
                            )}

                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            <View
                className="absolute bottom-0 w-full px-6 bg-background border-t border-border-light pt-4 shadow-lg"
                style={{ paddingBottom: bottomInset }}
            >
                <TouchableOpacity
                    className={`w-full rounded-[16px] py-4 items-center justify-center shadow-sm ${shortfall < 0 ? 'bg-muted opacity-50' : 'bg-primary'}`}
                    onPress={handleSave}
                    disabled={shortfall < 0}
                >
                    <Text className={`text-[16px] font-bold ${shortfall < 0 ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
                        {shortfall < 0 ? 'Cannot Over-reconcile' : 'Finalize Reconciliation'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
