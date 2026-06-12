import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Alert, ScrollView } from 'react-native';
import { useApp } from '@/database/AppContext';
import { getSetting } from '@/database/db';
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ActionDropdown from '@/components/ui/ActionDropdown';
import InfoAlert from '@/components/ui/InfoAlert';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecordPurchaseScreen() {
    const { recordPurchase, recordCreditorPayment, transactions, creditors } = useApp();
    const router = useRouter();

    const [operant, setOperant] = useState('');
    const [supplier, setSupplier] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [expectedAmount, setExpectedAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');

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

    const handleSave = () => {
        if (!operant.trim()) {
            Alert.alert("Staff Required", "Please select who received the items.");
            return;
        }
        if (!supplier.trim()) {
            Alert.alert("Supplier Required", "Please select a supplier.");
            return;
        }
        if (!itemDescription.trim()) {
            Alert.alert("Description Required", "Please enter what was purchased.");
            return;
        }
        if (!expectedAmount.trim()) {
            Alert.alert("Expected Amount Required", "Please enter the expected amount.");
            return;
        }

        const expectedNum = parseFloat(expectedAmount);
        if (isNaN(expectedNum) || expectedNum <= 0) {
            Alert.alert("Invalid Amount", "Expected amount must be a positive number.");
            return;
        }

        const paidNum = paidAmount.trim() ? parseFloat(paidAmount) : 0;
        if (isNaN(paidNum) || paidNum < 0) {
            Alert.alert("Invalid Paid Amount", "Paid amount must be a valid number.");
            return;
        }

        const paymentDiff = paidNum - expectedNum;

        // logic for overpayment and underpayment of purchases
        if (paymentDiff === 0) {
            recordPurchase(
                itemDescription.trim(),
                expectedNum,
                paymentMethod,
                supplier.trim(),
                operant.trim(),
                undefined,
            );
        }else if(paymentDiff > 0){
            recordPurchase(
                itemDescription.trim(),
                paidNum,
                paymentMethod,
                supplier.trim(),
                operant.trim(),
                undefined,
            );
            recordCreditorPayment(
                supplier.trim(),
                paymentDiff,
                paymentMethod,
                operant.trim(),
            )
        }else if (paymentDiff < 0){
            recordPurchase(
                itemDescription.trim(),
                paidNum,
                paymentMethod,
                supplier.trim(),
                operant.trim(),
                undefined,
            );
            
            recordPurchase(
                itemDescription.trim(),
                paymentDiff,
                "credit",
                supplier.trim(),
                operant.trim(),
                undefined,
            );
        }

        Alert.alert(
            "✅ Purchase Recorded",
            `KES ${expectedNum.toLocaleString()} expense logged for ${itemDescription.trim()}.\n${paymentDiff < 0 ? `Unpaid KES ${Math.abs(paymentDiff).toLocaleString()} added to Creditors.` : ""}`,
            [{ text: 'OK', onPress: () => router.back() }]
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
            <ScreenHeader title="Record Business Purchase" subtitle="Log goods bought for the business" />
            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
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
                            placeholderTextColor="var(--muted-dark)"
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
                                placeholderTextColor="var(--muted-dark)"
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
                                placeholderTextColor="var(--muted-dark)"
                                value={paidAmount}
                                onChangeText={setPaidAmount}
                            />
                        </View>
                    </View>

                    <InfoAlert message={
                        <Text>
                            Any <Text className="font-bold text-foreground">deficit</Text> between the expected cost and amount paid will automatically create a <Text className="font-bold text-primary">creditor entry</Text> for the selected supplier.
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

            <View className="absolute bottom-0 w-full p-6 bg-background/90 border-t border-border-light pt-4">
                <TouchableOpacity
                    className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm"
                    onPress={handleSave}
                >
                    <Text className="text-[16px] font-bold text-primary-foreground">+ Add Purchase</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
