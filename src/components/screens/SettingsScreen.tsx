import { useApp } from "@/database/AppContext";
import { getSetting, updateSetting, getMeals } from "@/database/db";
import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View, ScrollView, KeyboardAvoidingView } from "react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import ActionDropdown from "@/components/ui/ActionDropdown";
import InfoAlert from "@/components/ui/InfoAlert";

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
    const {
        businessName,
        openingBalance,
        setOpenBalance,
        saveBusinessName,
        transactions,
        closeDay,
        resetDatabase,
        refreshAll,
        setOpeningBalanceWithLock,
        hasOpeningBalanceToday,
        recordCollection,
    } = useApp();

    const [tempBusinessName, setTempBusinessName] = useState(businessName);
    const [closeDayOperant, setCloseDayOperant] = useState("");
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
            setOpenBalance("0");
            updateSetting("opening_balance", "0");
            refreshAll();
        }
        // This mount-time settings sync intentionally avoids refreshAll as a dependency;
        // refreshAll writes state and would turn this initialization into a loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessName]);

    // ─── Today's summary ─────────────────────────────────────────────────────────
    const today = new Date().toDateString();
    const todayTx = transactions.filter(
        (t) => new Date(t.date).toDateString() === today,
    );
    // Opening balance should come from today's opening_balance transaction, not global setting
    const openingBalanceToday = todayTx
        .filter((t) => t.type === "opening_balance")
        .reduce((sum, t) => sum + t.amount, 0);

    const debtorPaymentsToday = todayTx
        .filter((t) => t.type === "debtor_payment" && t.paymentMethod === "cash")
        .reduce((sum, t) => sum + t.amount, 0);

    const purchasePaymentsToday = todayTx
        .filter((t) => t.type === "purchase" && t.paymentMethod === "cash")
        .reduce((sum, t) => sum + t.amount, 0);

    const expensesToday = todayTx
        .filter((t) => t.type === "expense" && t.paymentMethod === "cash")
        .reduce((sum, t) => sum + t.amount, 0);

    const paidSalesToday = todayTx
        .filter((t) => t.type === "sale" && t.paymentMethod === "cash")
        .reduce((sum, t) => sum + t.amount, 0);

    const creditorPaymentsToday = todayTx
        .filter((t) => t.type === "creditor_payment" && t.paymentMethod === "cash")
        .reduce((sum, t) => sum + t.amount, 0);

    const collectionsToday = todayTx
        .filter((t) => t.type === "collection")
        .reduce((sum, t) => sum + t.amount, 0);

    const moneyInToday = openingBalanceToday + paidSalesToday + debtorPaymentsToday;
    const moneyOutToday = purchasePaymentsToday + expensesToday + creditorPaymentsToday + collectionsToday;

    const moneyInHouse = moneyInToday - moneyOutToday;

    // Global Debtors / Creditors
    // ─── Handlers ─────────────────────────────────────────────────────────────────
    const handleSaveBusinessName = () => {
        if (!tempBusinessName.trim()) {
            Alert.alert("Validation", "Business name cannot be empty.");
            return;
        }
        saveBusinessName(tempBusinessName.trim());
        Alert.alert("✅ Saved", "Business name updated successfully.");
    };

    const now = new Date().toDateString();

    const handleSaveOpeningBalance = () => {
        const obSeededDate = getSetting("ob_seeded_date");
        if (obSeededDate === now || hasOpeningBalanceToday()) {
            Alert.alert("Restricted", "You already set the opening balance for the day \nRecord extra money as sales");
            return;
        }
        const val = (openingBalance);
        if (isNaN(val) || val < 0) {
            Alert.alert("Invalid", "Opening balance must be a non-negative number.");
            return;
        }

        // Get the current operant (who is seeding)

        Alert.alert("Confirm Input Locking", "This will lock the input for the day! \nContinue?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Proceed",
                style: "destructive",
                onPress: () => {
                    try {
                        // Opening balance must be created through the locked accounting path
                        // so the transaction table remains the source of truth.
                        setOpeningBalanceWithLock(val, seeder);
                        updateSetting("ob_seeded_date", now);
                        updateSetting("ob_seeder", seeder);
                        setLockOBInput(true);
                        setObSeeder(seeder);
                        refreshAll();
                        Alert.alert("✅ Saved", "Opening balance updated.");
                    } catch (error) {
                        Alert.alert(
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
            Alert.alert("Validation", "Please enter at least one operant.");
            return;
        }
        updateSetting("staff_operants", staffOperants.trim());
        refreshAll();
        Alert.alert("✅ Saved", "Staff operants updated.");
    };

    const handleSaveSuppliers = () => {
        if (!suppliers.trim()) {
            Alert.alert("Validation", "Please enter at least one supplier.");
            return;
        }
        updateSetting("suppliers", suppliers.trim());
        refreshAll();
        Alert.alert("✅ Saved", "Suppliers list updated.");
    };

    const [collectorName, setCollectorName] = useState("");

    const handleCloseDay = () => {
        if (!closeDayOperant.trim()) {
            Alert.alert(
                "Staff Name Required",
                "Please enter the operant (staff) name to close the day.",
            );
            return;
        }

        Alert.alert(
            "Close Day?",
            `This will archive today's activity.\n\nPaid Sales: ${fmt(
                paidSalesToday,
            )}\nExpenses: ${fmt(moneyOutToday)}\nNet B/F: ${fmt(
                moneyInHouse,
            )}\n\nContinue?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Close Day",
                    style: "destructive",
                    onPress: () => {
                        try {
                            const isCollectingCash = Boolean(collectorName.trim()) && moneyInHouse > 0;
                            const closingBalanceAfterCollection = isCollectingCash ? 0 : moneyInHouse;

                            if (isCollectingCash) {
                                recordCollection(
                                    moneyInHouse,
                                    collectorName.trim(),
                                    closeDayOperant.trim(),
                                );
                            }
                            closeDay(closeDayOperant.trim(), collectorName.trim() || undefined);
                            setCloseDayOperant("");
                            setCollectorName("");
                            setLockOBInput(false);
                            Alert.alert(
                                "✅ Day Closed",
                                `Closed by ${closeDayOperant.trim()}.\nNet Balance B/F: ${fmt(
                                    closingBalanceAfterCollection,
                                )} \n\nThe amounts will be reset at midnight!`,
                            );
                        } catch (error) {
                            Alert.alert(
                                "Close Day Failed",
                                error instanceof Error ? error.message : "The day could not be closed.",
                            );
                        }
                    },
                },
            ],
        );
    };

    return (
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

                    <FieldLabel label="Opening Balance (KES)" />
                    <TextInput
                        className={`${lockOBInput ? 'bg-muted' : 'bg-input'} border-[0.5px] border-border rounded-[10px] text-foreground text-[13px] px-3 py-2.5 mb-2.5`}
                        placeholder="0.00"
                        keyboardType="numeric"
                        placeholderTextColor="#4a5e4c"
                        onChangeText={setOpenBalance}
                        editable={!lockOBInput}
                    />

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
                                        <Text className="text-[10px] text-muted">KES {meal.price} • Stock: {meal.stock}</Text>
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

                    {/* ── Close Day / New Day ───────────────────────────────────────── */}
                    <SectionHeader label="Close Day / New Day" />

                    <InfoAlert message={
                        <Text>
                            Closing the day calculates your net balance, archives {"today's"} transactions into the <Text className="font-bold text-primary">Ledger</Text>, and prepares a clean slate for the next day. This happens <Text className="font-bold text-primary">automatically at midnight</Text>, but you can do it manually here, where transactions will be <Text className=" font-bold text-warning">reset at midnight </Text>
                        </Text>
                    } />

                    {/* Today's summary card */}
                    <View className="bg-input border-[0.5px] border-border-light rounded-[14px] p-4 mb-4 gap-2">
                        <Text className="text-[10px] font-bold text-foreground tracking-[0.8px] uppercase mb-1">
                            {"Today's Summary"}
                        </Text>
                        <View className="flex-row justify-between pb-3">
                            <Text className="text-[12px] text-foreground">
                                {"Today's Opening balance"}
                            </Text>
                            <Text className="text-[12px] font-bold text-primary">
                                {fmt(openingBalanceToday)}
                            </Text>
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
                            label="CLOSED BY — STAFF NAME"
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
                            label="CASH COLLECTED BY — STAFF NAME"
                            value={collectorName}
                            onChange={setCollectorName}
                            options={staffOperants.split(',').map(s => s.trim()).filter(Boolean)}
                            modalTitle="Select Collector"
                            isRequired
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-primary rounded-[12px] py-4 items-center justify-center"
                        onPress={handleCloseDay}
                    >
                        <Text className="text-[13px] font-bold text-primary-foreground">
                            🔒 Close Day & Begin New Day
                        </Text>
                    </TouchableOpacity>

                    <Text className="text-[10px] text-warning text-center mt-2 mb-6">
                        {"All today's activity will be archived. This cannot be undone."}
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
                            <KeyboardAvoidingView behavior="padding">
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
                                                Alert.alert(
                                                    "Database Reset",
                                                    "All data has been wiped. Starting fresh.",
                                                );
                                            } else {
                                                Alert.alert(
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
                            </KeyboardAvoidingView>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
