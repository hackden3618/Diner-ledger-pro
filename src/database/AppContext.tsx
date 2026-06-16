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
    setOpeningBalanceWithLock: (cashAmount: number, mpesaAmount: number, operant: string) => void,
    hasOpeningBalanceToday: () => boolean,
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

    const saveBusinessName = (name: string) => {
        updateSetting("business_name", name);
        setBusinessName(name);
    };

    const setOpeningBalanceWithLock = (cashAmount: number, mpesaAmount: number, operant: string) => {
        // Accounting principle: Opening balance can only be entered once per business day
        // Once entered, it becomes locked
        if (hasOpeningBalanceToday()) {
            throw new Error("Opening balance has already been recorded for today. It is locked.");
        }
        if (cashAmount < 0 || mpesaAmount < 0) {
            throw new Error("Opening balances must be non-negative.");
        }
        if (cashAmount + mpesaAmount <= 0) {
            throw new Error("Enter either a cash or M-Pesa opening balance.");
        }

        recordOpeningBalance(cashAmount, operant, "cash");
        recordOpeningBalance(mpesaAmount, operant, "mpesa");
        setOpenBalance((cashAmount + mpesaAmount).toString());
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

    // ─── Record Sale ────────────────────────────────────────────────────────────
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
            const latestMeals = getMeals(); // avoid stale closure

            // Build line items first, then validate stock before mutating anything.
            // This prevents partial stock deductions if a stale screen submits bad quantities.
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

            });

            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                if (!currentMeal) {
                    throw new Error(`${item.name} no longer exists in inventory.`);
                }
                if (item.qty <= 0 || item.qty > currentMeal.stock) {
                    throw new Error(`Cannot record ${item.qty} ${item.name}. Available stock is ${currentMeal.stock}.`);
                }
            });

            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId)!;
                updateMealStock(item.mealId, currentMeal.stock - item.qty);
            });

            const itemsText = itemSummaries.join(" · ");
            const paidAmount = saleType === "dinein" ? amountPaid ?? totalAmt : amountPaid;

            if (saleType === "consumed") {
                // Double-entry: Debit Expense (internal consumption), Credit Inventory
                addTransaction(
                    "consumed",
                    "Meals Consumed (Internal)",
                    consumedDescription || itemsText,
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
            } else if (saleType === "credit") {
                const debtorName = referenceName || "Walk-in Debtor";
                // Double-entry: Debit Accounts Receivable, Credit Sales Revenue
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
            } else if (saleType === "dinein" && paidAmount === totalAmt) {
                // Dine-in
                const methodLabel = paymentMethod === "mpesa" ? "M-Pesa" : "Cash";

                // Double-entry: Debit Cash/M-Pesa, Credit Sales Revenue.
                // Existing customer credits are not silently consumed here; they need
                // an explicit refund/adjustment workflow to preserve audit clarity.
                addTransaction(
                    "sale",
                    `Sale — ${methodLabel}`,
                    itemsText,
                    totalAmt,
                    paymentMethod,
                    referenceName,
                    operant,
                    lineItems,
                );
            }

            // Check for underpayment (customer pays less than required)
            if (saleType === "dinein" && paidAmount !== undefined && paidAmount < totalAmt && paidAmount >= 0) {
                const underpayAmount = totalAmt - paidAmount;
                if (referenceName && referenceName.trim() !== "") {
                    // Underpaid sale: record the full invoice as credit, then the cash received
                    // as an immediate debtor payment. This keeps revenue complete and avoids
                    // splitting one sale into duplicate-looking sale records.
                    addTransaction(
                        "sale",
                        `Credit Sale — ${referenceName}`,
                        itemsText,
                        totalAmt,
                        "credit",
                        referenceName,
                        operant,
                        lineItems,
                    );
                    if (paidAmount > 0) {
                        addTransaction(
                            "debtor_payment",
                            `Debtor Payment — ${referenceName}`,
                            `Immediate partial payment for ${itemsText}`,
                            paidAmount,
                            paymentMethod,
                            referenceName,
                            operant,
                        );
                    }
                    updateDebtor(referenceName, totalAmt, paidAmount);
                    addNotification(
                        "Partial Payment Recorded",
                        `Customer ${referenceName} paid KES ${paidAmount} of KES ${totalAmt}. Owes KES ${underpayAmount}.`,
                        "payment"
                    );
                    refreshAll();
                    return;
                } else {
                    throw new Error("Customer name is required for underpayments.");
                }
            }

            // Check for overpayment (customer pays more than required)
            if (saleType === "dinein" && paidAmount !== undefined && paidAmount > totalAmt) {
                const overpayAmount = paidAmount - totalAmt;
                if (referenceName && referenceName.trim() !== "") {
                    // Overpaid sale - record full sale, plus a separate debtor payment for the excess
                    addTransaction(
                        "sale",
                        `Overpaid Sale — ${referenceName}`,
                        `Fully paid via ${paymentMethod.toUpperCase()} · by ${operant}`,
                        totalAmt,
                        paymentMethod,
                        referenceName,
                        operant,
                        lineItems,
                    );
                    addTransaction(
                        "debtor_payment",
                        `Customer Overpayment — ${referenceName}`,
                        `Excess credit via ${paymentMethod.toUpperCase()} · by ${operant}`,
                        overpayAmount,
                        paymentMethod,
                        referenceName,
                        operant,
                    );
                    updateDebtor(referenceName, -overpayAmount, 0);
                    addNotification(
                        "Overpayment Recorded",
                        `Customer ${referenceName} overpaid by KES ${overpayAmount}. We now owe them this amount.`,
                        "payment"
                    );
                    refreshAll();
                    return;
                } else {
                    throw new Error("Customer name is required for overpayments.");
                }
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording sale:", error);
            throw error;
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
                if (!currentMeal) {
                    throw new Error(`${item.name} no longer exists in inventory.`);
                }
                if (item.qty <= 0 || item.qty > currentMeal.stock) {
                    throw new Error(`Cannot dispatch ${item.qty} ${item.name}. Available stock is ${currentMeal.stock}.`);
                }
            });

            items.forEach((item) => {
                const currentMeal = latestMeals.find((m) => m.id === item.mealId);
                if (currentMeal) {
                    updateMealStock(item.mealId, currentMeal.stock - item.qty);
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
            throw error;
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
            totalMpesa: number;
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

            // Handle global debtors
            if (reconciliationData.globalDebtors) {
                reconciliationData.globalDebtors.forEach((debtor) => {
                    // For debtors, we also don't map specific items since debtors are recorded in aggregate.
                    // This is sufficient for accurate stock and financial calculations.
                    addTransaction(
                        "sale",
                        `Takeout Credit Sales — ${staffName}`,
                        `Credit to ${debtor.name}`,
                        debtor.amount,
                        "credit",
                        debtor.name,
                        staffName,
                    );
                    updateDebtor(debtor.name, debtor.amount, 0);
                });
            }

            // Extract items sold via cash/mpesa for analytics mapping
            const cashSoldItems = reconciliationData.items
                .filter((i) => i.cashSold > 0)
                .map((i) => {
                    const currentMeal = latestMeals.find((m) => m.id === i.mealId);
                    return { mealName: currentMeal?.name || `Meal ${i.mealId}`, quantity: i.cashSold, unitPrice: currentMeal?.price || 0 };
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
                    cashSoldItems.length > 0 ? cashSoldItems : undefined
                );
            }

            // Handle bulk M-Pesa sale
            if (reconciliationData.totalMpesa > 0) {
                // If items were mapped entirely to cash earlier, we might not map them here unless they were separated.
                // In the current reconciliation flow, we don't have separate cash vs mpesa item mapping,
                // so we only assign the items once to the cash sale to avoid duplicate analytics counting.
                addTransaction(
                    "sale",
                    `Takeout M-Pesa Sales — ${staffName}`,
                    "Consolidated M-Pesa from outside catering",
                    reconciliationData.totalMpesa,
                    "mpesa",
                    undefined,
                    staffName,
                    (reconciliationData.totalCash === 0 && cashSoldItems.length > 0) ? cashSoldItems : undefined
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
            throw error;
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
            // Double-entry: Debit Expense, Credit Cash/M-Pesa
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
            throw error;
        }
    };

    const recordPurchase = (
        title: string,
        amount: number,
        paymentMethod: "cash" | "mpesa" | "credit",
        supplierName: string,
        operant: string,
        supplierPhone?: string,
    ) => {
        try {
            const isCredited = paymentMethod === "credit";
            if (isCredited) {
                // Full credit purchase - record full amount to creditor
                addTransaction(
                    "purchase",
                    "Credited Purchase",
                    title,
                    amount,
                    "credit",
                    supplierName,
                    operant,
                );
                updateCreditor(supplierName, amount, 0, supplierPhone);
            } else {
                // Cash or M-Pesa purchase - record with actual payment method
                addTransaction(
                    "purchase",
                    "Purchase",
                    title,
                    amount,
                    paymentMethod,
                    supplierName,
                    operant,
                );
            }

            // Keep the raw inventory register in step with purchase records.
            // Quantity-specific purchasing is not modeled yet, so each purchase
            // entry increments or creates one tracked unit for the named item.
            const existingItems = getInventoryItems();
            const match = existingItems.find(
                (item) => item.name.toLowerCase() === title.trim().toLowerCase(),
            );
            if (match) {
                updateInventoryStock(match.id, match.stockLevel + 1);
            } else {
                addInventoryItem(title.trim(), 1, "units", amount);
            }
            refreshAll();
        } catch (error) {
            console.error("Error recording purchase:", error);
            throw error;
        }

    }

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

            if (!existingDebtor) {
                throw new Error(`${debtorName} does not have an active debtor account.`);
            }

            const debtorBalance = existingDebtor.totalOwed - existingDebtor.totalPaid;
            if (debtorBalance <= 0) {
                throw new Error(`${debtorName} does not owe money. Record a refund or adjustment instead.`);
            }

            if (existingDebtor) {
                if (amount > debtorBalance) {
                    // Overpayment - clear what's owed and create negative balance (we owe them)
                    amountToClearDebtor = debtorBalance;
                }
            }

            // Double-entry: Debit Cash/M-Pesa, Credit Accounts Receivable
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

            // If overpaid, create negative debtor balance (we owe them)
            if (amount > debtorBalance) {
                const overpayAmount = amount - debtorBalance;
                updateDebtor(debtorName, -overpayAmount, 0);
                addNotification(
                    "Overpayment Recorded",
                    `${debtorName} overpaid by KES ${overpayAmount}. We now owe them this amount.`,
                    "payment"
                );
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording debtor payment:", error);
            throw error;
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
            let amountPaidToCreditor = amount;

            if (!existingCreditor) {
                throw new Error(`${creditorName} does not have an active creditor account.`);
            }

            const creditorBalance = existingCreditor.totalOwed - existingCreditor.totalPaid;

            updateCreditor(creditorName, 0, amountPaidToCreditor);
            addTransaction(
                "creditor_payment",
                creditorBalance > 0
                    ? `Paid Creditor — ${creditorName}`
                    : `Supplier Advance — ${creditorName}`,
                creditorBalance > 0
                    ? `Creditor settlement via ${paymentMethod.toUpperCase()} · by ${operant}`
                    : `Supplier advance via ${paymentMethod.toUpperCase()} · by ${operant}`,
                amount,
                paymentMethod,
                creditorName,
                operant,
            );

            if (amount > creditorBalance) {
                const overpayAmount = amount - creditorBalance;
                addNotification(
                    "Overpayment Recorded",
                    `Overpaid supplier ${creditorName} by KES ${overpayAmount}. They now owe us this amount.`,
                    "payment"
                );
            }

            refreshAll();
        } catch (error) {
            console.error("Error recording creditor payment:", error);
            throw error;
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
                setOpeningBalanceWithLock,
                hasOpeningBalanceToday,
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
                recordCollection,
                clearDebtorAccount,
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
