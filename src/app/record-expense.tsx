import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Alert, ScrollView } from 'react-native';
import { useApp } from '@/database/AppContext';
import { getSetting } from '@/database/db';
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ActionDropdown from '@/components/ui/ActionDropdown';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalculations } from '@/database/CalculationsContext';
import InfoAlert from '@/components/ui/InfoAlert';

export default function RecordExpenseScreen() {
    const { recordExpense, transactions } = useApp();
    const { cashAvailableToday, mpesaAvailableToday, moneyInHouse } = useCalculations();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 12);

    const [operant, setOperant] = useState('');
    const [expenseTitle, setExpenseTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');

    const savedStaff = getSetting("staff_operants");
    const staffMembers = savedStaff
        ? savedStaff.split(",").map((s) => s.trim()).filter(Boolean)
        : (Array.from(new Set(transactions.map((t) => t.operant).filter(Boolean))) as string[]);

    const handleSave = () => {
        if (!operant.trim()) {
            Alert.alert("Staff Required", "Please select who made the expense.");
            return;
        }
        if (!expenseTitle.trim()) {
            Alert.alert("Title Required", "Please enter what the expense was for.");
            return;
        }
        if (!amount.trim()) {
            Alert.alert("Amount Required", "Please enter the amount.");
            return;
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            Alert.alert("Invalid Amount", "Amount must be a positive number.");
            return;
        }

        if ((amountNum > cashAvailableToday) && paymentMethod === 'cash') {
            Alert.alert("Invalid Request", "The cash you want to pay is more than what you registered in the system\
                            \n\nIf you have extra cash, register it as a sale");
            return;
        }

        if ((amountNum > mpesaAvailableToday) && paymentMethod === 'mpesa') {
            Alert.alert("Invalid Request", "The mpesa amount you want to pay is more than what you registered in the system\
                            \n\nIf you have extra money, register it as a sale");
            return;
        }


        try {
            recordExpense(expenseTitle.trim(), amountNum, paymentMethod, operant.trim());

            Alert.alert(
                "✅ Expense Recorded",
                `KES ${amountNum.toLocaleString()} logged for ${expenseTitle.trim()}.`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert(
                "Expense Failed",
                error instanceof Error ? error.message : "The expense could not be recorded.",
            );
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
            <ScreenHeader title="Record Business Expense" subtitle="Log non-stock expenses like rent, bills, or transport" />
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
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Expense Description</Text>
                        <TextInput
                            className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                            placeholder="e.g. Transport, Rent, Electricity..."
                            placeholderTextColor="var(--muted-dark)"
                            value={expenseTitle}
                            onChangeText={setExpenseTitle}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Amount (KES)</Text>
                        <TextInput
                            className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                            placeholder="0.00"
                            keyboardType="numeric"
                            placeholderTextColor="var(--muted-dark)"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

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
                    <InfoAlert message={
                        <Text>
                            <Text className='text-warning block'>Cash Balance: <Text className='text-primary'>{(cashAvailableToday).toLocaleString()}</Text>{`\n`}</Text>
                            <Text className='text-warning block'>M-Pesa Balance: <Text className='text-primary'>{(mpesaAvailableToday).toLocaleString()}</Text>{`\n`}</Text>
                            <Text>If the balances can't pay for the items and you expend on credit, record a credit purchase.</Text>
                        </Text>
                    } />

                </ScrollView>
            </KeyboardAvoidingView>

            <View
                className="absolute bottom-0 w-full px-6 bg-background border-t border-border-light pt-4"
                style={{ paddingBottom: bottomInset }}
            >
                <TouchableOpacity
                    className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm"
                    onPress={handleSave}
                >
                    <Text className="text-[16px] font-bold text-primary-foreground">+ Add Expense</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
