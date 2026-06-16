import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/database/AppContext';
import { useCustomAlert } from "@/context/AlertContext";

type DebtorsScreenProps = {
    debtorTab: 'debtors' | 'creditors';
    setDebtorTab: (tab: 'debtors' | 'creditors') => void;
    setSelectedDebtorName: (name: string) => void;
    setPaymentModalVisible: (visible: boolean) => void;
    setSelectedCreditorName: (name: string) => void;
    setCreditorPayModalVisible: (visible: boolean) => void;
};

export default function DebtorsScreen({
    debtorTab,
    setDebtorTab,
    setSelectedDebtorName,
    setPaymentModalVisible,
    setSelectedCreditorName,
    setCreditorPayModalVisible,
}: DebtorsScreenProps) {
    const { showAlert } = useCustomAlert();
    const { debtors, creditors, clearDebtorAccount } = useApp();

    const activeDebtors = debtors.filter(debtor => (debtor.totalOwed - debtor.totalPaid) !== 0);
    const activeCreditors = creditors.filter(creditor => (creditor.totalOwed - creditor.totalPaid) !== 0);

    const handleDeleteDebtor = (debtor_name: string, debtor_id: number) => {
        showAlert("Dangerous Action!",
            "This action will cause a ledger imbalance! \nAre you sure of this?",
            [
                { text: "Abort", style: "cancel" },
                {
                    text: "Continue Anyway", style: "destructive", onPress: () => {
                        showAlert("Deleted!", "The debtor's record has been deleted successfully \nDebtor Name: " + debtor_name)
                        clearDebtorAccount(debtor_id);
                    }
                }
            ]
        );
    }

    return (
        <KeyboardAvoidingView className="flex-1" behavior='padding'>
            {/* Sub-tabs */}
            <View className="flex-row bg-card border-[0.5px] border-border-strong rounded-[10px] p-[3px] mb-[14px]">
                <TouchableOpacity
                    className={`flex-1 py-[6px] items-center rounded-lg ${debtorTab === 'debtors' ? 'bg-muted' : ''}`}
                    onPress={() => setDebtorTab('debtors')}
                >
                    <Text className={`text-[12px] font-medium ${debtorTab === 'debtors' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        Debtors ({activeDebtors.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-[6px] items-center rounded-lg ${debtorTab === 'creditors' ? 'bg-muted' : ''}`}
                    onPress={() => setDebtorTab('creditors')}
                >
                    <Text className={`text-[12px] font-medium ${debtorTab === 'creditors' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        Creditors ({activeCreditors.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                {debtorTab === 'debtors' ? (
                    <View>
                        {activeDebtors.length === 0 && (
                            <View className="items-center py-12">
                                <Ionicons name="checkmark-circle-outline" size={44} color="#2ecc71" />
                                <Text className="text-[14px] font-bold text-foreground mt-3">No Outstanding Debtors</Text>
                                <Text className="text-[12px] text-muted-foreground mt-1">All customer accounts are settled.</Text>
                            </View>
                        )}
                        {activeDebtors.map((debtor, idx) => {
                            const outstanding = debtor.totalOwed - debtor.totalPaid;
                            const isNegative = outstanding < 0;
                            return (
                                <View key={idx} className="bg-card border-[0.5px] border-border rounded-xl p-3 mb-2">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1">
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
                                            <TouchableOpacity
                                                className="flex-1 bg-primary items-center justify-center py-[7px] rounded-lg"
                                                onPress={() => {
                                                    setSelectedDebtorName(debtor.name);
                                                    setPaymentModalVisible(true);
                                                }}
                                            >
                                                <Text className="text-[11px] font-bold text-background">Record Payment</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            className="w-8 h-8 rounded-lg border-[0.5px] border-destructive/30 bg-destructive/10 items-center justify-center"
                                            onPress={() => handleDeleteDebtor(debtor.name, debtor.id)}
                                        >
                                            <Ionicons name="trash-outline" size={15} color="#e74c3c" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View>
                        {activeCreditors.length === 0 && (
                            <View className="items-center py-12">
                                <Ionicons name="checkmark-circle-outline" size={44} color="#2ecc71" />
                                <Text className="text-[14px] font-bold text-foreground mt-3">No Outstanding Creditors</Text>
                                <Text className="text-[12px] text-muted-foreground mt-1">All supplier accounts are settled.</Text>
                            </View>
                        )}
                        {activeCreditors.map((creditor, idx) => {
                            const outstanding = creditor.totalOwed - creditor.totalPaid;
                            const isNegative = outstanding < 0;
                            return (
                                <View key={idx} className="bg-card border-[0.5px] border-border rounded-xl p-3 mb-2">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1">
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
