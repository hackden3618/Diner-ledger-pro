import AppBottomSheet from "@/components/ui/AppBottomSheet";
import { useApp } from "@/database/AppContext";
import { useCalculations } from "@/database/CalculationsContext";
import { getSetting } from "@/database/db";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Text, TextInput, TouchableOpacity, View } from "react-native";
import ActionDropdown from "@/components/ui/ActionDropdown";
import { useCustomAlert } from "@/context/AlertContext";

interface PaymentModalProps {
    visible: boolean;
    onClose: () => void;
    type: "debtor" | "creditor";
    personName: string;
}

export default function PaymentModal({
    visible,
    onClose,
    type,
    personName,
}: PaymentModalProps) {
    const { showAlert } = useCustomAlert();
    const { recordDebtorPayment, recordCreditorPayment, transactions } = useApp();
    const { cashAvailableToday, mpesaAvailableToday} = useCalculations();

    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState<"cash" | "mpesa">("cash");
    const [operant, setOperant] = useState("");

    const staffMembers = (getSetting("staff_operants") || "John, Jane").split(",").map(s => s.trim());
    const dismissRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (visible) {
            setPayAmount("");
            setPayMethod("cash");
            setOperant("");
        }
    }, [visible]);

    const handleSave = () => {
        if (!operant.trim()) {
            showAlert(
                "Staff Name Required",
                "Please enter the name of the staff member handling this payment.",
            );
            return;
        }
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) {
            showAlert("Invalid Amount", "Enter a valid positive amount.");
            return;
        }
        if (amount > cashAvailableToday && type === "creditor" && payMethod === "cash"){
            showAlert("Invalid Amount", "Amount entered is more than cash available.");
            return;
        }
        if (amount > mpesaAvailableToday && type === "creditor" && payMethod === "mpesa"){
            showAlert("Invalid Amount", "Amount entered is more than mpesa available.");
            return;
        }

        try {
            if (type === "debtor") {
                recordDebtorPayment(personName, amount, payMethod, operant.trim());
            } else {
                recordCreditorPayment(personName, amount, payMethod, operant.trim());
            }

            dismissRef.current?.();
        } catch (error) {
            showAlert(
                "Payment Failed",
                error instanceof Error ? error.message : "The payment could not be recorded.",
            );
        }
    };

    const isDebtor = type === "debtor";

    return (
        <AppBottomSheet visible={visible} onClose={onClose}>
            {({ dismiss: dismissFn }) => {
                dismissRef.current = dismissFn;
                return (
                    <BottomSheetScrollView
                        contentContainerStyle={{ paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <KeyboardAvoidingView behavior="padding">
                            {/* Header */}
                            <View className="px-5 pt-5 pb-3 border-b-[0.5px] border-border flex-row items-start justify-between">
                                <View>
                                    <Text className="text-[15px] font-bold text-foreground">
                                        {isDebtor
                                            ? "Record Debtor Payment"
                                            : "Remit Creditor Settlement"}
                                    </Text>
                                    <Text className="text-[11px] text-primary mt-0.5">
                                        {personName}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => dismissRef.current?.()}>
                                    <Ionicons name="close" size={24} color="#8a9e8c" />
                                </TouchableOpacity>
                            </View>

                            <View className="px-5 py-4">
                                {/* Operant — REQUIRED */}
                                <View className="mb-4">
                                    <ActionDropdown
                                        label="RECEIVED/PAID BY (STAFF)"
                                        value={operant}
                                        onChange={setOperant}
                                        options={staffMembers}
                                        modalTitle="Select Staff"
                                        isRequired
                                    />
                                </View>

                                {/* Amount */}
                                <View className="mb-4">
                                    <Text className="text-[10px] font-bold text-muted-foreground tracking-[0.8px] mb-1.5 uppercase">
                                        {isDebtor
                                            ? "Amount Remitted (KES)"
                                            : "Remittance Amount (KES)"}
                                    </Text>
                                    <TextInput
                                        className="bg-muted border-[0.5px] border-border-strong rounded-[10px] text-foreground text-[13px] px-3 py-2.5"
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        placeholderTextColor="#8a9e8c"
                                        value={payAmount}
                                        onChangeText={setPayAmount}
                                    />
                                </View>

                                {/* Payment Method — shown for both debtor and creditor */}
                                <View className="mb-5">
                                    <Text className="text-[10px] font-bold text-muted-foreground tracking-[0.8px] mb-1.5 uppercase">
                                        {isDebtor ? "Collection Channel" : "Payment Channel"}
                                    </Text>
                                    <View className="flex-row bg-muted rounded-[10px] p-[3px] gap-1">
                                        {(["cash", "mpesa"] as const).map((method) => (
                                            <TouchableOpacity
                                                key={method}
                                                className={`flex-1 py-2 items-center rounded-lg ${payMethod === method
                                                        ? "bg-card border-[0.5px] border-border"
                                                        : ""
                                                    }`}
                                                onPress={() => setPayMethod(method)}
                                            >
                                                <Text
                                                    className={`text-[11px] font-medium ${payMethod === method
                                                            ? "text-primary font-bold"
                                                            : "text-muted-foreground"
                                                        }`}
                                                >
                                                    {method === "cash" ? "💵  Cash" : "📱  M-Pesa"}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View className="flex-row gap-2 px-5 pb-5 mt-4">
                                <TouchableOpacity
                                    className="flex-1 bg-muted border-[0.5px] border-border rounded-[10px] py-3 items-center justify-center"
                                    onPress={() => dismissRef.current?.()}
                                >
                                    <Text className="text-[13px] font-bold text-foreground">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 bg-primary rounded-[10px] py-3 items-center justify-center"
                                    onPress={handleSave}
                                >
                                    <Text className="text-[13px] font-bold text-background">
                                        {isDebtor ? "Confirm" : "Remit Payment"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </BottomSheetScrollView>
                );
            }}
        </AppBottomSheet>
    );
}
