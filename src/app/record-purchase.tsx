import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useApp } from '@/database/AppContext';
import { useCalculations } from '@/database/CalculationsContext';
import { getSetting } from '@/database/db';
import { useRouter } from 'expo-router';
import { useKeyboard } from '@/hooks/useKeyboard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ActionDropdown from '@/components/ui/ActionDropdown';
import InfoAlert from '@/components/ui/InfoAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from "@/context/AlertContext";

export default function RecordPurchaseScreen() {
    const { showAlert } = useCustomAlert();
    const { recordPurchase, recordCreditorPayment, transactions, creditors } = useApp();
    const { cashAvailableToday, mpesaAvailableToday } = useCalculations();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 12);
    const isKeyboardVisible = useKeyboard();

    const [operant, setOperant] = useState('');
    const [supplier, setSupplier] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [expectedAmount, setExpectedAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');

    // Calculate creditor balance in real-time
    const expectedNum = parseFloat(expectedAmount) || 0;
    const paidNum = parseFloat(paidAmount) || 0;
    const unpaidAmount = Math.max(0, expectedNum - paidNum);
    const overpaymentAmount = Math.max(0, paidNum - expectedNum);

    // Get current creditor balance for selected supplier
    const currentCreditor = creditors.find(c => c.name === supplier);
    const currentCreditorBalance = currentCreditor ? (currentCreditor.totalOwed - currentCreditor.totalPaid) : 0;
    const newCreditorBalance = currentCreditorBalance + expectedNum - paidNum;

    const savedStaff = getSetting("staff_operants");
    const staffMembers = savedStaff
        ? savedStaff.split(",").map((s) => s.trim()).filter(Boolean)
        : (Array.from(new Set(transactions.map((t) => t.operant).filter(Boolean))) as string[]);

    const savedSuppliers = getSetting("suppliers");
    const parsedSuppliers = savedSuppliers
        ? savedSuppliers.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const supplierMembers = Array.from(new Set([
        ...parsedSuppliers,
        ...creditors.map(c => c.name),
        ...transactions.filter(t => t.type === 'purchase' && t.referenceName).map(t => t.referenceName!)
    ]));

    const recordValidatedPurchase = (expectedNum: number, paidNum: number) => {
        const paymentDiff = paidNum - expectedNum;
        if (paidNum > 0 && paidNum > cashAvailableToday && paymentMethod === 'cash') {
            showAlert("Invalid Request", "The cash you want to pay is more than what you registered in the system\
                            \n\nIf you have extra cash, register it as a sale");
            return;
        }

        if (paidNum > 0 && paidNum > mpesaAvailableToday && paymentMethod === 'mpesa') {
            showAlert("Invalid Request", "The mpesa amount you want to pay is more than what you registered in the system\
                            \n\nIf you have extra money, register it as a sale");
            return;
        }

        try {

            if (paymentDiff === 0) {
                // Full payment - record purchase with actual payment method
                recordPurchase(
                    itemDescription.trim(),
                    expectedNum,
                    paymentMethod,
                    supplier.trim(),
                    operant.trim(),
                    undefined,
                );
            } else {
                // Partial payment or overpayment: post full invoice to supplier credit,
                // then post actual cash/M-Pesa paid. Overpayment becomes supplier credit.
                recordPurchase(
                    itemDescription.trim(),
                    expectedNum,
                    "credit",
                    supplier.trim(),
                    operant.trim(),
                    undefined,
                );

                if (paidNum > 0) {
                    recordCreditorPayment(
                        supplier.trim(),
                        paidNum,
                        paymentMethod,
                        operant.trim(),
                    );
                }
            }

            showAlert(
                "Purchase Recorded",
                `KES ${expectedNum.toLocaleString()} expense logged for ${itemDescription.trim()}.\n${paymentDiff < 0
                    ? `Unpaid KES ${Math.abs(paymentDiff).toLocaleString()} added to creditors.`
                    : paymentDiff > 0
                        ? `Overpayment KES ${paymentDiff.toLocaleString()} recorded as supplier credit.`
                        : ""
                }`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            showAlert(
                "Purchase Failed",
                error instanceof Error ? error.message : "The purchase could not be recorded.",
            );
        }
    };

    const handleSave = () => {
        if (!operant.trim()) {
            showAlert("Staff Required", "Please select who received the items.");
            return;
        }
        if (!supplier.trim()) {
            showAlert("Supplier Required", "Please select a supplier.");
            return;
        }
        if (!itemDescription.trim()) {
            showAlert("Description Required", "Please enter what was purchased.");
            return;
        }
        if (!expectedAmount.trim()) {
            showAlert("Expected Amount Required", "Please enter the expected amount.");
            return;
        }

        const expectedNum = parseFloat(expectedAmount);
        if (isNaN(expectedNum) || expectedNum <= 0) {
            showAlert("Invalid Amount", "Expected amount must be a positive number.");
            return;
        }

        const paidNum = paidAmount.trim() ? parseFloat(paidAmount) : 0;
        if (isNaN(paidNum) || paidNum < 0) {
            showAlert("Invalid Paid Amount", "Paid amount must be a valid number.");
            return;
        }

        if (paidNum > expectedNum) {
            showAlert(
                "Confirm Supplier Overpayment",
                `You entered KES ${paidNum.toLocaleString()} paid against a KES ${expectedNum.toLocaleString()} purchase.\n\nThe extra KES ${(paidNum - expectedNum).toLocaleString()} will be recorded as supplier credit/advance. Confirm this is the correct amount paid.`,
                [
                    { text: "Review Amount", style: "cancel" },
                    {
                        text: "Record Overpayment",
                        style: "destructive",
                        onPress: () => recordValidatedPurchase(expectedNum, paidNum),
                    },
                ],
            );
            return;
        }

        recordValidatedPurchase(expectedNum, paidNum);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
            <ScreenHeader title="Record Business Purchase" subtitle="Log goods bought for the business" />
            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: bottomInset + 104 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6">
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
                        <ActionDropdown
                            label="SUPPLIER"
                            value={supplier}
                            onChange={setSupplier}
                            options={supplierMembers}
                            modalTitle="Select Supplier"
                            isRequired
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">What was purchased</Text>
                        <TextInput
                            className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                            placeholder="e.g. Wheat Flour, charcoal..."
                            placeholderTextColor="#a1b0a3"
                            value={itemDescription}
                            onChangeText={setItemDescription}
                        />
                    </View>

                    <View className="flex-row gap-4 mb-6">
                        <View className="flex-1">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Expected Amount</Text>
                            <TextInput
                                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor="#a1b0a3"
                                value={expectedAmount}
                                onChangeText={setExpectedAmount}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Paid Amount</Text>
                            <TextInput
                                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor="#a1b0a3"
                                value={paidAmount}
                                onChangeText={setPaidAmount}
                            />
                        </View>
                    </View>

                    {/* Real-time creditor balance display */}
                    {supplier && expectedNum > 0 && (
                        <View className="mb-6 bg-card border-[0.5px] border-border-light rounded-[12px] p-4">
                            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-3 uppercase">Creditor Balance Preview</Text>
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-[12px] text-muted-foreground">Current Balance:</Text>
                                <Text className="text-[14px] font-bold text-foreground">KES {currentCreditorBalance.toLocaleString()}</Text>
                            </View>
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-[12px] text-muted-foreground">Unpaid Credit:</Text>
                                <Text className={`text-[14px] font-bold ${unpaidAmount > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                                    {unpaidAmount > 0 ? '+' : ''}KES {unpaidAmount.toLocaleString()}
                                </Text>
                            </View>
                            {overpaymentAmount > 0 && (
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-[12px] text-muted-foreground">Supplier Credit:</Text>
                                    <Text className="text-[14px] font-bold text-primary">
                                        -KES {overpaymentAmount.toLocaleString()}
                                    </Text>
                                </View>
                            )}
                            <View className="flex-row justify-between items-center pt-2 border-t border-border-light">
                                <Text className="text-[12px] font-bold text-muted-foreground">New Balance:</Text>
                                <Text className={`text-[16px] font-bold ${newCreditorBalance > 0 ? 'text-warning' : newCreditorBalance < 0 ? 'text-primary' : 'text-foreground'}`}>
                                    KES {newCreditorBalance.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    )}

                    <InfoAlert message={
                        <Text>
                            <Text className='text-warning block'>Cash Balance: <Text className='text-primary'>{(cashAvailableToday).toLocaleString()}</Text>{`\n`}</Text>
                            <Text className='text-warning block'>M-Pesa Balance: <Text className='text-primary'>{(mpesaAvailableToday).toLocaleString()}</Text>{`\n`}</Text>
                            Any <Text className="font-bold text-foreground">deficit</Text> creates a creditor balance. Any confirmed <Text className="font-bold text-primary">overpayment</Text> creates supplier credit.
                        </Text>
                    } />

                    <View className="mb-8">
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Payment Method</Text>
                        <View className="flex-row bg-input rounded-[12px] p-1 gap-1">
                            <TouchableOpacity
                                className={`flex-1 py-4 items-center rounded-[10px] ${paymentMethod === 'cash' ? 'bg-card border border-border-strong shadow-sm' : ''}`}
                                onPress={() => setPaymentMethod('cash')}
                            >
                                <Text className={`text-[14px] font-medium ${paymentMethod === 'cash' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>💵 Cash</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-4 items-center rounded-[10px] ${paymentMethod === 'mpesa' ? 'bg-card border border-border-strong shadow-sm' : ''}`}
                                onPress={() => setPaymentMethod('mpesa')}
                            >
                                <Text className={`text-[14px] font-medium ${paymentMethod === 'mpesa' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>📱 M-Pesa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {!isKeyboardVisible && (
                <View
                    className="absolute bottom-0 w-full px-6 bg-background border-t border-border-light pt-4"
                    style={{ paddingBottom: bottomInset }}
                >
                    <TouchableOpacity
                        className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm"
                        onPress={handleSave}
                    >
                        <Text className="text-[16px] font-bold text-primary-foreground">+ Add Purchase</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
