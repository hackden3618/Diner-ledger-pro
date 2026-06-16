import { useApp } from "@/database/AppContext";
import { useCalculations } from "@/database/CalculationsContext";
import { getSetting, updateSetting, getMeals, closeDay } from "@/database/db";
import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ScrollView, KeyboardAvoidingView } from "react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import ActionDropdown from "@/components/ui/ActionDropdown";
import InfoAlert from "@/components/ui/InfoAlert";
import { useCustomAlert } from "@/context/AlertContext";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

function SectionHeader({ label }: { label: string }) {
    return (
        <Text className="text-[10px] font-bold text-foreground tracking-[1.2px] uppercase mt-5 mb-2">
            {label}
        </Text>
    );
}

function FieldLabel({ label }: { label: string }) {
    return (
        <Text className="text-[10px] font-bold text-foreground tracking-[0.8px] uppercase mb-1.5">
            {label}
        </Text>
    );
}

export default function SettingsScreen() {
    const { showAlert } = useCustomAlert();
    const {
        businessName,
        saveBusinessName,
        resetDatabase,
        refreshAll,
        injectSeedMoney,
        recordCollection,
        closeBusinessDay,
        activeBusinessDay,
    } = useApp();

    const {
        paidSalesToday,
        totalSalesToday,
        expensesToday,
        openingBalanceToday,
        cashAvailableToday,
        mpesaAvailableToday,
        moneyOutToday,
        moneyInHouse,
    } = useCalculations();

    const [tempBusinessName, setTempBusinessName] = useState(businessName);
    const [closeDayOperant, setCloseDayOperant] = useState("");
    const [openingCash, setOpeningCash] = useState("");
    const [openingMpesa, setOpeningMpesa] = useState("");
    const [collectionCash, setCollectionCash] = useState("");
    const [collectionMpesa, setCollectionMpesa] = useState("");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetPassword, setResetPassword] = useState("");
    const [staffOperants, setStaffOperants] = useState("");
    const [suppliers, setSuppliers] = useState("");
    const [seeder, setSeeder] = useState("Management");

    useEffect(() => {
        setTempBusinessName(businessName);
        const savedStaff = getSetting("staff_operants");
        setStaffOperants(savedStaff || "John, Jane");
        const savedSuppliers = getSetting("suppliers");
        setSuppliers(savedSuppliers || "General");
         
    }, [businessName]);

    // ─── Handlers ─────────────────────────────────────────────────────────────────
    const handleSaveBusinessName = () => {
        if (!tempBusinessName.trim()) {
            showAlert("Validation", "Business name cannot be empty.");
            return;
        }
        saveBusinessName(tempBusinessName.trim());
        showAlert("✅ Saved", "Business name updated successfully.");
    };

    const handleInjectSeedMoney = () => {
        const cashVal = parseFloat(openingCash) || 0;
        const mpesaVal = parseFloat(openingMpesa) || 0;
        if (cashVal < 0 || mpesaVal < 0) {
            showAlert("Invalid", "Injected money must be non-negative.");
            return;
        }
        if (cashVal + mpesaVal <= 0) {
            showAlert("Invalid", "Enter a cash or M-Pesa amount to inject.");
            return;
        }

        showAlert("Inject Seed Money", `Inject ${fmt(cashVal + mpesaVal)} into the business?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Proceed",
                style: "default",
                onPress: () => {
                    try {
                        injectSeedMoney(cashVal, mpesaVal, seeder);
                        setOpeningCash("");
                        setOpeningMpesa("");
                        showAlert("✅ Saved", "Seed money successfully injected.");
                    } catch (error) {
                        showAlert(
                            "Injection Failed",
                            error instanceof Error ? error.message : "Seed money could not be injected.",
                        );
                    }
                }
            },
        ]);
    };

    const handleSaveStaff = () => {
        if (!staffOperants.trim()) {
            showAlert("Validation", "Please enter at least one operant.");
            return;
        }
        updateSetting("staff_operants", staffOperants.trim());
        refreshAll();
        showAlert("✅ Saved", "Staff operants updated.");
    };

    const handleSaveSuppliers = () => {
        if (!suppliers.trim()) {
            showAlert("Validation", "Please enter at least one supplier.");
            return;
        }
        updateSetting("suppliers", suppliers.trim());
        refreshAll();
        showAlert("✅ Saved", "Suppliers list updated.");
    };

    const [collectorName, setCollectorName] = useState("");

    const handleRecordCollection = (confirmedVariance = false) => {
        if (!closeDayOperant.trim()) {
            showAlert(
                "Staff Name Required",
                "Please enter the staff member handing over the collection.",
            );
            return;
        }
        if (!collectorName.trim()) {
            showAlert("Collector Required", "Please select who collected the money.");
            return;
        }

        const actualCash = parseFloat(collectionCash) || 0;
        const actualMpesa = parseFloat(collectionMpesa) || 0;
        if (actualCash < 0 || actualMpesa < 0) {
            showAlert("Invalid Collection", "Collected amounts must be non-negative numbers.");
            return;
        }
        if (actualCash + actualMpesa <= 0 && moneyInHouse > 0) {
            showAlert("Collection Required", "Enter the actual cash or M-Pesa collected.");
            return;
        }
        if (actualCash > cashAvailableToday || actualMpesa > mpesaAvailableToday) {
            showAlert("Invalid Collection", "The collected amount is greater than what the system registered.\n\nThis action is rejected for proper book-keeping");
            return;
        }

        const cashVariance = actualCash - cashAvailableToday;
        const mpesaVariance = actualMpesa - mpesaAvailableToday;
        
        if (!confirmedVariance && (Math.abs(cashVariance) > 0.01 || Math.abs(mpesaVariance) > 0.01)) {
            showAlert(
                "Collection Variance",
                `Expected Cash: ${fmt(cashAvailableToday)}\nActual Cash: ${fmt(actualCash)}\nVariance: ${fmt(cashVariance)}\n\nExpected M-Pesa: ${fmt(mpesaAvailableToday)}\nActual M-Pesa: ${fmt(actualMpesa)}\nVariance: ${fmt(mpesaVariance)}\n\nConfirm these are the amounts actually collected?`,
                [
                    { text: "Review", style: "cancel" },
                    {
                        text: "Confirm Collection",
                        style: "destructive",
                        onPress: () => handleRecordCollection(true),
                    },
                ],
            );
            return;
        }

        showAlert(
            "Record Collection?",
            `Cash expected: ${fmt(cashAvailableToday)}\nCash collected: ${fmt(actualCash)}\n\nM-Pesa expected: ${fmt(mpesaAvailableToday)}\nM-Pesa collected: ${fmt(actualMpesa)}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Record Collection",
                    style: "default",
                    onPress: () => {
                        try {
                            if (actualCash + actualMpesa > 0) {
                                recordCollection(
                                    actualCash,
                                    actualMpesa,
                                    collectorName.trim(),
                                    closeDayOperant.trim(),
                                );
                            }
                            setCollectionCash("");
                            setCollectionMpesa("");
                            showAlert(
                                "Collection Recorded",
                                `Collected by ${collectorName.trim()}.\nCash variance: ${fmt(cashVariance)}\nM-Pesa variance: ${fmt(mpesaVariance)}`,
                            );
                        } catch (error) {
                            showAlert(
                                "Collection Failed",
                                error instanceof Error ? error.message : "The collection could not be recorded.",
                            );
                        }
                    },
                },
            ],
        );
    };

    const handleCloseBusinessDay = () => {
        showAlert(
            "Close Business Day",
            "Are you sure you want to officially end this business day?\n\nThis will shift all new transactions to the next day. Unsold meal stocks will be automatically reset to 0.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Day",
                    style: "destructive",
                    onPress: () => {
                        try {
                            const carriedCash = cashAvailableToday;
                            const carriedMpesa = mpesaAvailableToday;

                            closeDay(
                                openingBalanceToday,
                                totalSalesToday,
                                expensesToday,
                                moneyInHouse,
                                "System (Manual)",
                                undefined
                            );
                            closeBusinessDay();
                            
                            if (carriedCash > 0 || carriedMpesa > 0) {
                                injectSeedMoney(carriedCash, carriedMpesa, "Carried Over");
                            }
                            
                            showAlert("Business Day Closed", "A new business day has officially started. Meal stocks have been reset to 0. Uncollected balances have been carried over to the new day.");
                        } catch (error) {
                            showAlert("Close Failed", error instanceof Error ? error.message : "Could not close business day.");
                        }
                    }
                }
            ]
        );
    }

    return (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
            <View style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
                <ScreenHeader title="Settings" subtitle="Manage your app preferences" showBackButton={false} />
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="px-5 flex-1">

                        {/* ── Business Profile ─────────────────────────────────────────── */}
                        <SectionHeader label="Business Profile" />

                        <FieldLabel label="Business / Hotel Name" />
                        <TextInput
                            className="bg-input border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5 mb-2.5"
                            placeholder="Enter business name..."
                            placeholderTextColor="#4a5e4c"
                            value={tempBusinessName}
                            onChangeText={setTempBusinessName}
                        />
                        <TouchableOpacity
                            className="bg-input border-[0.5px] border-primary/30 rounded-[10px] py-3 items-center justify-center"
                            onPress={handleSaveBusinessName}
                        >
                            <Text className="text-[12px] font-bold text-primary">
                                Save Business Name
                            </Text>
                        </TouchableOpacity>

                        {/* ── Financial Settings ────────────────────────────────────────── */}
                        <SectionHeader label="Inject Seed Money" />

                        <InfoAlert message="Seed money creates an 'opening balance' transaction. You can inject money multiple times a day as needed." />

                        <View className="flex-row gap-3 mb-2.5 mt-2">
                            <View className="flex-1">
                                <FieldLabel label="Cash to Inject (KES)" />
                                <TextInput
                                    className="bg-input border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5"
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#4a5e4c"
                                    value={openingCash}
                                    onChangeText={setOpeningCash}
                                />
                            </View>
                            <View className="flex-1">
                                <FieldLabel label="M-Pesa to Inject (KES)" />
                                <TextInput
                                    className="bg-input border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5"
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#4a5e4c"
                                    value={openingMpesa}
                                    onChangeText={setOpeningMpesa}
                                />
                            </View>
                        </View>

                        <View className="mb-4">
                            <ActionDropdown
                                label="CAPITAL PROVIDED BY — STAFF NAME"
                                value={seeder}
                                onChange={setSeeder}
                                options={staffOperants.split(',').map(s => s.trim()).filter(Boolean)}
                                modalTitle="Select Capital Seeder"
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-input border-[0.5px] border-primary/30 rounded-[10px] py-3 items-center justify-center"
                            onPress={handleInjectSeedMoney}
                        >
                            <Text className="text-[12px] font-bold text-primary">
                                Inject Seed Money
                            </Text>
                        </TouchableOpacity>

                        {/* ── Staff / Operants ────────────────────────────────────────── */}
                        <SectionHeader label="Staff / Operants" />

                        <FieldLabel label="Staff Names (Comma Separated)" />
                        <TextInput
                            className="bg-input border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5 mb-2.5"
                            placeholder="e.g. John, Jane"
                            placeholderTextColor="#4a5e4c"
                            value={staffOperants}
                            onChangeText={setStaffOperants}
                        />
                        <TouchableOpacity
                            className="bg-input border-[0.5px] border-primary/30 rounded-[10px] py-3 items-center justify-center"
                            onPress={handleSaveStaff}
                        >
                            <Text className="text-[12px] font-bold text-primary">
                                Save Staff Names
                            </Text>
                        </TouchableOpacity>

                        {/* ── Suppliers ─────────────────────────────────────────────── */}
                        <SectionHeader label="Suppliers" />

                        <FieldLabel label="Known Suppliers (Comma Separated)" />
                        <TextInput
                            className="bg-input border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5 mb-2.5"
                            placeholder="e.g. General, Milkman, Groceries"
                            placeholderTextColor="#4a5e4c"
                            value={suppliers}
                            onChangeText={setSuppliers}
                        />
                        <TouchableOpacity
                            className="bg-input border-[0.5px] border-primary/30 rounded-[10px] py-3 items-center justify-center"
                            onPress={handleSaveSuppliers}
                        >
                            <Text className="text-[12px] font-bold text-primary">
                                Save Suppliers
                            </Text>
                        </TouchableOpacity>

                        {/* ── Menu Items Management ────────────────────────────────────── */}
                        <SectionHeader label="Menu Items" />

                        <View className="bg-input border-[0.5px] border-border-light rounded-[12px] p-3 mb-3">
                            <Text className="text-[10px] text-primary mb-2">
                                Active Menu Items
                            </Text>
                            {getMeals().length > 0 ? (
                                getMeals().slice(0, 5).map((meal, idx) => (
                                    <View key={meal.id} className="flex-row justify-between items-center py-2 border-b border-border-light">
                                        <View>
                                            <Text className="text-[12px] text-foreground">{meal.name}</Text>
                                            <Text className="text-[10px] text-info">KES {meal.price} • Stock: {meal.stock}</Text>
                                        </View>
                                        <View className={`w-2 h-2 rounded-full ${meal.isAvailable ? 'bg-primary' : 'bg-danger'}`} />
                                    </View>
                                ))
                            ) : (
                                <Text className="text-[11px] italic">No menu items yet.</Text>
                            )}
                            {getMeals().length > 5 && (
                                <Text className="text-[10px] text-primary mt-2">+ {getMeals().length - 5} more items...</Text>
                            )}
                        </View>

                        <Text className="text-[10px] mb-2">
                            Add new meals from the Inventory tab. Set items as available when prepared.
                        </Text>

                        {/* ── Collection / Day Management ───────────────────────────────────── */}
                        <SectionHeader label={`Collection & Day Close (Day ${activeBusinessDay?.id || '?'})`} />

                        <View className="bg-input border-[0.5px] border-border-light rounded-[14px] p-4 mb-4 gap-2">
                            <Text className="text-[10px] font-bold text-foreground tracking-[0.8px] uppercase mb-1">
                                {"Active Day's Summary"}
                            </Text>
                            <View className="flex-row justify-between pb-3">
                                <Text className="text-[12px] text-foreground">
                                    {"Total Seed Money / OB"}
                                </Text>
                                <Text className="text-[12px] font-bold text-primary">
                                    {fmt(openingBalanceToday)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">Cash Expected In-House</Text>
                                <Text className="text-[12px] font-bold text-primary">{fmt(cashAvailableToday)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">M-Pesa Expected In-House</Text>
                                <Text className="text-[12px] font-bold text-info">{fmt(mpesaAvailableToday)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">
                                    {"Total Paid Sales"}
                                </Text>
                                <Text className="text-[12px] font-bold text-primary">
                                    {fmt(paidSalesToday)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">
                                    {"Total Expenses"}
                                </Text>
                                <Text className="text-[12px] font-bold text-destructive">
                                    {fmt(moneyOutToday)}
                                </Text>
                            </View>
                            <View className="h-[0.5px] bg-white/10 dark:bg-white/5 my-1" />
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">
                                    Net Balance
                                </Text>
                                <Text
                                    className={`text-[13px] font-bold ${moneyInHouse >= 0 ? "text-primary" : "text-destructive"
                                        }`}
                                >
                                    {fmt(moneyInHouse)}
                                </Text>
                            </View>
                        </View>

                        {/* Operant field — REQUIRED */}
                        <View className="mb-2">
                            <ActionDropdown
                                label="HANDED OVER BY — STAFF NAME"
                                value={closeDayOperant}
                                onChange={setCloseDayOperant}
                                options={staffOperants.split(',').map(s => s.trim()).filter(Boolean)}
                                modalTitle="Select Staff"
                                isRequired
                            />
                        </View>

                        {/* Collector field — REQUIRED */}
                        <View className="mb-4">
                            <ActionDropdown
                                label="COLLECTED BY — STAFF NAME"
                                value={collectorName}
                                onChange={setCollectorName}
                                options={staffOperants.split(',').map(s => s.trim()).filter(Boolean)}
                                modalTitle="Select Collector"
                                isRequired
                            />
                        </View>

                        <View className="bg-input border-[0.5px] border-border-light rounded-[14px] p-4 mb-4 gap-3">
                            <Text className="text-[10px] font-bold text-foreground tracking-[0.8px] uppercase">
                                Actual Collection
                            </Text>
                            <View>
                                <View className="flex-row justify-between mb-1.5">
                                    <Text className="text-[10px] font-bold text-foreground uppercase">Cash Collected</Text>
                                    <Text className="text-[10px] font-bold text-primary">Expected: {fmt(cashAvailableToday)}</Text>
                                </View>
                                <TextInput
                                    className="bg-background border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5"
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#4a5e4c"
                                    value={collectionCash}
                                    onChangeText={setCollectionCash}
                                />
                            </View>
                            <View>
                                <View className="flex-row justify-between mb-1.5">
                                    <Text className="text-[10px] font-bold text-foreground uppercase">M-Pesa Collected</Text>
                                    <Text className="text-[10px] font-bold text-info">Expected: {fmt(mpesaAvailableToday)}</Text>
                                </View>
                                <TextInput
                                    className="bg-background border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5"
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#4a5e4c"
                                    value={collectionMpesa}
                                    onChangeText={setCollectionMpesa}
                                />
                            </View>
                        </View>

                        <View className="flex-row gap-3 mb-6">
                            <TouchableOpacity
                                className="flex-1 bg-primary/10 border-[0.5px] border-primary/30 rounded-[12px] py-4 items-center justify-center"
                                onPress={() => handleRecordCollection()}
                            >
                                <Text className="text-[13px] font-bold text-primary">
                                    Record Collection
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 bg-destructive rounded-[12px] py-4 items-center justify-center"
                                onPress={handleCloseBusinessDay}
                            >
                                <Text className="text-[13px] font-bold text-destructive-foreground">
                                    End Business Day
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Danger Zone ───────────────────────────────────────── */}
                        <SectionHeader label="Danger Zone" />

                        {!showResetConfirm ? (
                            <TouchableOpacity
                                className="bg-danger/10 border-[0.5px] border-danger/30 rounded-[12px] py-4 items-center justify-center mt-2"
                                onPress={() => setShowResetConfirm(true)}
                            >
                                <Text className="text-[13px] font-bold text-danger">
                                    ⚠ Reset Database
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View className="bg-danger/5 border-[0.5px] border-danger/30 rounded-[14px] p-4 mt-2">
                                <Text className="text-[11px] font-bold text-danger mb-2">
                                    Type the security password to confirm deletion of ALL data:
                                </Text>
                                <TextInput
                                    className="bg-input border-[0.5px] border-danger/40 rounded-[10px] text-foreground text-[13px] px-3 py-2.5 mb-3"
                                    placeholder="Enter password..."
                                    placeholderTextColor="#4a5e4c"
                                    secureTextEntry
                                    value={resetPassword}
                                    onChangeText={setResetPassword}
                                    autoCorrect={false}
                                />
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        className="flex-1 bg-input border-[0.5px] border-border rounded-[10px] py-3 items-center"
                                        onPress={() => {
                                            setShowResetConfirm(false);
                                            setResetPassword("");
                                        }}
                                    >
                                        <Text className="text-[12px] font-bold text-foreground">
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-1 bg-danger rounded-[10px] py-3 items-center"
                                        onPress={() => {
                                            if (resetPassword === "killalldata!") {
                                                resetDatabase();
                                                setShowResetConfirm(false);
                                                setResetPassword("");
                                                showAlert(
                                                    "Database Reset",
                                                    "All data has been wiped. Starting fresh.",
                                                );
                                            } else {
                                                showAlert(
                                                    "Incorrect Password",
                                                    "The password you entered is wrong. Reset aborted.",
                                                );
                                                setResetPassword("");
                                            }
                                        }}
                                    >
                                        <Text className="text-[12px] font-bold text-white">
                                            Confirm Delete
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}
