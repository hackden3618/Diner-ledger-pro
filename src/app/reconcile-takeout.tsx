import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Alert, ScrollView } from 'react-native';
import { useApp } from "@/database/AppContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ReconcileTakeoutScreen() {
  const { reconcileTakeout, takeoutSessions } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<any>(null);

  const [items, setItems] = useState<
    {
      mealId: number;
      name: string;
      dispatchedQty: number;
      price: number;
      unsold: number;
      cashSold: number;
      creditSold: number;
    }[]
  >([]);
  const [bulkCash, setBulkCash] = useState("");
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
            cashSold: item.qty,
            creditSold: 0,
          }))
        );

        const totalInitialCash = dispatchedItems.reduce(
          (sum: number, item: any) => sum + item.qty * item.price,
          0
        );
        setBulkCash(totalInitialCash.toString());
        setCashAmount(totalInitialCash.toString());
        setMpesaAmount("0");
      }
    }
  }, [id, takeoutSessions]);

  const handleUpdateItem = (mealId: number, field: "unsold" | "cashSold" | "creditSold", value: string) => {
    const numValue = parseInt(value) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.mealId === mealId) {
          let newItem = { ...item, [field]: Math.max(0, numValue) };

          if (field === "unsold") {
            const remaining = Math.max(0, item.dispatchedQty - newItem.unsold);
            newItem.creditSold = Math.min(item.creditSold, remaining);
            newItem.cashSold = remaining - newItem.creditSold;
          } else if (field === "cashSold") {
            const remaining = Math.max(0, item.dispatchedQty - newItem.unsold);
            newItem.cashSold = Math.min(newItem.cashSold, remaining);
            newItem.creditSold = remaining - newItem.cashSold;
          } else if (field === "creditSold") {
            const remaining = Math.max(0, item.dispatchedQty - newItem.unsold);
            newItem.creditSold = Math.min(newItem.creditSold, remaining);
            newItem.cashSold = remaining - newItem.creditSold;
          }

          return newItem;
        }
        return item;
      })
    );
  };

  const expectedCashFromItems = useMemo(
    () => items.reduce((sum, item) => sum + item.cashSold * item.price, 0),
    [items],
  );

  useEffect(() => {
    if (items.length > 0) {
      setBulkCash(expectedCashFromItems.toString());
      // Auto-split: default to all cash, user can adjust
      setCashAmount(expectedCashFromItems.toString());
      setMpesaAmount("0");
    }
  }, [expectedCashFromItems, items.length]);

  const addUnifiedDebtor = () => {
    setUnifiedDebtors((prev) => [...prev, { name: "", amount: 0 }]);
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

    for (const item of items) {
      if (item.unsold + item.cashSold + item.creditSold !== item.dispatchedQty) {
        Alert.alert(
          "Reconciliation Mismatch",
          `The sum of Unsold, Cash, and Credit for ${item.name} does not match the dispatched quantity (${item.dispatchedQty}).`
        );
        return;
      }
    }

    const totalExpectedCredit = items.reduce((sum, item) => sum + item.creditSold * item.price, 0);
    const actualCreditAmount = unifiedDebtors.reduce((s, d) => s + d.amount, 0);

    if (totalExpectedCredit > 0 && unifiedDebtors.length === 0) {
      Alert.alert("Missing Debtors", "Please add debtor details for the credit sales.");
      return;
    }
    if (totalExpectedCredit !== actualCreditAmount && totalExpectedCredit > 0) {
      Alert.alert(
        "Debtor Mismatch",
        `The total debtor amounts (KES ${actualCreditAmount}) does not match the expected credit value (KES ${totalExpectedCredit}).`
      );
      return;
    }

    const totalCashNum = parseFloat(bulkCash) || 0;
    const cashNum = parseFloat(cashAmount) || 0;
    const mpesaNum = parseFloat(mpesaAmount) || 0;

    // Validate that cash + mpesa equals expected total
    if (Math.abs((cashNum + mpesaNum) - totalCashNum) > 0.01) {
      Alert.alert(
        "Amount Mismatch",
        `The sum of Cash (KES ${cashNum}) and M-Pesa (KES ${mpesaNum}) must equal the expected total (KES ${totalCashNum}).`
      );
      return;
    }

    try {
      reconcileTakeout(session.id, session.staffName, {
        items: items.map((i) => ({
          mealId: i.mealId,
          unsold: i.unsold,
          cashSold: i.cashSold,
          creditSold: i.creditSold,
        })),
        totalCash: cashNum,
        totalMpesa: mpesaNum,
        globalDebtors: unifiedDebtors.filter((d) => d.name.trim() !== "" && d.amount > 0),
      });

      Alert.alert("Success", "Reconciliation completed successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert(
        "Reconciliation Failed",
        error instanceof Error ? error.message : "The takeout session could not be reconciled.",
      );
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)', justifyContent: 'center', alignItems: 'center' }}>
        <Text className="text-muted-foreground">Loading session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
      <ScreenHeader title="Reconcile Takeout" subtitle={`Staff: ${session.staffName}`} />
      
      <KeyboardAvoidingView 
        behavior="padding" 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-4 uppercase">Dispatched Items</Text>
            {items.map((item, itemIdx) => (
              <View
                key={itemIdx}
                className="mb-4 bg-card p-4 rounded-[16px] border border-border shadow-sm"
              >
                <View className="flex-row justify-between mb-4 border-b border-border-light pb-3">
                  <Text className="text-[16px] font-bold text-foreground">{item.name}</Text>
                  <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text className="text-[12px] font-bold text-primary">Took: {item.dispatchedQty}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-medium text-muted-foreground mb-1.5 text-center uppercase tracking-[0.5px]">Unsold (Return)</Text>
                    <TextInput
                      className="bg-input border border-border-light rounded-[10px] h-11 text-center text-[14px] font-bold text-foreground"
                      keyboardType="numeric"
                      value={item.unsold.toString()}
                      onChangeText={(val) => handleUpdateItem(item.mealId, "unsold", val)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-medium text-primary mb-1.5 text-center uppercase tracking-[0.5px]">Cash Sold</Text>
                    <TextInput
                      className="bg-input border border-primary/30 rounded-[10px] h-11 text-center text-[14px] font-bold text-foreground"
                      keyboardType="numeric"
                      value={item.cashSold.toString()}
                      onChangeText={(val) => handleUpdateItem(item.mealId, "cashSold", val)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-medium text-destructive mb-1.5 text-center uppercase tracking-[0.5px]">Credit Sold</Text>
                    <TextInput
                      className="bg-input border border-destructive/30 rounded-[10px] h-11 text-center text-[14px] font-bold text-foreground"
                      keyboardType="numeric"
                      value={item.creditSold.toString()}
                      onChangeText={(val) => handleUpdateItem(item.mealId, "creditSold", val)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {items.some((item) => item.creditSold > 0) && (
            <View className="mb-6 bg-destructive/5 p-4 rounded-[16px] border border-destructive/20">
              <View className="flex-row justify-between items-center mb-4 border-b border-destructive/20 pb-3">
                <View>
                  <Text className="text-[14px] font-bold text-destructive">Credit Sales / Debtors</Text>
                  <Text className="text-[11px] font-medium text-destructive/80 mt-1">
                    Expected Total: KES {items.reduce((sum, item) => sum + item.creditSold * item.price, 0).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={addUnifiedDebtor} className="bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                  <Text className="text-[12px] font-bold text-destructive">+ Add Debtor</Text>
                </TouchableOpacity>
              </View>
              
              {unifiedDebtors.map((debtor, idx) => (
                <View key={idx} className="flex-row gap-2 mb-3 items-center">
                  <TextInput
                    className="flex-[2] bg-card border border-border rounded-[10px] h-11 px-4 text-[14px] text-foreground"
                    placeholder="Debtor Name"
                    placeholderTextColor="var(--muted-dark)"
                    value={debtor.name}
                    onChangeText={(val) => updateUnifiedDebtor(idx, "name", val)}
                  />
                  <TextInput
                    className="flex-1 bg-card border border-border rounded-[10px] h-11 text-center text-[14px] font-bold text-foreground"
                    placeholder="Amount"
                    placeholderTextColor="var(--muted-dark)"
                    keyboardType="numeric"
                    value={debtor.amount ? debtor.amount.toString() : ""}
                    onChangeText={(val) => updateUnifiedDebtor(idx, "amount", val)}
                  />
                  <TouchableOpacity onPress={() => removeUnifiedDebtor(idx)} className="w-11 h-11 bg-card border border-border rounded-[10px] items-center justify-center">
                    <Ionicons name="trash-outline" size={18} color="var(--destructive)" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {unifiedDebtors.length === 0 && (
                <Text className="text-[11px] text-muted-foreground italic text-center py-2">
                  Tap + Add Debtor to record who owes money for these credit sales.
                </Text>
              )}
            </View>
          )}

          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-3 uppercase">Total Expected: KES {bulkCash}</Text>
            <Text className="text-[11px] font-medium text-muted-foreground mb-3 px-1">
              Split the total between Cash and M-Pesa (must sum to expected amount)
            </Text>
            
            <View className="flex-row gap-3">
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
            
            <View className="mt-2 px-1">
              <Text className={`text-[11px] font-medium ${Math.abs((parseFloat(cashAmount) || 0) + (parseFloat(mpesaAmount) || 0) - (parseFloat(bulkCash) || 0)) < 0.01 ? 'text-primary' : 'text-destructive'}`}>
                Total: KES {((parseFloat(cashAmount) || 0) + (parseFloat(mpesaAmount) || 0)).toLocaleString()}
                {Math.abs((parseFloat(cashAmount) || 0) + (parseFloat(mpesaAmount) || 0) - (parseFloat(bulkCash) || 0)) >= 0.01 && ` (Expected: KES ${bulkCash})`}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="absolute bottom-0 w-full p-6 bg-background/95 border-t border-border-light pt-4 shadow-lg">
        <TouchableOpacity 
          className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm" 
          onPress={handleSave}
        >
          <Text className="text-[16px] font-bold text-primary-foreground">Finalize Reconciliation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
