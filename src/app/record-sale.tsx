import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useApp } from '@/database/AppContext';
import { getSetting } from '@/database/db';
import { useRouter } from 'expo-router';
import { useKeyboard } from '@/hooks/useKeyboard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ActionDropdown from '@/components/ui/ActionDropdown';
import ProductImage from '@/components/ui/ProductImage';
import InfoAlert from '@/components/ui/InfoAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from "@/context/AlertContext";

export default function RecordSaleScreen() {
    const { showAlert } = useCustomAlert();
    const { meals, recordSale, transactions } = useApp();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 12);
    const isKeyboardVisible = useKeyboard();

    const [operant, setOperant] = useState("");
    const [selectedSaleItems, setSelectedSaleItems] = useState<{ [mealId: number]: number }>({});
    const [saleType, setSaleType] = useState<"dinein" | "credit" | "consumed">("dinein");
    const [salePaymentMethod, setSalePaymentMethod] = useState<"cash" | "mpesa">("cash");
    const [saleReferenceName, setSaleReferenceName] = useState("");
    const [saleAmountPaid, setSaleAmountPaid] = useState("");
    const [consumedDescription, setConsumedDescription] = useState("");

    const savedStaff = getSetting("staff_operants");
    const staffMembers = savedStaff
        ? savedStaff.split(",").map((s) => s.trim()).filter(Boolean)
        : (Array.from(new Set(transactions.map((t) => t.operant).filter(Boolean))) as string[]);

    const runningTotal = Object.entries(selectedSaleItems).reduce((sum, [mid, qty]) => {
        const m = meals.find((x) => x.id === parseInt(mid));
        return sum + (m ? m.price * qty : 0);
    }, 0);

    const handleSetQuantity = (mealId: number, stock: number, text: string) => {
        const qty = parseInt(text) || 0;
        setSelectedSaleItems((prev) => {
            if (qty <= 0) {
                const next = { ...prev };
                delete next[mealId];
                return next;
            }
            return {
                ...prev,
                [mealId]: Math.min(qty, stock),
            };
        });
    };

    const handleRecordSaleSave = () => {
        if (!operant.trim()) {
            showAlert("Staff Member Required", "Please select the staff member before saving.");
            return;
        }

        const saleItems = Object.entries(selectedSaleItems)
            .filter(([_, qty]) => qty > 0)
            .map(([mealIdStr, qty]) => {
                const mealId = parseInt(mealIdStr);
                const m = meals.find((x) => x.id === mealId)!;
                return { mealId, name: m.name, qty, price: m.price };
            });

        if (saleItems.length === 0) {
            showAlert("Empty Cart", "Select at least one meal and specify the quantity.");
            return;
        }

        if (saleType === "credit" && !saleReferenceName.trim()) {
            showAlert("Debtor Name Required", "Specify the debtor name for a credit sale.");
            return;
        }

        if (saleType === "consumed" && !consumedDescription.trim()) {
            showAlert("Description Required", "Please provide a description for the internal consumption.");
            return;
        }

        const amtPaid = parseFloat(saleAmountPaid);
        // Require customer name for underpayment (paid less than required)
        if (!isNaN(amtPaid) && amtPaid >= 0 && amtPaid < runningTotal && !saleReferenceName.trim() && saleType === "dinein") {
            showAlert("Customer Name Required", "Customer underpaid. Please provide their name to register the debt.");
            return;
        }

        // Require customer name for overpayment (paid more than required)
        if (!isNaN(amtPaid) && amtPaid > runningTotal && !saleReferenceName.trim() && saleType === "dinein") {
            showAlert("Customer Name Required", "Customer overpaid. Please provide their name to register the credit.");
            return;
        }

        for (const item of saleItems) {
            const dbMeal = meals.find((m) => m.id === item.mealId);
            if (!dbMeal) continue;
            if (item.qty <= 0 || isNaN(item.qty)) {
                showAlert("Invalid Quantity", "Quantities must be positive numbers.");
                return;
            }
            if (item.qty > dbMeal.stock) {
                showAlert("Stock Exceeded", `Cannot sell ${item.qty} of ${item.name}. Only ${dbMeal.stock} in stock.`);
                return;
            }
        }

        const resolvedPayMethod: "cash" | "mpesa" | "credit" | "none" =
            saleType === "credit" ? "credit" : saleType === "consumed" ? "none" : salePaymentMethod;

        try {
            recordSale(
                saleItems,
                saleType,
                resolvedPayMethod,
                operant.trim(),
                saleReferenceName.trim() || undefined,
                !isNaN(amtPaid) ? amtPaid : undefined,
                consumedDescription.trim() || undefined
            );

            showAlert("Transaction Successful", "Sale recorded successfully.", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            showAlert(
                "Transaction Failed",
                error instanceof Error ? error.message : "The sale could not be recorded.",
            );
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
            <ScreenHeader title="Record Transaction" subtitle="Log sales, credit, takeaway, or internal consumption" />
            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: bottomInset + 136 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                    <View className="mb-6 z-50">
                        <ActionDropdown
                            label="RECORDED BY (STAFF)"
                            value={operant}
                            onChange={setOperant}
                            options={staffMembers}
                            modalTitle="Select Staff"
                            isRequired
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-4 uppercase">Select Items</Text>
                        <View className="bg-card border border-border rounded-[16px] overflow-hidden">
                            {meals.map((meal, index) => {
                                const currentQty = selectedSaleItems[meal.id] || 0;
                                const atMax = currentQty >= meal.stock;
                                const isLast = index === meals.length - 1;
                                return (
                                    <View
                                        key={meal.id}
                                        className={`flex-row items-center p-4 ${!isLast ? 'border-b border-border' : ''}`}
                                    >
                                        <View className="flex-row items-center flex-1 gap-3">
                                            <ProductImage
                                                image={meal.image}
                                                name={meal.name}
                                                price={meal.price}
                                                stock={meal.stock}
                                                size="small"
                                            />
                                            <View className="flex-1">
                                                <Text className="text-[14px] font-bold text-foreground">{meal.name}</Text>
                                                <Text className="text-[11px] text-primary mt-[2px] font-medium">KES {meal.price}</Text>
                                                <Text className="text-[10px] text-muted-foreground mt-[2px]">{meal.stock} available</Text>
                                            </View>
                                        </View>

                                        <View className="flex-row items-center bg-input rounded-[12px] p-1 border border-border-light">
                                            <TouchableOpacity
                                                className="w-[32px] h-[32px] bg-card rounded-[8px] items-center justify-center shadow-sm"
                                                onPress={() => setSelectedSaleItems(prev => ({ ...prev, [meal.id]: Math.max(0, currentQty - 1) }))}
                                            >
                                                <Text className="text-[16px] font-bold text-foreground">-</Text>
                                            </TouchableOpacity>
                                            <TextInput
                                                className="text-[14px] font-bold text-foreground w-12 text-center"
                                                keyboardType="numeric"
                                                value={currentQty > 0 ? currentQty.toString() : ""}
                                                onChangeText={(text) => handleSetQuantity(meal.id, meal.stock, text)}
                                                placeholder="0"
                                                placeholderTextColor="#a1b0a3"
                                            />
                                            <TouchableOpacity
                                                className={`w-[32px] h-[32px] rounded-[8px] items-center justify-center ${atMax ? 'bg-muted opacity-50' : 'bg-primary shadow-sm'}`}
                                                disabled={atMax}
                                                onPress={() => setSelectedSaleItems(prev => ({ ...prev, [meal.id]: Math.min(meal.stock, currentQty + 1) }))}
                                            >
                                                <Text className={`text-[16px] font-bold ${atMax ? 'text-muted-foreground' : 'text-primary-foreground'}`}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                            {meals.length === 0 && (
                                <View className="p-6 items-center">
                                    <Text className="text-[13px] text-muted-foreground">No meals available.</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View className="mb-6">
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-3 uppercase">Sale Type</Text>
                        <View className="flex-row bg-input rounded-[12px] p-1 gap-1">
                            {(["dinein", "credit", "consumed"] as const).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    className={`flex-1 py-3 items-center rounded-[10px] ${saleType === type ? "bg-card border border-border-strong shadow-sm" : ""}`}
                                    onPress={() => setSaleType(type)}
                                >
                                    <Text className={`text-[11px] font-medium ${saleType === type ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                        {type === "dinein" ? "Dine-In" : type === "credit" ? "Credit" : "Internal"}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {saleType === "credit" && (
                        <View className="mb-6">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Debtor Name</Text>
                            <TextInput
                                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                placeholder="Enter customer name..."
                                placeholderTextColor="#a1b0a3"
                                value={saleReferenceName}
                                onChangeText={setSaleReferenceName}
                                autoCapitalize="words"
                            />
                        </View>
                    )}



                    {saleType === "consumed" && (
                        <View className="mb-6">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Description (Required)</Text>
                            <TextInput
                                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                placeholder="e.g Kanyiri, breakfast..."
                                placeholderTextColor="#a1b0a3"
                                value={consumedDescription}
                                onChangeText={setConsumedDescription}
                                autoCapitalize="sentences"
                            />
                        </View>
                    )}

                    {saleType === "dinein" && (
                        <View className="mb-6">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-3 uppercase">Payment Method</Text>
                            <View className="flex-row bg-input rounded-[12px] p-1 gap-1">
                                {(["cash", "mpesa"] as const).map((method) => (
                                    <TouchableOpacity
                                        key={method}
                                        className={`flex-1 py-3 items-center rounded-[10px] ${salePaymentMethod === method ? "bg-card border border-border-strong shadow-sm" : ""}`}
                                        onPress={() => setSalePaymentMethod(method)}
                                    >
                                        <Text className={`text-[13px] font-medium ${salePaymentMethod === method ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                            {method === "cash" ? "💵 Cash" : "📱 M-Pesa"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 mt-4 uppercase">Amount Paid (Optional)</Text>
                            <TextInput
                                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                placeholder={`e.g. ${runningTotal || 0}`}
                                placeholderTextColor="#a1b0a3"
                                keyboardType="numeric"
                                value={saleAmountPaid}
                                onChangeText={setSaleAmountPaid}
                            />

                            {parseFloat(saleAmountPaid) > 0 && parseFloat(saleAmountPaid) !== runningTotal && saleType === "dinein" && (
                                <View className="mt-4">
                                    {parseFloat(saleAmountPaid) > runningTotal ? (
                                        <InfoAlert message={
                                            <Text>
                                                Customer overpaid by KES {(parseFloat(saleAmountPaid) - runningTotal).toLocaleString()}. The excess will be stored as <Text className="font-bold text-primary">credit</Text> in their account.
                                            </Text>
                                        } />
                                    ) : (
                                        <InfoAlert message={
                                            <Text>
                                                Customer underpaid by KES {(runningTotal - parseFloat(saleAmountPaid)).toLocaleString()}. The balance will be added to their <Text className="font-bold text-primary">debt</Text>.
                                            </Text>
                                        } />
                                    )}
                                    <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Customer Name (Required)</Text>
                                    <TextInput
                                        className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                        placeholder="Enter customer name..."
                                        placeholderTextColor="#a1b0a3"
                                        value={saleReferenceName}
                                        onChangeText={setSaleReferenceName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            )}
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            {!isKeyboardVisible && (
                <View
                    className="absolute bottom-0 w-full bg-background border-t border-border-light pt-4 px-6 shadow-lg"
                    style={{ paddingBottom: bottomInset }}
                >
                    <View className="flex-row justify-between items-center mb-4 px-2">
                        <Text className="text-[13px] text-muted-foreground uppercase tracking-[1px]">Total Due</Text>
                        <Text className="text-[20px] font-bold text-primary">KES {runningTotal.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity
                        className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm"
                        onPress={handleRecordSaleSave}
                    >
                        <Text className="text-[16px] font-bold text-primary-foreground">Save Transaction</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
