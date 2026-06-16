import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    addInventoryItem,
    addMeal,
    addNotification,
    addTransaction,
    createTakeoutSession,
    Creditor,
    clearDebtor as dbClearDebtor,
    clearCreditor as dbClearCreditor,
    Debtor,
    getActiveTakeoutSessions,
    getCreditors,
    getDebtors,
    getInventoryItems,
    getMeals,
    getNotifications,
    getSetting,
    getTransactions,
    getUnreadNotificationsCount,
    hasOpeningBalanceToday,
    initDatabase,
    InventoryItem,
    markNotificationsAsRead,
    Meal,
    Notification,
    recordCollection as dbRecordCollection,
    recordOpeningBalance,
    reconcileTakeoutSession,
    resetDatabase,
    getActiveBusinessDay,
    closeActiveBusinessDay,
    setMealAvailability,
    TakeoutSession,
    Transaction,
    updateCreditor,
    updateDebtor,
    updateInventoryItemDetails,
    updateInventoryStock,
    updateMealDetails,
    updateMealStock,
    updateSetting,
    deleteMeal as dbDeleteMeal,
} from "./db";

interface AppContextType {
    businessName: string;
    openingBalance: number,
    injectSeedMoney: (cashAmount: number, mpesaAmount: number, operant: string) => void,
    hasOpeningBalanceToday: () => boolean,
    meals: Meal[];
    transactions: Transaction[];
    debtors: Debtor[];
    creditors: Creditor[];
    notifications: Notification[];
    unreadNotifsCount: number;
    inventoryItems: InventoryItem[];
    takeoutSessions: TakeoutSession[];
    activeBusinessDay: any;
    reportPeriod: "today" | "week" | "month" | "year" | "all";
    setReportPeriod: (
        period: "today" | "week" | "month" | "year" | "all",
    ) => void;
    refreshAll: () => void;
    closeBusinessDay: () => void;
    saveBusinessName: (name: string) => void;
    updateSetting: (key: string, value: string) => void;
    resetDatabase: () => void;

    // Sales
    recordSale: (
        items: { mealId: number; name: string; qty: number; price: number }[],
        saleType: "dinein" | "credit" | "consumed",
        paymentMethod: "cash" | "mpesa" | "credit" | "none",
        operant: string,
        referenceName?: string,
        amountPaid?: number,
        consumedDescription?: string,
    ) => void;

    // Takeout System
    dispatchTakeout: (
        staffName: string,
        items: { mealId: number; name: string; qty: number; price: number }[],
        change: number,
    ) => void;
    reconcileTakeout: (
        sessionId: number,
        staffName: string,
        reconciliationData: {
            items: {
                mealId: number;
                unsold: number;
            }[];
            totalCash: number;
            totalMpesa: number;
            globalDebtors: { name: string; amount: number }[];
        },
    ) => void;

    // Expenses & Purchases
    recordExpense: (
        title: string,
        amount: number,
        paymentMethod: "cash" | "mpesa",
        operant: string,
    ) => void;
    recordPurchase: (
        title: string,
        amount: number,
        paymentMethod: "cash" | "mpesa" | "credit",
        supplierName: string,
        operant: string,
        supplierPhone?: string,
        paymentDifference?: number,
    ) => void;

    // Debtor & Creditor Payments
    recordDebtorPayment: (
        debtorName: string,
        amount: number,
        paymentMethod: "cash" | "mpesa",
        operant: string,
    ) => void;
    recordCreditorPayment: (
        creditorName: string,
        amount: number,
        paymentMethod: "cash" | "mpesa",
        operant: string,
    ) => void;

    // Collections
    recordCollection: (
        cashAmount: number,
        mpesaAmount: number,
        collectorName: string,
        staffHandingOver: string,
    ) => void;

    // Meals & Inventory
    clearDebtorAccount: (debtorId: number) => void;
    clearCreditorAccount: (creditorId: number) => void;
    addNewMeal: (
        name: string,
        price: number,
        stock: number,
        lowAlert: number,
        image: string,
    ) => void;
    updateMeal: (
        id: number,
        name: string,
        price: number,
        stock: number,
        lowAlert: number,
        image: string,
    ) => void;
    deleteMeal: (id: number) => void;
    toggleMealAvailability: (id: number, isAvailable: boolean) => void;
    addRawInventoryItem: (
        name: string,
        stockLevel: number,
        unit: string,
        price: number,
        imageUri?: string,
    ) => void;
    updateRawInventoryItem: (
        id: number,
        name: string,
        stockLevel: number,
        unit: string,
        price: number,
        imageUri?: string,
    ) => void;
    updateRawInventoryStock: (id: number, newStock: number) => void;

