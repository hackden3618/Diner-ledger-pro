import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/database/AppContext';
import { useCustomAlert } from "@/context/AlertContext";
import { useRouter } from 'expo-router';

type DebtorsScreenProps = {
    debtorTab: 'debtors' | 'creditors';
    setDebtorTab: (tab: 'debtors' | 'creditors') => void;
    setSelectedDebtorName: (name: string) => void;
    setPaymentModalVisible: (visible: boolean) => void;
    setSelectedCreditorName: (name: string) => void;
    setCreditorPayModalVisible: (visible: boolean) => void;
};

/**
 * Displays a searchable interface for managing customer and supplier outstanding accounts with options to record payments, reassign debts, and write off balances.
 */
export default function DebtorsScreen({
    debtorTab,
    setDebtorTab,
    setSelectedDebtorName,
    setPaymentModalVisible,
    setSelectedCreditorName,
    setCreditorPayModalVisible,
}: DebtorsScreenProps) {
    const { showAlert } = useCustomAlert();
    const { debtors, creditors, clearDebtorAccount, clearCreditorAccount } = useApp();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');

    const activeDebtors = debtors.filter(debtor => (debtor.totalOwed - debtor.totalPaid) !== 0);
    const activeCreditors = creditors.filter(creditor => (creditor.totalOwed - creditor.totalPaid) !== 0);

    const filteredDebtors = activeDebtors.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredCreditors = activeCreditors.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleWriteOffDebtor = (debtor_name: string, debtor_id: number, isCreditor: boolean = false) => {
        showAlert("Confirm Write-Off",
            `Are you sure you want to write off this balance? \nThis will record a ${isCreditor ? 'gain (adjustment)' : 'business loss'} and clear the account.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Write Off", style: "destructive", onPress: () => {
                        try {
                            if (isCreditor) {
                                clearCreditorAccount(debtor_id);
                            } else {
                                clearDebtorAccount(debtor_id);
                            }
                            showAlert("Written Off", `The account has been cleared.\nName: ${debtor_name}`);
                        } catch (error) {
                            showAlert("Write-Off Failed", error instanceof Error ? error.message : "Could not write off this account.");
                        }
                    }
                }
            ]
        );
    }

    const openReassignModal = (debtor: any, outstanding: number) => {
        router.push({
            pathname: '/reassign-debt',
            params: {
                originalDebtorName: debtor.name,
                originalAmount: outstanding,
                debtorId: debtor.id
            }
        });
    };

    return (
        <KeyboardAvoidingView className="flex-1" behavior='padding'>
            {/* Search Bar */}
            <View className="bg-card border border-border rounded-[12px] flex-row items-center px-4 h-12 mb-[14px]">
                <Ionicons name="search" size={18} color="#a1b0a3" />
                <TextInput
                    className="flex-1 ml-2 text-[14px] text-foreground h-full"
                    placeholder={`Search ${debtorTab}...`}
                    placeholderTextColor="#a1b0a3"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#a1b0a3" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Sub-tabs */}
            <View className="flex-row bg-card border-[0.5px] border-border-strong rounded-[10px] p-[3px] mb-[14px]">
                <TouchableOpacity
                    className={`flex-1 py-[6px] items-center rounded-lg ${debtorTab === 'debtors' ? 'bg-muted' : ''}`}
                    onPress={() => { setDebtorTab('debtors'); setSearchQuery(''); }}
                >
                    <Text className={`text-[12px] font-medium ${debtorTab === 'debtors' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        Debtors ({activeDebtors.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-[6px] items-center rounded-lg ${debtorTab === 'creditors' ? 'bg-muted' : ''}`}
                    onPress={() => { setDebtorTab('creditors'); setSearchQuery(''); }}
                >
                    <Text className={`text-[12px] font-medium ${debtorTab === 'creditors' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        Creditors ({activeCreditors.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                {debtorTab === 'debtors' ? (
                    <View>
                        {filteredDebtors.length === 0 && (
                            <View className="items-center py-12">
                                <Ionicons name={searchQuery ? "search-outline" : "checkmark-circle-outline"} size={44} color={searchQuery ? "#a1b0a3" : "#2ecc71"} />
                                <Text className="text-[14px] font-bold text-foreground mt-3">
                                    {searchQuery ? "No Results Found" : "No Outstanding Debtors"}
                                </Text>
                                <Text className="text-[12px] text-muted-foreground mt-1 text-center px-6">
                                    {searchQuery ? `No debtor matches "${searchQuery}"` : "All customer accounts are settled."}
                                </Text>
                            </View>
                        )}
                        {filteredDebtors.map((debtor, idx) => {
                            const outstanding = debtor.totalOwed - debtor.totalPaid;
                            const isNegative = outstanding < 0;
                            const isUnknown = debtor.name.includes("Unknown Debtor") || debtor.name.includes("Shortfall");
                            
                            return (
                                <View key={idx} className="bg-card border-[0.5px] border-border rounded-xl p-3 mb-2">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1 pr-2">
                                            <Text className="text-[13px] font-bold text-foreground">{debtor.name}</Text>
                                            {debtor.phone ? (
                                                <Text className="text-[10px] text-info mt-[1px]">📞 {debtor.phone}</Text>
                                            ) : null}
                                            <Text className="text-[9px] text-muted-foreground mt-0.5">
                                                Last updated: {new Date(debtor.lastUpdated).toLocaleDateString('en-KE')}
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className={`text-[14px] font-bold ${isNegative ? 'text-primary' : 'text-destructive'}`}>KES {outstanding.toLocaleString()}</Text>
                                            <Text className="text-[8px] text-muted-foreground">{isNegative ? 'We Owe Them' : 'Outstanding Balance'}</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between mt-2 border-b-[0.5px] border-border pb-2">
                                        <Text className="text-[10px] text-muted-foreground">
                                            Total Ever Owed: KES {debtor.totalOwed.toLocaleString()}
                                        </Text>
                                        <Text className="text-[10px] text-primary">
                                            Total Ever Paid: KES {debtor.totalPaid.toLocaleString()}
                                        </Text>
                                    </View>

                                    <View className="flex-row gap-2 mt-2">
                                        {isNegative ? (
                                            <View className="flex-1 bg-muted items-center justify-center py-[7px] rounded-lg">
                                                <Text className="text-[11px] font-bold text-muted-foreground">Customer Credit</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    className="flex-1 bg-primary items-center justify-center py-[7px] rounded-lg"
                                                    onPress={() => {
                                                        setSelectedDebtorName(debtor.name);
                                                        setPaymentModalVisible(true);
                                                    }}
                                                >
                                                    <Text className="text-[11px] font-bold text-background">Record Payment</Text>
                                                </TouchableOpacity>

                                                {/* Reassign Button for Unknown Debtors / Shortfalls */}
                                                {isUnknown && (
                                                    <TouchableOpacity
                                                        className="flex-1 bg-info/20 border-[0.5px] border-info/40 items-center justify-center py-[7px] rounded-lg"
                                                        onPress={() => openReassignModal(debtor, outstanding)}
                                                    >
                                                        <Text className="text-[11px] font-bold text-info">Edit/Reassign</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        )}
                                        <TouchableOpacity
                                            className="h-8 px-3 rounded-lg border-[0.5px] border-destructive/30 bg-destructive/10 items-center justify-center"
                                            onPress={() => handleWriteOffDebtor(debtor.name, debtor.id)}
                                        >
                                            <Text className="text-[11px] font-bold text-destructive">Write Off</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View>
                        {filteredCreditors.length === 0 && (
                            <View className="items-center py-12">
                                <Ionicons name={searchQuery ? "search-outline" : "checkmark-circle-outline"} size={44} color={searchQuery ? "#a1b0a3" : "#2ecc71"} />
                                <Text className="text-[14px] font-bold text-foreground mt-3">
                                    {searchQuery ? "No Results Found" : "No Outstanding Creditors"}
                                </Text>
                                <Text className="text-[12px] text-muted-foreground mt-1 text-center px-6">
                                    {searchQuery ? `No creditor matches "${searchQuery}"` : "All supplier accounts are settled."}
                                </Text>
                            </View>
                        )}
                        {filteredCreditors.map((creditor, idx) => {
                            const outstanding = creditor.totalOwed - creditor.totalPaid;
                            const isNegative = outstanding < 0;
                            return (
                                <View key={idx} className="bg-card border-[0.5px] border-border rounded-xl p-3 mb-2">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1 pr-2">
                                            <Text className="text-[13px] font-bold text-foreground">{creditor.name}</Text>
                                            {creditor.phone ? (
                                                <Text className="text-[10px] text-info mt-[1px]">📞 {creditor.phone}</Text>
                                            ) : null}
                                            <Text className="text-[9px] text-muted-foreground mt-0.5">
                                                Purchase date: {new Date(creditor.lastUpdated).toLocaleDateString('en-KE')}
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className={`text-[14px] font-bold ${isNegative ? 'text-primary' : 'text-warning'}`}>KES {outstanding.toLocaleString()}</Text>
                                            <Text className="text-[8px] text-muted-foreground">{isNegative ? 'They Owe Us' : 'We Owe'}</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between mt-2 border-b-[0.5px] border-border pb-2">
                                        <Text className="text-[10px] text-muted-foreground">
                                            Total Ever Owed: KES {creditor.totalOwed.toLocaleString()}
                                        </Text>
                                        <Text className="text-[10px] text-primary">
                                            Total Ever Paid: KES {creditor.totalPaid.toLocaleString()}
                                        </Text>
                                    </View>

                                    <View className="flex-row gap-2 mt-2">
                                        {isNegative ? (
                                            <View className="flex-1 bg-muted items-center justify-center py-[7px] rounded-lg">
                                                <Text className="text-[11px] font-bold text-muted-foreground">Supplier Credit</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                className="flex-1 bg-warning items-center justify-center py-[7px] rounded-lg"
                                                onPress={() => {
                                                    setSelectedCreditorName(creditor.name);
                                                    setCreditorPayModalVisible(true);
                                                }}
                                            >
                                                <Text className="text-[11px] font-bold text-background">Record Partial Payment</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            className="h-8 px-3 rounded-lg border-[0.5px] border-destructive/30 bg-destructive/10 items-center justify-center"
                                            onPress={() => handleWriteOffDebtor(creditor.name, creditor.id, true)}
                                        >
                                            <Text className="text-[11px] font-bold text-destructive">Write Off</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

        </KeyboardAvoidingView>
    );
}
