import React, {
    createContext,
    ReactNode,
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
    closeDay as dbCloseDay,
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
    initDatabase,
    InventoryItem,
    markNotificationsAsRead,
    Meal,
    Notification,
    reconcileTakeoutSession,
    resetDatabase,
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
    setOpenBalance: (openBalance: string) => void,
    meals: Meal[];
    transactions: Transaction[];
    debtors: Debtor[];
    creditors: Creditor[];
    notifications: Notification[];
    unreadNotifsCount: number;
    inventoryItems: InventoryItem[];
    takeoutSessions: TakeoutSession[];
    reportPeriod: "today" | "week" | "month" | "year" | "all";
    setReportPeriod: (
        period: "today" | "week" | "month" | "year" | "all",
    ) => void;
    refreshAll: () => void;
    saveBusinessName: (name: string) => void;
    updateSetting: (key: string, value: string) => void;
    resetDatabase: () => void;

    // Sales
    recordSale: (
        items: { mealId: number; name: string; qty: number; price: number }[],
        saleType: "dinein" | "takeaway" | "credit" | "consumed",
        paymentMethod: "cash" | "mpesa" | "credit" | "none",
        operant: string,
        referenceName?: string,
        amountPaid?: number,
    ) => void;

    // Takeout System
    dispatchTakeout: (
        staffName: string,
        items: { mealId: number; name: string; qty: number; price: number }[],
    ) => void;
    reconcileTakeout: (
        sessionId: number,
        staffName: string,
        reconciliationData: {
            items: {
                mealId: number;
                unsold: number;
                cashSold: number;
                creditSold: number;
            }[];
            totalCash: number;
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

    // Meals & Inventory
    clearDebtorAccount: (debtorId: number) => void;
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

    // Day Close
    closeDay: (operant: string) => void;

    // Notifications
    clearAllNotifs: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [businessName, setBusinessName] = useState<string>(
        "Mega Diner",
    );
    const [meals, setMeals] = useState<Meal[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [takeoutSessions, setTakeoutSessions] = useState<TakeoutSession[]>([]);
    const [reportPeriod, setReportPeriod] = useState<
        "today" | "week" | "month" | "year" | "all"
    >("month");
    const [openBalance, setOpenBalance] = useState("0");


    useEffect(() => {
        try {
            initDatabase();
            refreshAll();
        } catch (error) {
            console.error("Database initialization failed:", error);
        }
    }, []);

    const openingBalance = parseFloat(openBalance);
    const refreshAll = () => {
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
        const savedName = getSetting("business_name");
        if (savedName) setBusinessName(savedName);
    };

    // Auto Close Day Logic
    useEffect(() => {
        const checkAutoClose = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Check if past 23:50
            if (hours === 23 && minutes >= 50) {
                const lastCloseSetting = getSetting("last_auto_close_date");
                const todayStr = now.toDateString();

                if (lastCloseSetting !== todayStr) {
                    // Trigger close day
                    try {
                        const todayTx = getTransactions().filter(
                            (t) => new Date(t.date).toDateString() === todayStr,
                        );

                        // Only auto-close if there were actually transactions today, or if we haven't closed yet
                        const hasClosedToday = todayTx.some(t => t.type === 'day_close');

                        if (!hasClosedToday) {
                            const totalSales = todayTx
                                .filter((t) => t.type === "sale")
                                .reduce((s, t) => s + t.amount, 0);
                            const totalExpenses = todayTx
                                .filter((t) => t.type === "expense" || t.type === "purchase")
                                .reduce((s, t) => s + t.amount, 0);
                            const netBalance = openingBalance + totalSales - totalExpenses;

                            dbCloseDay(openingBalance, totalSales, totalExpenses, netBalance, "System (Auto)");
                            updateSetting("last_auto_close_date", todayStr);
                            refreshAll();
                        } else {
                            // Already closed manually, just mark the setting
                            updateSetting("last_auto_close_date", todayStr);
                        }
                    } catch (error) {
                        console.error("Auto close day failed", error);
                    }
                }
            }
        };

        // Check immediately and then every minute
        checkAutoClose();
        const interval = setInterval(checkAutoClose, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const saveBusinessName = (name: string) => {
        updateSetting("business_name", name);
        setBusinessName(name);
    };

    const _updateSetting = (key: string, value: string) => {
        updateSetting(key, value);
        refreshAll();
    };

    const _resetDatabase = () => {
        resetDatabase();
        refreshAll();
    };

    // ─── Record Sale ────────────────────────────────────────────────────────────
    const recordSale = (
        items: { mealId: number; name: string; qty: number; price: number }[],
        saleType: "dinein" | "takeaway" | "credit" | "consumed",
        paymentMethod: "cash" | "mpesa" | "credit" | "none",
        operant: string,
        referenceName?: string,
        amountPaid?: number,
    ) => {
        try {
            let totalAmt = 0;
            const itemSummaries: string[] = [];
            const latestMeals = getMeals(); // avoid stale closure

            // Build line items and deduct stock
            const lineItems: {
                mealName: string;
                quantity: number;
                unitPrice: number;
            }[] = [];
            items.forEach((item) => {
                totalAmt += item.qty * item.price;
                itemSummaries.push(`${item.qty} ${item.name}`);
                lineItems.push({
                    mealName: item.name,
                    quantity: item.qty,
                    unitPrice: item.price,
                });

                const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                if (currentMeal) {
                    updateMealStock(
                        item.mealId,
                        Math.max(0, currentMeal.stock - item.qty),
                    );
                }
            });

            const itemsText = itemSummaries.join(" · ");

            if (saleType === "consumed") {
                addTransaction(
                    "consumed",
                    "Meals Consumed (Internal)",
                    itemsText,
                    totalAmt,
                    "none",
                    referenceName,
                    operant,
                    lineItems,
                );
                addNotification(
                    "Internal Consumption",
                    `${itemsText} consumed locally · by ${operant}`,
                    "flow",
                );
            } else if (saleType === "takeaway") {
                addTransaction(
                    "takeaway",
                    "Meal Taken Out",
                    itemsText,
                    totalAmt,
                    "none",
                    referenceName,
                    operant,
                    lineItems,
                );
                addNotification(
                    "Meal Taken Away",
                    `${itemsText} taken out by ${referenceName || "customer"
                    } · logged by ${operant}`,
                    "flow",
                );
            } else if (saleType === "credit") {
                const debtorName = referenceName || "Walk-in Debtor";
                addTransaction(
                    "sale",
                    `Credit Sale — ${debtorName}`,
                    itemsText,
                    totalAmt,
                    "credit",
                    debtorName,
                    operant,
                    lineItems,
                );
                updateDebtor(debtorName, totalAmt, 0);
                addNotification(
                    "Credit Sale Recorded",
                    `KES ${totalAmt.toLocaleString()} owed by ${debtorName} · by ${operant}`,
                    "payment",
                );
            } else if (saleType === "dinein") {
                // Dine-in
                const methodLabel = paymentMethod === "mpesa" ? "M-Pesa" : "Cash";
                addTransaction(
                    "sale",
                    `Sale — ${methodLabel}`,
                    itemsText,
                    totalAmt,
                    paymentMethod,
                    undefined,
                    operant,
                    lineItems,
                );
            }

            // Check for overpayment
            if ((saleType === "dinein" || saleType === "takeaway") && amountPaid !== undefined && amountPaid > totalAmt) {
                const overpayAmount = amountPaid - totalAmt;
                if (referenceName && referenceName.trim() !== "") {
                    updateCreditor(referenceName, overpayAmount, 0, undefined);
                    addNotification(
                        "Overpayment Recorded",
                        `Customer ${referenceName} overpaid by KES ${overpayAmount}. Added to creditors.`,
                        "payment"
                    );
                }
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording sale:", error);
        }
    };

    // ─── Takeout System ─────────────────────────────────────────────────────────
    const dispatchTakeout = (
        staffName: string,
        items: { mealId: number; name: string; qty: number; price: number }[],
    ) => {
        try {
            const latestMeals = getMeals();
            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                if (currentMeal) {
                    updateMealStock(
                        item.mealId,
                        Math.max(0, currentMeal.stock - item.qty),
                    );
                }
            });
            createTakeoutSession(staffName, items);
            addNotification(
                "Takeout Dispatched",
                `${staffName} took out goods for outside catering.`,
                "flow",
            );
            refreshAll();
        } catch (error) {
            console.error("Error dispatching takeout:", error);
        }
    };

    const reconcileTakeout = (
        sessionId: number,
        staffName: string,
        reconciliationData: {
            items: {
                mealId: number;
                unsold: number;
                cashSold: number;
                creditSold: number;
            }[];
            totalCash: number;
            globalDebtors: { name: string; amount: number }[];
        },
    ) => {
        try {
            const latestMeals = getMeals();

            // Handle Returns (Restock)
            reconciliationData.items.forEach((item) => {
                if (item.unsold > 0) {
                    const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                    if (currentMeal) {
                        updateMealStock(item.mealId, currentMeal.stock + item.unsold);
                    }
                }
            });

            // Handle Debtors created during hawking
            reconciliationData.globalDebtors.forEach((debtor) => {
                if (debtor.amount > 0) {
                    updateDebtor(debtor.name, debtor.amount, 0);
                    addTransaction(
                        "sale",
                        `Credit Sale (Takeout) — ${debtor.name}`,
                        "Takeout Items on Credit",
                        debtor.amount,
                        "credit",
                        debtor.name,
                        staffName,
                    );
                }
            });

            // Handle bulk cash sale
            if (reconciliationData.totalCash > 0) {
                addTransaction(
                    "sale",
                    `Takeout Cash Sales — ${staffName}`,
                    "Consolidated cash from outside catering",
                    reconciliationData.totalCash,
                    "cash",
                    undefined,
                    staffName,
                );
            }

            reconcileTakeoutSession(sessionId, JSON.stringify(reconciliationData));
            addNotification(
                "Takeout Reconciled",
                `Takeout session for ${staffName} has been reconciled.`,
                "flow",
            );
            refreshAll();
        } catch (error) {
            console.error("Error reconciling takeout:", error);
        }
    };

    // ─── Record Expense ─────────────────────────────────────────────────────────
    const recordExpense = (
        title: string,
        amount: number,
        paymentMethod: "cash" | "mpesa",
        operant: string,
    ) => {
        try {
            addTransaction(
                "expense",
                `Expense — ${title}`,
                "Non-stock business expense",
                amount,
                paymentMethod,
                undefined,
                operant,
            );
            refreshAll();
        } catch (error) {
            console.error("Error recording expense:", error);
        }
    };

    // ─── Record Purchase ────────────────────────────────────────────────────────
    const recordPurchase = (
        title: string,
        amount: number,
        paymentMethod: "cash" | "mpesa" | "credit",
        supplierName: string,
        operant: string,
        supplierPhone?: string,
        paymentDifference?: number,
    ) => {
        try {
            const isCredited = paymentMethod === "credit";
            addTransaction(
                "purchase",
                `${isCredited ? "Credited" : "Paid"} Purchase`,
                title,
                amount,
                paymentMethod,
                supplierName,
                operant,
            );
            if (isCredited) {
                updateCreditor(supplierName, amount, 0, supplierPhone);
            }

            // Handle payment difference for creditor account
            if (paymentDifference !== undefined && paymentDifference !== 0) {
                if (paymentDifference < 0) {
                    // Paid less than expected - business owes the difference (supplier becomes/remains creditor)
                    updateCreditor(
                        supplierName,
                        Math.abs(paymentDifference),
                        0,
                        supplierPhone,
                    );
                } else if (paymentDifference > 0) {
                    // Paid more than expected - supplier owes the difference (supplier becomes debtor)
                    updateDebtor(supplierName, paymentDifference, 0, supplierPhone);
                    addNotification(
                        "Overpayment Recorded",
                        `Overpaid supplier ${supplierName} by KES ${paymentDifference}. Added to debtors.`,
                        "payment"
                    );
                }
            }

            // Auto-add to raw inventory
            const existingItems = getInventoryItems();
            const match = existingItems.find(
                (item) => item.name.toLowerCase() === title.trim().toLowerCase(),
            );
            if (match) {
                // Increment existing stock
                updateInventoryStock(match.id, match.stockLevel + 1);
                addNotification(
                    "Stock Updated",
                    `${match.name} stock incremented from purchase`,
                    "stock",
                );
            } else {
                // Add new raw ingredient
                addInventoryItem(title.trim(), 1, "units", amount);
                addNotification(
                    "New Stock Item",
                    `${title.trim()} added to raw inventory from purchase`,
                    "stock",
                );
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording purchase:", error);
        }
    };

    // ─── Record Debtor Payment ──────────────────────────────────────────────────
    const recordDebtorPayment = (
        debtorName: string,
        amount: number,
        paymentMethod: "cash" | "mpesa",
        operant: string,
    ) => {
        try {
            const existingDebtor = getDebtors().find(d => d.name === debtorName);
            let amountToClearDebtor = amount;
            let overpayAmount = 0;

            if (existingDebtor) {
                const balance = existingDebtor.totalOwed - existingDebtor.totalPaid;
                if (amount > balance) {
                    overpayAmount = amount - balance;
                    amountToClearDebtor = balance;
                }
            }

            addTransaction(
                "debtor_payment",
                `Debtor Payment — ${debtorName}`,
                `Balance clearance via ${paymentMethod.toUpperCase()} · by ${operant}`,
                amount,
                paymentMethod,
                debtorName,
                operant,
            );

            if (amountToClearDebtor > 0) {
                updateDebtor(debtorName, 0, amountToClearDebtor);
            }

            if (overpayAmount > 0) {
                updateCreditor(debtorName, overpayAmount, 0, undefined);
                addNotification(
                    "Overpayment Recorded",
                    `${debtorName} overpaid by KES ${overpayAmount}. Added to creditors.`,
                    "payment"
                );
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording debtor payment:", error);
        }
    };

    // ─── Record Creditor Payment ────────────────────────────────────────────────
    const recordCreditorPayment = (
        creditorName: string,
        amount: number,
        paymentMethod: "cash" | "mpesa",
        operant: string,
    ) => {
        try {
            const existingCreditor = getCreditors().find(c => c.name === creditorName);
            let amountToClearCreditor = amount;
            let overpayAmount = 0;

            if (existingCreditor) {
                const balance = existingCreditor.totalOwed - existingCreditor.totalPaid;
                if (amount > balance) {
                    overpayAmount = amount - balance;
                    amountToClearCreditor = balance;
                }
            }

            addTransaction(
                "creditor_payment",
                `Paid Creditor — ${creditorName}`,
                `Creditor settlement via ${paymentMethod.toUpperCase()} · by ${operant}`,
                amount,
                paymentMethod,
                creditorName,
                operant,
            );

            if (amountToClearCreditor > 0) {
                updateCreditor(creditorName, -amountToClearCreditor, 0);
            }

            if (overpayAmount > 0) {
                // Creditor is overpaid, they become a debtor!
                updateDebtor(creditorName, overpayAmount, 0, undefined);
                addNotification(
                    "Overpayment Recorded",
                    `Overpaid supplier ${creditorName} by KES ${overpayAmount}. Added to debtors.`,
                    "payment"
                );
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording creditor payment:", error);
        }
    };

    // ─── Meals ──────────────────────────────────────────────────────────────────

    const clearDebtorAccount = (debtorId: number) => {
        dbClearDebtor(debtorId);
        refreshAll();
    };

    const addNewMeal = (
        name: string,
        price: number,
        stock: number,
        lowAlert: number,
        image: string,
    ) => {
        addMeal(name, price, stock, lowAlert, image);
        addNotification(
            "New Meal Registered",
            `Added ${name} to menu at KES ${price}`,
            "general",
        );
        refreshAll();
    };

    const updateMeal = (
        id: number,
        name: string,
        price: number,
        stock: number,
        lowAlert: number,
        image: string,
    ) => {
        updateMealDetails(id, name, price, stock, lowAlert, image);
        addNotification("Meal Updated", `Updated details for ${name}`, "general");
        refreshAll();
    };

    const deleteMeal = (id: number) => {
        dbDeleteMeal(id);
        addNotification("Meal Deleted", "A menu item was permanently removed from inventory", "general");
        refreshAll();
    };

    const toggleMealAvailability = (id: number, isAvailable: boolean) => {
        setMealAvailability(id, isAvailable);
        refreshAll();
    };

    // ─── Raw Inventory ──────────────────────────────────────────────────────────
    const addRawInventoryItem = (
        name: string,
        stockLevel: number,
        unit: string,
        price: number,
        imageUri?: string,
    ) => {
        addInventoryItem(name, stockLevel, unit, price, imageUri);
        addNotification(
            "Raw Stock Added",
            `${name} (${stockLevel} ${unit}) added to inventory at KES ${price}/unit`,
            "general",
        );
        refreshAll();
    };

    const updateRawInventoryItem = (
        id: number,
        name: string,
        stockLevel: number,
        unit: string,
        price: number,
        imageUri?: string,
    ) => {
        updateInventoryItemDetails(id, name, stockLevel, unit, price, imageUri);
        addNotification(
            "Raw Stock Updated",
            `Updated details for ${name}`,
            "general",
        );
        refreshAll();
    };

    const updateRawInventoryStock = (id: number, newStock: number) => {
        updateInventoryStock(id, newStock);
        refreshAll();
    };


    // ─── Day Close ──────────────────────────────────────────────────────────────
    const closeDay = (operant: string) => {
        try {
            const today = new Date().toDateString();
            const todayTx = transactions.filter(
                (t) => new Date(t.date).toDateString() === today,
            );
            const totalSales = todayTx
                .filter((t) => t.type === "sale")
                .reduce((s, t) => s + t.amount, 0);
            const totalExpenses = todayTx
                .filter((t) => t.type === "expense" || t.type === "purchase")
                .reduce((s, t) => s + t.amount, 0);
            const netBalance = openingBalance + totalSales - totalExpenses;
            dbCloseDay(openingBalance, totalSales, totalExpenses, netBalance, operant);
            refreshAll();
        } catch (error) {
            console.error("Error closing day:", error);
        }
    };

    // ─── Notifications ──────────────────────────────────────────────────────────
    const clearAllNotifs = () => {
        markNotificationsAsRead();
        refreshAll();
    };

    return (
        <AppContext.Provider
            value={{
                businessName,
                openingBalance,
                setOpenBalance,
                meals,
                transactions,
                debtors,
                creditors,
                notifications,
                unreadNotifsCount,
                inventoryItems,
                takeoutSessions,
                reportPeriod,
                setReportPeriod,
                refreshAll,
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
                clearDebtorAccount,
                addNewMeal,
                updateMeal,
                deleteMeal,
                toggleMealAvailability,
                addRawInventoryItem,
                updateRawInventoryItem,
                updateRawInventoryStock,
                closeDay,
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
