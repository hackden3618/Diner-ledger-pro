import { useApp } from "@/database/AppContext";
import { useCalculations } from "@/database/CalculationsContext";
import { getSetting, updateSetting, getMeals } from "@/database/db";
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
        setOpeningBalanceWithLock,
        hasOpeningBalanceToday,
        recordCollection,
    } = useApp();

    const {
        paidSalesToday,
        openingBalanceToday,
        cashAvailableToday,
        mpesaAvailableToday,
        moneyOutToday,
        moneyInHouse,
    } = useCalculations();

    const [tempBusinessName, setTempBusinessName] = useState(businessName);
    const [closeDayOperant, setCloseDayOperant] = useState("");
    const [openingCash, setOpeningCash] = useState("0");
    const [openingMpesa, setOpeningMpesa] = useState("0");
    const [collectionCash, setCollectionCash] = useState("0");
    const [collectionMpesa, setCollectionMpesa] = useState("0");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetPassword, setResetPassword] = useState("");
    const [staffOperants, setStaffOperants] = useState("");
    const [suppliers, setSuppliers] = useState("");
    const [lockOBInput, setLockOBInput] = useState(false);
    const [obSeeder, setObSeeder] = useState("");
    const [seeder, setSeeder] = useState("Management");


    useEffect(() => {
        setTempBusinessName(businessName);
        setCloseDayOperant("");
        const savedStaff = getSetting("staff_operants");
        setStaffOperants(savedStaff || "John, Jane");
        const savedSuppliers = getSetting("suppliers");
        setSuppliers(savedSuppliers || "General");

        // Check if OB is locked for today
        const obSeededDate = getSetting("ob_seeded_date");
        const today = new Date().toDateString();
        const savedSeeder = getSetting("ob_seeder");

        if (obSeededDate === today) {
            setLockOBInput(true);
            setObSeeder(savedSeeder || "Management");
        } else {
            setLockOBInput(false);
            setObSeeder("");
            // Auto-reset opening balance display to 0 on new day
            setOpeningCash("0");
            setOpeningMpesa("0");
            updateSetting("opening_balance", "0");
            refreshAll();
        }
        // This mount-time settings sync intentionally avoids refreshAll as a dependency;
        // refreshAll writes state and would turn this initialization into a loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const now = new Date().toDateString();

    const handleSaveOpeningBalance = () => {
        const obSeededDate = getSetting("ob_seeded_date");
        if (obSeededDate === now || hasOpeningBalanceToday()) {
            showAlert("Restricted", "You already set the opening balance for the day \nRecord extra money as sales");
            return;
        }
        const cashVal = parseFloat(openingCash) || 0;
        const mpesaVal = parseFloat(openingMpesa) || 0;
        if (cashVal < 0 || mpesaVal < 0) {
            showAlert("Invalid", "Opening balances must be non-negative numbers.");
            return;
        }
        if (cashVal + mpesaVal <= 0) {
            showAlert("Invalid", "Enter a cash or M-Pesa opening balance.");
            return;
        }

        // Get the current operant (who is seeding)

        showAlert("Confirm Input Locking", "This will lock the input for the day! \nContinue?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Proceed",
                style: "destructive",
                onPress: () => {
                    try {
                        // Opening balance must be created through the locked accounting path
                        // so the transaction table remains the source of truth.
                        setOpeningBalanceWithLock(cashVal, mpesaVal, seeder);
                        updateSetting("ob_seeded_date", now);
                        updateSetting("ob_seeder", seeder);
                        updateSetting("opening_balance_cash", cashVal.toString());
                        updateSetting("opening_balance_mpesa", mpesaVal.toString());
                        setLockOBInput(true);
                        setObSeeder(seeder);
                        refreshAll();
                        showAlert("✅ Saved", "Opening balance updated.");
                    } catch (error) {
                        showAlert(
                            "Opening Balance Locked",
                            error instanceof Error ? error.message : "Opening balance could not be saved.",
                        );
                    }
                }
            },
        ])
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
        if (actualCash > cashAvailableToday) {
            showAlert("Invalid Collection", "The cash amount you entered is greater than what the system registered.\
                        \n\nThis action is rejected for proper book-keeping");
            return;
        }

        if (actualMpesa > mpesaAvailableToday) {
            showAlert("Invalid Collection", "The mpesa amount you entered is greater than what the system registered.\
                        \n\nThis action is rejected for proper book-keeping");
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
            `Cash expected: ${fmt(cashAvailableToday)}\nCash collected: ${fmt(actualCash)}\n\nM-Pesa expected: ${fmt(mpesaAvailableToday)}\nM-Pesa collected: ${fmt(actualMpesa)}\n\nThe day will close automatically at midnight.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Record Collection",
                    style: "destructive",
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
                            setCloseDayOperant("");
                            setCollectorName("");
                            setCollectionCash("0");
                            setCollectionMpesa("0");
                            setLockOBInput(false);
                            showAlert(
                                "Collection Recorded",
                                `Collected by ${collectorName.trim()}.\nCash variance: ${fmt(cashVariance)}\nM-Pesa variance: ${fmt(mpesaVariance)}\n\nRe-Investment is plausible tomorrow when opening balance.`,
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

    return (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: 'var(--background)' }}>
            <View style={{ flex: 1, backgroundColor: 'var(--background)' }}>
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
                        <SectionHeader label="Financial Settings" />

                        <View className="flex-row gap-3 mb-2.5">
                            <View className="flex-1">
                                <FieldLabel label="Cash Seeded (KES)" />
                                <TextInput
                                    className={`${lockOBInput ? 'bg-muted' : 'bg-input'} border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5`}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#4a5e4c"
                                    value={openingCash}
                                    onChangeText={setOpeningCash}
                                    editable={!lockOBInput}
                                />
                            </View>
                            <View className="flex-1">
                                <FieldLabel label="M-Pesa Seeded (KES)" />
                                <TextInput
                                    className={`${lockOBInput ? 'bg-muted' : 'bg-input'} border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5`}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#4a5e4c"
                                    value={openingMpesa}
                                    onChangeText={setOpeningMpesa}
                                    editable={!lockOBInput}
                                />
                            </View>
                        </View>

                        {/* Seeder field — OPTIONAL*/}
                        <View className="mb-4">
                            <ActionDropdown
                                label="CAPITAL PROVIDED BY — STAFF NAME (OPTIONAL)"
                                value={seeder}
                                onChange={setSeeder}
                                options={staffOperants.split(',').map(s => s.trim()).filter(Boolean)}
                                modalTitle="Select Capital Seeder"
                            />
                        </View>

                        <InfoAlert message={
                            <Text>
                                <Text className="text-warning font-bold">Note! </Text>
                                Once the opening balance is saved, there is no more room for saving it for the day
                                {obSeeder && <Text> (Seeded by {obSeeder})</Text>}
                            </Text>}
                        />
                        <TouchableOpacity
                            className="bg-input border-[0.5px] border-primary/30 rounded-[10px] py-3 items-center justify-center"
                            onPress={handleSaveOpeningBalance}
                        >
                            <Text className="text-[12px] font-bold text-primary">
                                {
                                    lockOBInput ?
                                        "Input is currently locked" :
                                        "Save Opening Balance"
                                }
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

                        {/* ── Collection / Auto Close ───────────────────────────────────── */}
                        <SectionHeader label="Collection / Auto Close" />

                        <InfoAlert message={
                            <Text>
                                Record the actual cash and M-Pesa handed over. The system shows expected amounts from {"today's"} transactions, then closes the day automatically after collection is saved.
                            </Text>
                        } />

                        {/* Today's summary card */}
                        <View className="bg-input border-[0.5px] border-border-light rounded-[14px] p-4 mb-4 gap-2">
                            <Text className="text-[10px] font-bold text-foreground tracking-[0.8px] uppercase mb-1">
                                {"Today's Summary"}
                            </Text>
                            <View className="flex-row justify-between pb-3">
                                <Text className="text-[12px] text-foreground">
                                    {"Today's Opening Balance"}
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
                                <Text className="text-[12px] font-bold text-info">{fmt(cashAvailableToday)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">
                                    {"Today's Paid Sales"}
                                </Text>
                                <Text className="text-[12px] font-bold text-primary">
                                    {fmt(paidSalesToday)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[12px] text-foreground">
                                    {"Today's Expenses"}
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

                        <TouchableOpacity
                            className="bg-primary rounded-[12px] py-4 items-center justify-center"
                            onPress={() => handleRecordCollection()}
                        >
                            <Text className="text-[13px] font-bold text-primary-foreground">
                                Record Collection
                            </Text>
                        </TouchableOpacity>

                        <Text className="text-[10px] text-warning text-center mt-2 mb-6">
                            {"Closing is automatic after collection is recorded. This cannot be undone."}
                        </Text>

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
