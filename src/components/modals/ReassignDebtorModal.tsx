import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/database/AppContext';
import { updateDebtor } from '@/database/db';
import { useCustomAlert } from '@/context/AlertContext';
import InfoAlert from '@/components/ui/InfoAlert';

type ReassignDebtorModalProps = {
    visible: boolean;
    onClose: () => void;
    originalDebtorName: string;
    originalAmount: number;
    debtorId: number;
};

export default function ReassignDebtorModal({ visible, onClose, originalDebtorName, originalAmount, debtorId }: ReassignDebtorModalProps) {
    const { showAlert } = useCustomAlert();
    const { debtors, refreshAll } = useApp();
    const [assignments, setAssignments] = useState<{ name: string; amount: number }[]>([]);

    const totalReassigned = assignments.reduce((sum, a) => sum + (a.amount || 0), 0);
    const remainingBalance = originalAmount - totalReassigned;

    const addAssignment = () => {
        setAssignments((prev) => [...prev, { name: "", amount: 0 }]);
    };

    const updateAssignment = (index: number, field: "name" | "amount", value: string) => {
        setAssignments((prev) =>
            prev.map((a, i) => {
                if (i === index) {
                    if (field === "amount") {
                        const val = parseFloat(value) || 0;
                        return { ...a, amount: Math.max(0, val) }; // prevent negative values
                    }
                    return { ...a, name: value };
                }
                return a;
            })
        );
    };

    const removeAssignment = (index: number) => {
        setAssignments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (remainingBalance < 0) {
            showAlert("Invalid Allocation", "You cannot reassign more than the original debt amount.");
            return;
        }

        const validAssignments = assignments.filter(a => a.name.trim() !== "" && a.amount > 0);
        if (validAssignments.length === 0) {
            showAlert("No Valid Assignments", "Please provide at least one valid name and amount.");
            return;
        }

        showAlert(
            "Confirm Reassignment",
            `You are reassigning KES ${totalReassigned.toLocaleString()} to ${validAssignments.length} people. \n\n${remainingBalance > 0 ? `KES ${remainingBalance.toLocaleString()} will remain on the original account (${originalDebtorName}).` : `The original account (${originalDebtorName}) will be fully cleared.`}\n\nProceed?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => {
                        // 1. Reduce from original debtor
                        updateDebtor(originalDebtorName, -totalReassigned, 0);

                        // 2. Add to the new ones
                        validAssignments.forEach(a => {
                            // Ensure unique mapping if they already exist
                            updateDebtor(a.name.trim(), a.amount, 0);
                        });

                        refreshAll(); // Trigger global UI update
                        showAlert("Success", "Debt successfully reassigned.");
                        setAssignments([]);
                        onClose();
                    }
                }
            ]
        );
    };

    const handleClose = () => {
        setAssignments([]);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/60">
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="bg-background rounded-t-[24px] overflow-hidden max-h-[90%]">
                    <View className="flex-row justify-between items-center p-5 border-b border-border">
                        <View>
                            <Text className="text-[16px] font-bold text-foreground">Edit / Reassign Debt</Text>
                            <Text className="text-[12px] text-muted-foreground mt-0.5">{originalDebtorName}</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} className="bg-input w-8 h-8 rounded-full items-center justify-center">
                            <Ionicons name="close" size={20} color="#a1b0a3" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                        <View className="bg-primary/10 border-[0.5px] border-primary/20 p-4 rounded-[16px] mb-5">
                            <Text className="text-[11px] font-bold text-primary uppercase tracking-[0.5px] mb-2">Liability Status</Text>
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-[13px] text-muted-foreground">Original Debt:</Text>
                                <Text className="text-[13px] font-bold text-foreground">KES {originalAmount.toLocaleString()}</Text>
                            </View>
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-[13px] text-muted-foreground">Total Reassigned:</Text>
                                <Text className="text-[13px] font-bold text-primary">KES {totalReassigned.toLocaleString()}</Text>
                            </View>
                            <View className="flex-row justify-between mt-2 pt-2 border-t border-primary/20">
                                <Text className="text-[14px] font-bold text-foreground">Remaining Balance:</Text>
                                <Text className={`text-[15px] font-black ${remainingBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    KES {remainingBalance.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        <InfoAlert message="Use unique names for all debtors to prevent false allocation." />

                        <View className="mt-4 mb-2 flex-row justify-between items-center">
                            <Text className="text-[12px] font-bold text-foreground uppercase tracking-[0.5px]">Reassign To</Text>
                            <TouchableOpacity onPress={addAssignment} className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                                <Text className="text-[11px] font-bold text-primary">+ Add Person</Text>
                            </TouchableOpacity>
                        </View>

                        {assignments.map((assignment, idx) => (
                            <View key={idx} className="flex-row gap-2 mb-3 items-center">
                                <TextInput
                                    className="flex-[2] bg-card border border-border rounded-[10px] h-12 px-4 text-[14px] text-foreground"
                                    placeholder="Debtor Name"
                                    placeholderTextColor="#a1b0a3"
                                    value={assignment.name}
                                    onChangeText={(val) => updateAssignment(idx, "name", val)}
                                />
                                <TextInput
                                    className="flex-1 bg-card border border-border rounded-[10px] h-12 text-center text-[14px] font-bold text-foreground"
                                    placeholder="Amount"
                                    placeholderTextColor="#a1b0a3"
                                    keyboardType="numeric"
                                    value={assignment.amount ? assignment.amount.toString() : ""}
                                    onChangeText={(val) => updateAssignment(idx, "amount", val)}
                                />
                                <TouchableOpacity onPress={() => removeAssignment(idx)} className="w-12 h-12 bg-destructive/10 border border-destructive/20 rounded-[10px] items-center justify-center">
                                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {assignments.length === 0 && (
                            <Text className="text-[12px] text-muted-foreground italic text-center py-6">
                                Tap + Add Person to split this debt into known accounts.
                            </Text>
                        )}
                    </ScrollView>

                    <View className="p-5 border-t border-border bg-background mb-4">
                        <TouchableOpacity
                            className={`w-full rounded-[16px] py-4 items-center justify-center shadow-sm ${remainingBalance < 0 || assignments.length === 0 ? 'bg-muted opacity-50' : 'bg-primary'}`}
                            onPress={handleSave}
                            disabled={remainingBalance < 0 || assignments.length === 0}
                        >
                            <Text className={`text-[15px] font-bold ${remainingBalance < 0 || assignments.length === 0 ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
                                {remainingBalance < 0 ? 'Exceeded Original Debt' : 'Save Reassignments'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}