    // Notifications
    clearAllNotifs: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [businessName, setBusinessName] = useState<string>("Mega Diner");
    const [meals, setMeals] = useState<Meal[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [takeoutSessions, setTakeoutSessions] = useState<TakeoutSession[]>([]);
    const [activeBusinessDay, setActiveBusinessDay] = useState<any>(null);
    const [reportPeriod, setReportPeriod] = useState<
        "today" | "week" | "month" | "year" | "all"
    >("month");
    const [openBalance, setOpenBalance] = useState("0");

    useEffect(() => {
        try {
            refreshAll();
        } catch (error) {
            console.error("Database initialization failed:", error);
        }
    }, [refreshAll]);

    const refreshAll = useCallback(() => {
        const savedOb = getSetting("opening_balance");
        setOpenBalance(savedOb || "0");
        setMeals(getMeals());
        setTransactions(getTransactions());
        setDebtors(getDebtors());
        setCreditors(getCreditors());
        setNotifications(getNotifications());
        setUnreadNotifsCount(getUnreadNotificationsCount());
        setInventoryItems(getInventoryItems());
        setTakeoutSessions(getActiveTakeoutSessions());
        setActiveBusinessDay(getActiveBusinessDay());
        const savedName = getSetting("business_name");
        if (savedName) setBusinessName(savedName);
    }, []);

    const closeBusinessDay = useCallback(() => {
        closeActiveBusinessDay();
        // Reset all meal stocks to 0
        getMeals().forEach((m) => {
            updateMealStock(m.id, 0);
        });
        refreshAll();
    }, [refreshAll]);

    const openingBalance = parseFloat(openBalance);

    const saveBusinessName = (name: string) => {
        updateSetting("business_name", name);
        setBusinessName(name);
    };

    const injectSeedMoney = (cashAmount: number, mpesaAmount: number, operant: string) => {
        if (cashAmount > 0) {
            recordOpeningBalance(cashAmount, operant, "cash");
            addNotification(
                "Seed Money Injected",
                `KES ${cashAmount} cash seeded into the till by ${operant}`,
                "payment",
            );
        }
        if (mpesaAmount > 0) {
            recordOpeningBalance(mpesaAmount, operant, "mpesa");
            addNotification(
                "Seed Money Injected",
                `KES ${mpesaAmount} M-Pesa seeded by ${operant}`,
                "payment",
            );
        }
        refreshAll();
    };

    const recordCollection = (
        cashAmount: number,
        mpesaAmount: number,
        collectorName: string,
        staffHandingOver: string,
    ) => {
        try {
            if (cashAmount < 0 || mpesaAmount < 0) {
                throw new Error("Collection amounts must be non-negative.");
            }
            if (cashAmount + mpesaAmount <= 0) {
                throw new Error("Enter either cash or M-Pesa collected.");
            }
            dbRecordCollection(cashAmount, collectorName, staffHandingOver, "cash");
            dbRecordCollection(mpesaAmount, collectorName, staffHandingOver, "mpesa");
            refreshAll();
        } catch (error) {
            console.error("Error recording collection:", error);
            throw error;
        }
    };

    const _updateSetting = (key: string, value: string) => {
        updateSetting(key, value);
        refreshAll();
    };

    const _resetDatabase = () => {
        resetDatabase();
        refreshAll();
    };

    const recordSale = (
        items: { mealId: number; name: string; qty: number; price: number }[],
        saleType: "dinein" | "credit" | "consumed",
        paymentMethod: "cash" | "mpesa" | "credit" | "none",
        operant: string,
        referenceName?: string,
        amountPaid?: number,
        consumedDescription?: string,
    ) => {
        try {
            let totalAmt = 0;
            const itemSummaries: string[] = [];
            const latestMeals = getMeals();
            const lineItems: { mealName: string; quantity: number; unitPrice: number; }[] = [];
            
            items.forEach((item) => {
                totalAmt += item.qty * item.price;
                itemSummaries.push(`${item.qty} ${item.name}`);
                lineItems.push({ mealName: item.name, quantity: item.qty, unitPrice: item.price });
            });

            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                if (!currentMeal) throw new Error(`${item.name} no longer exists in inventory.`);
                if (item.qty <= 0 || item.qty > currentMeal.stock) throw new Error(`Cannot record ${item.qty} ${item.name}. Available stock is ${currentMeal.stock}.`);
            });

            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId)!;
                updateMealStock(item.mealId, currentMeal.stock - item.qty);
            });

            const itemsText = itemSummaries.join(" · ");
            const paidAmount = saleType === "dinein" ? amountPaid ?? totalAmt : amountPaid;

            if (saleType === "consumed") {
                addTransaction("consumed", "Meals Consumed (Internal)", consumedDescription || itemsText, totalAmt, "none", referenceName, operant, lineItems);
                addNotification("Internal Consumption", `${itemsText} consumed locally · by ${operant}`, "flow");
            } else if (saleType === "credit") {
                const debtorName = referenceName || "Walk-in Debtor";
                addTransaction("sale", `Credit Sale — ${debtorName}`, itemsText, totalAmt, "credit", debtorName, operant, lineItems);
                updateDebtor(debtorName, totalAmt, 0);
                addNotification("Credit Sale Recorded", `KES ${totalAmt.toLocaleString()} owed by ${debtorName} · by ${operant}`, "payment");
            } else if (saleType === "dinein" && paidAmount === totalAmt) {
                const methodLabel = paymentMethod === "mpesa" ? "M-Pesa" : "Cash";
                addTransaction("sale", `Sale — ${methodLabel}`, itemsText, totalAmt, paymentMethod, referenceName, operant, lineItems);
            }

            if (saleType === "dinein" && paidAmount !== undefined && paidAmount < totalAmt && paidAmount >= 0) {
                if (referenceName && referenceName.trim() !== "") {
                    addTransaction("sale", `Credit Sale — ${referenceName}`, itemsText, totalAmt, "credit", referenceName, operant, lineItems);
                    if (paidAmount > 0) addTransaction("debtor_payment", `Debtor Payment — ${referenceName}`, `Immediate partial payment for ${itemsText}`, paidAmount, paymentMethod, referenceName, operant);
                    updateDebtor(referenceName, totalAmt, paidAmount);
                    addNotification("Partial Payment Recorded", `Customer ${referenceName} paid KES ${paidAmount} of KES ${totalAmt}.`, "payment");
                    refreshAll();
                    return;
                } else throw new Error("Customer name is required for underpayments.");
            }

            if (saleType === "dinein" && paidAmount !== undefined && paidAmount > totalAmt) {
                if (referenceName && referenceName.trim() !== "") {
                    addTransaction("sale", `Overpaid Sale — ${referenceName}`, `Fully paid via ${paymentMethod.toUpperCase()}`, totalAmt, paymentMethod, referenceName, operant, lineItems);
                    addTransaction("debtor_payment", `Customer Overpayment — ${referenceName}`, `Excess credit via ${paymentMethod.toUpperCase()}`, paidAmount - totalAmt, paymentMethod, referenceName, operant);
                    updateDebtor(referenceName, - (paidAmount - totalAmt), 0);
                    refreshAll();
                    return;
                } else throw new Error("Customer name is required for overpayments.");
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording sale:", error);
            throw error;
        }
    };

    const dispatchTakeout = (
        staffName: string,
        items: { mealId: number; name: string; qty: number; price: number }[],
        change: number,
    ) => {
        try {
            const latestMeals = getMeals();
            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                if (!currentMeal) throw new Error(`${item.name} no longer exists in inventory.`);
                if (item.qty <= 0 || item.qty > currentMeal.stock) throw new Error(`Cannot dispatch ${item.qty} ${item.name}.`);
            });

            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId)!;
                updateMealStock(item.mealId, currentMeal.stock - item.qty);
            });

            if (change > 0) {
                addTransaction("adjustment", `Takeout Float Dispatch — ${staffName}`, `Float change given to staff: KES ${change.toLocaleString()}`, -change, "cash", undefined, staffName);
            }

            createTakeoutSession(staffName, items, change);
            addNotification("Takeout Dispatched", `${staffName} took out goods.`, "flow");
            refreshAll();
        } catch (error) {
            console.error("Error dispatching takeout:", error);
            throw error;
        }
    };

    const reconcileTakeout = (
        sessionId: number,
        staffName: string,
        reconciliationData: {
            items: { mealId: number; unsold: number; }[];
            totalCash: number;
            totalMpesa: number;
            globalDebtors: { name: string; amount: number }[];
        },
    ) => {
        try {
            const latestMeals = getMeals();
            reconciliationData.items.forEach((item) => {
                if (item.unsold > 0) {
                    const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                    if (currentMeal) updateMealStock(item.mealId, currentMeal.stock + item.unsold);
                }
            });

            const session = takeoutSessions.find(s => s.id === sessionId);
            const floatGiven = session?.changeProvided || 0;

            let remainingCash = reconciliationData.totalCash;
            let remainingMpesa = reconciliationData.totalMpesa;

            const floatReturnedCash = Math.min(remainingCash, floatGiven);
            remainingCash -= floatReturnedCash;
            const unpaidFloatAfterCash = floatGiven - floatReturnedCash;

            const floatReturnedMpesa = Math.min(remainingMpesa, unpaidFloatAfterCash);
            remainingMpesa -= floatReturnedMpesa;
            const unpaidFloatFinal = unpaidFloatAfterCash - floatReturnedMpesa;

            if (floatReturnedCash > 0) addTransaction("adjustment", `Takeout Float Returned — ${staffName}`, "Float returned in Cash", floatReturnedCash, "cash", undefined, staffName);
            if (floatReturnedMpesa > 0) addTransaction("adjustment", `Takeout Float Returned — ${staffName}`, "Float returned in Mpesa", floatReturnedMpesa, "mpesa", undefined, staffName);
            if (unpaidFloatFinal > 0) updateDebtor(`Shortfall — ${staffName}`, unpaidFloatFinal, 0);

            let totalDeclaredDebt = 0;
            if (reconciliationData.globalDebtors) {
                reconciliationData.globalDebtors.forEach((debtor) => {
                    totalDeclaredDebt += debtor.amount;
                    addTransaction("sale", `Takeout Credit Sales — ${staffName}`, `Credit to ${debtor.name}`, debtor.amount, "credit", debtor.name, staffName);
                    updateDebtor(debtor.name, debtor.amount, 0);
                });
            }

            const dispatchedItems = JSON.parse(session?.dispatchedItems || '[]');
            let expectedSalesRevenue = 0;
            reconciliationData.items.forEach(item => {
                const dispatched = dispatchedItems.find((d: any) => d.mealId === item.mealId);
                const meal = latestMeals.find(m => m.id === item.mealId);
                if (dispatched && meal) {
                    expectedSalesRevenue += (dispatched.qty - item.unsold) * meal.price;
                }
            });

            const collectedSales = remainingCash + remainingMpesa + totalDeclaredDebt;
            const salesShortfall = expectedSalesRevenue - collectedSales;

            if (salesShortfall > 0.01) {
                updateDebtor(`Shortfall — ${staffName}`, salesShortfall, 0);
                addTransaction("sale", `Takeout Sales Shortfall — ${staffName}`, "Missing sales money", salesShortfall, "credit", `Shortfall — ${staffName}`, staffName);
            } else if (salesShortfall < -0.01) {
                addTransaction("adjustment", `Takeout Overage — ${staffName}`, "Extra money returned", Math.abs(salesShortfall), "cash", undefined, staffName);
            }

            const soldItems = reconciliationData.items
                .map((i) => {
                    const dispatched = dispatchedItems.find((d: any) => d.mealId === i.mealId);
                    const qtySold = (dispatched?.qty || 0) - i.unsold;
                    if (qtySold <= 0) return null;
                    const currentMeal = latestMeals.find((m) => m.id === i.mealId);
                    return { mealName: currentMeal?.name || `Meal ${i.mealId}`, quantity: qtySold, unitPrice: currentMeal?.price || 0 };
                }).filter(Boolean) as { mealName: string; quantity: number; unitPrice: number }[];

            if (remainingCash > 0) addTransaction("sale", `Takeout Cash Sales — ${staffName}`, "Consolidated cash sales", remainingCash, "cash", undefined, staffName, soldItems);
            if (remainingMpesa > 0) addTransaction("sale", `Takeout Mpesa Sales — ${staffName}`, "Consolidated M-Pesa sales", remainingMpesa, "mpesa", undefined, staffName, soldItems);

            reconcileTakeoutSession(sessionId, JSON.stringify(reconciliationData));
            refreshAll();
        } catch (error) {
            console.error("Error reconciling takeout:", error);
            throw error;
        }
    };

    const recordExpense = (title: string, amount: number, paymentMethod: "cash" | "mpesa", operant: string) => {
        addTransaction("expense", `Expense — ${title}`, "Non-stock expense", amount, paymentMethod, undefined, operant);
        refreshAll();
    };

    const recordPurchase = (title: string, amount: number, paymentMethod: "cash" | "mpesa" | "credit", supplierName: string, operant: string, supplierPhone?: string) => {
        const isCredited = paymentMethod === "credit";
        if (isCredited) {
            addTransaction("purchase", "Credited Purchase", title, amount, "credit", supplierName, operant);
            updateCreditor(supplierName, amount, 0, supplierPhone);
        } else {
            addTransaction("purchase", "Purchase", title, amount, paymentMethod, supplierName, operant);
        }
        const match = getInventoryItems().find((item) => item.name.toLowerCase() === title.trim().toLowerCase());
        if (match) updateInventoryStock(match.id, match.stockLevel + 1);
        else addInventoryItem(title.trim(), 1, "units", amount);
        refreshAll();
    };

    const recordDebtorPayment = (debtorName: string, amount: number, paymentMethod: "cash" | "mpesa", operant: string) => {
        const existingDebtor = getDebtors().find(d => d.name === debtorName);
        if (!existingDebtor) throw new Error("Debtor not found.");
        const debtorBalance = existingDebtor.totalOwed - existingDebtor.totalPaid;
        addTransaction("debtor_payment", `Debtor Payment — ${debtorName}`, `Balance clearance`, amount, paymentMethod, debtorName, operant);
        updateDebtor(debtorName, 0, Math.min(amount, debtorBalance));
        if (amount > debtorBalance) updateDebtor(debtorName, -(amount - debtorBalance), 0);
        refreshAll();
    };

    const recordCreditorPayment = (creditorName: string, amount: number, paymentMethod: "cash" | "mpesa", operant: string) => {
        updateCreditor(creditorName, 0, amount);
        addTransaction("creditor_payment", `Paid Creditor — ${creditorName}`, `Settlement`, amount, paymentMethod, creditorName, operant);
        refreshAll();
    };

    const clearDebtorAccount = (debtorId: number) => {
        dbClearDebtor(debtorId);
        refreshAll();
    };

    const clearCreditorAccount = (creditorId: number) => {
        dbClearCreditor(creditorId);
        refreshAll();
    };

    const addNewMeal = (name: string, price: number, stock: number, lowAlert: number, image: string) => {
        addMeal(name, price, stock, lowAlert, image);
        refreshAll();
    };

    const updateMeal = (id: number, name: string, price: number, stock: number, lowAlert: number, image: string) => {
        updateMealDetails(id, name, price, stock, lowAlert, image);
        refreshAll();
    };

    const deleteMeal = (id: number) => {
        dbDeleteMeal(id);
        refreshAll();
    };

    const toggleMealAvailability = (id: number, isAvailable: boolean) => {
        setMealAvailability(id, isAvailable);
        refreshAll();
    };

    const addRawInventoryItem = (name: string, stockLevel: number, unit: string, price: number, imageUri?: string) => {
        addInventoryItem(name, stockLevel, unit, price, imageUri);
        refreshAll();
    };

    const updateRawInventoryItem = (id: number, name: string, stockLevel: number, unit: string, price: number, imageUri?: string) => {
        updateInventoryItemDetails(id, name, stockLevel, unit, price, imageUri);
        refreshAll();
    };

    const updateRawInventoryStock = (id: number, newStock: number) => {
        updateInventoryStock(id, newStock);
        refreshAll();
    };

    const clearAllNotifs = () => {
        markNotificationsAsRead();
        refreshAll();
    };

    return (
        <AppContext.Provider
            value={{
                businessName,
                openingBalance,
                injectSeedMoney,
                hasOpeningBalanceToday,
                meals,
                transactions,
                debtors,
                creditors,
                notifications,
                unreadNotifsCount,
                inventoryItems,
                takeoutSessions,
                activeBusinessDay,
                reportPeriod,
                setReportPeriod,
                refreshAll,
                closeBusinessDay,
                saveBusinessName,
                updateSetting: _updateSetting,
                resetDatabase: _resetDatabase,
                recordSale,
                dispatchTakeout,
                reconcileTakeout,
                recordExpense,
                recordPurchase,
                recordDebtorPayment,
                recordCreditorPayment,
                recordCollection,
                clearDebtorAccount,
                clearCreditorAccount,
                addNewMeal,
                updateMeal,
                deleteMeal,
                toggleMealAvailability,
                addRawInventoryItem,
                updateRawInventoryItem,
                updateRawInventoryStock,
                clearAllNotifs,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within an AppProvider");
    return context;
}
