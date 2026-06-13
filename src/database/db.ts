import * as SQLite from "expo-sqlite";

// Open the database synchronously
export const db = SQLite.openDatabaseSync("mealsledger.db");

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Meal {
    id: number;
    name: string;
    price: number;
    stock: number;
    lowAlert: number;
    image: string;
    isAvailable: number; // 1 = available, 0 = unavailable
}

export interface InventoryItem {
    id: number;
    name: string; // e.g. "Wheat Flour", "Cooking Oil"
    stockLevel: number; // current quantity
    unit: string; // e.g. "kg", "litres", "units"
    price: number; // last purchase cost per unit
    updatedAt: string;
    imageUri?: string; // Local path to the uploaded image
}

export interface TransactionItem {
    id: number;
    transactionId: number;
    mealName: string;
    quantity: number;
    unitPrice: number;
}

export interface TakeoutSession {
    id: number;
    staffName: string;
    date: string;
    status: "active" | "reconciled";
    dispatchedItems: string; // JSON string of {mealId, name, qty, price}[]
    reconciledData?: string; // JSON string of {mealId, unsold, cashSold, creditSold, debtors: {name, amount}[]}[]
}

export interface Transaction {
    id: number;
    type:
    | "seed"
    | "sale"
    | "takeaway"
    | "consumed"
    | "returned"
    | "expense"
    | "credited_purchase"
    | "purchase"
    | "purchase_payment"
    | "debtor_payment"
    | "creditor_payment"
    | "day_close"
    | "takeout_reconciliation"
    | "opening_balance"
    | "collection"
    | "adjustment"
    | "refund"
    | "debtor_creation"
    | "creditor_creation";
    title: string;
    description: string;
    amount: number;
    paymentMethod: "cash" | "mpesa" | "credit" | "none";
    date: string;
    referenceName?: string;
    operant?: string; // Staff/operator who performed the transaction
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
}

export interface Debtor {
    id: number;
    name: string;
    phone?: string;
    totalOwed: number;
    totalPaid: number;
    lastUpdated: string;
}

export interface Creditor {
    id: number;
    name: string;
    phone?: string;
    totalOwed: number;
    totalPaid: number;
    lastUpdated: string;
}

export interface Notification {
    id: number;
    title: string;
    message: string;
    type: "stock" | "payment" | "flow" | "general" | "day_close";
    read: number; // 0 or 1
    date: string;
}

// ─── Database Initialization ──────────────────────────────────────────────────

export function initDatabase() {
    // Create core tables
    db.execSync(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      price REAL,
      stock INTEGER,
      lowAlert INTEGER,
      image TEXT,
      isAvailable INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      stockLevel REAL,
      unit TEXT,
      price REAL,
      updatedAt TEXT,
      imageUri TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      title TEXT,
      description TEXT,
      amount REAL,
      paymentMethod TEXT,
      date TEXT,
      referenceName TEXT,
      operant TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedBy TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transactionId INTEGER,
      mealName TEXT,
      quantity INTEGER,
      unitPrice REAL,
      FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debtors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      phone TEXT,
      totalOwed REAL,
      totalPaid REAL,
      lastUpdated TEXT
    );

    CREATE TABLE IF NOT EXISTS creditors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      phone TEXT,
      totalOwed REAL,
      totalPaid REAL,
      lastUpdated TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      message TEXT,
      type TEXT,
      read INTEGER DEFAULT 0,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS takeout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staffName TEXT,
      date TEXT,
      status TEXT,
      dispatchedItems TEXT,
      reconciledData TEXT
    );
  `);

    // Safe migrations — add columns if they don't exist yet (idempotent)
    const safeAlter = (sql: string) => {
        try {
            db.execSync(sql);
        } catch {
            /* column already exists */
        }
    };
    safeAlter("ALTER TABLE meals ADD COLUMN isAvailable INTEGER DEFAULT 1");
    safeAlter("ALTER TABLE transactions ADD COLUMN referenceName TEXT");
    safeAlter("ALTER TABLE transactions ADD COLUMN operant TEXT");
    safeAlter("ALTER TABLE transactions ADD COLUMN createdBy TEXT");
    safeAlter("ALTER TABLE transactions ADD COLUMN createdAt TEXT");
    safeAlter("ALTER TABLE transactions ADD COLUMN updatedBy TEXT");
    safeAlter("ALTER TABLE transactions ADD COLUMN updatedAt TEXT");
    safeAlter("ALTER TABLE debtors ADD COLUMN phone TEXT");
    safeAlter("ALTER TABLE creditors ADD COLUMN phone TEXT");
    safeAlter("ALTER TABLE inventory ADD COLUMN imageUri TEXT");

    // Seed meals if empty - Now empty by default, meals added via Settings as they're prepared
    // (removed hardcoded meal seed data)

    // Seed raw inventory if empty (removed dummy data)

    // Seed business settings if empty
    const countSettings = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM settings",
    );
    if (countSettings && countSettings.count === 0) {
        db.runSync("INSERT INTO settings (key, value) VALUES (?, ?)", [
            "business_name",
            "Mega Diner",
        ]);
        db.runSync("INSERT INTO settings (key, value) VALUES (?, ?)", [
            "opening_balance",
            "0",
        ]);
    }
}

export function resetDatabase() {
    db.execSync(`
    DROP TABLE IF EXISTS meals;
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS transaction_items;
    DROP TABLE IF EXISTS debtors;
    DROP TABLE IF EXISTS creditors;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS takeout_sessions;
  `);
    initDatabase();
}

// ─── Low Stock Dedup Helper ───────────────────────────────────────────────────

function hasLowStockNotifToday(mealName: string): boolean {
    const today = new Date().toDateString();
    const rows = db.getAllSync<{ date: string }>(
        "SELECT date FROM notifications WHERE type = 'stock' AND title = 'Low Stock Alert' AND message LIKE ?",
        [`%${mealName}%`],
    );
    return rows.some((r) => new Date(r.date).toDateString() === today);
}

// ─── Meals / Menu ─────────────────────────────────────────────────────────────

export function getMeals(): Meal[] {
    return db.getAllSync<Meal>("SELECT * FROM meals ORDER BY name ASC");
}

export function updateMealStock(id: number, newStock: number) {
    db.runSync("UPDATE meals SET stock = ? WHERE id = ?", [newStock, id]);
}

export function setMealAvailability(id: number, isAvailable: boolean) {
    db.runSync("UPDATE meals SET isAvailable = ? WHERE id = ?", [
        isAvailable ? 1 : 0,
        id,
    ]);
}

export function addMeal(
    name: string,
    price: number,
    stock: number,
    lowAlert: number,
    image: string,
) {
    db.runSync(
        "INSERT OR REPLACE INTO meals (name, price, stock, lowAlert, image, isAvailable) VALUES (?, ?, ?, ?, ?, 1)",
        [name, price, stock, lowAlert, image],
    );
}

export function updateMealDetails(
    id: number,
    name: string,
    price: number,
    stock: number,
    lowAlert: number,
    image: string,
) {
    db.runSync(
        "UPDATE meals SET name = ?, price = ?, stock = ?, lowAlert = ?, image = ? WHERE id = ?",
        [name, price, stock, lowAlert, image, id],
    );
}

export function deleteMeal(id: number) {
    db.runSync("DELETE FROM meals WHERE id = ?", [id]);
}

// ─── Raw Inventory ────────────────────────────────────────────────────────────

export function getInventoryItems(): InventoryItem[] {
    return db.getAllSync<InventoryItem>(
        "SELECT * FROM inventory ORDER BY name ASC",
    );
}

export function addInventoryItem(
    name: string,
    stockLevel: number,
    unit: string,
    price: number,
    imageUri?: string,
) {
    const now = new Date().toISOString();
    db.runSync(
        "INSERT OR REPLACE INTO inventory (name, stockLevel, unit, price, updatedAt, imageUri) VALUES (?, ?, ?, ?, ?, ?)",
        [name, stockLevel, unit, price, now, imageUri || null],
    );
}

export function updateInventoryStock(id: number, newStock: number) {
    const now = new Date().toISOString();
    db.runSync(
        "UPDATE inventory SET stockLevel = ?, updatedAt = ? WHERE id = ?",
        [newStock, now, id],
    );
}

export function updateInventoryItemDetails(
    id: number,
    name: string,
    stockLevel: number,
    unit: string,
    price: number,
    imageUri?: string,
) {
    const now = new Date().toISOString();
    db.runSync(
        "UPDATE inventory SET name = ?, stockLevel = ?, unit = ?, price = ?, updatedAt = ?, imageUri = ? WHERE id = ?",
        [name, stockLevel, unit, price, now, imageUri || null, id],
    );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function getTransactions(): Transaction[] {
    return db.getAllSync<Transaction>(
        "SELECT * FROM transactions ORDER BY date DESC",
    );
}

export function getTransactionItems(transactionId: number): TransactionItem[] {
    return db.getAllSync<TransactionItem>(
        "SELECT * FROM transaction_items WHERE transactionId = ?",
        [transactionId],
    );
}

export function addTransaction(
    type: Transaction["type"],
    title: string,
    description: string,
    amount: number,
    paymentMethod: Transaction["paymentMethod"],
    referenceName?: string,
    operant?: string,
    items?: { mealName: string; quantity: number; unitPrice: number }[],
) {
    const date = new Date().toISOString();

    const result = db.runSync(
        `INSERT INTO transactions (type, title, description, amount, paymentMethod, date, referenceName, operant, createdBy, createdAt, updatedBy, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            type,
            title,
            description,
            amount,
            paymentMethod,
            date,
            referenceName || null,
            operant || null,
            operant || null,
            date,
            operant || null,
            date,
        ],
    );

    const txId = result.lastInsertRowId;

    // Insert line items if provided
    if (items && items.length > 0) {
        items.forEach((item) => {
            db.runSync(
                "INSERT INTO transaction_items (transactionId, mealName, quantity, unitPrice) VALUES (?, ?, ?, ?)",
                [txId, item.mealName, item.quantity, item.unitPrice],
            );
        });
    }

    // Financial flux notification on every completed transaction
    if (type !== "day_close") {
        const modeLabel =
            paymentMethod === "cash"
                ? "Cash"
                : paymentMethod === "mpesa"
                    ? "M-Pesa"
                    : paymentMethod === "credit"
                        ? "Credit"
                        : "Internal";
        const typeLabel =
            type === "sale"
                ? "Sale"
                : type === "expense"
                    ? "Expense"
                    : type === "purchase"
                        ? "Purchase"
                        : type === "debtor_payment"
                            ? "Debtor Payment"
                            : type === "creditor_payment"
                                ? "Creditor Payment"
                                : type === "takeaway"
                                    ? "Meal Take-Out"
                                    : type === "consumed"
                                        ? "Internal Consumption"
                                        : type;

        addNotification(
            "Financial Activity",
            `KES ${amount.toLocaleString()} processed via ${modeLabel} · ${typeLabel}${operant ? ` · by ${operant}` : ""
            }`,
            "flow",
        );
    }

    // Low-stock check after sales (deduplicated — once per meal per day)
    if (type === "sale" || type === "takeaway" || type === "consumed") {
        const meals = getMeals();
        meals.forEach((meal) => {
            if (meal.stock <= meal.lowAlert && !hasLowStockNotifToday(meal.name)) {
                addNotification(
                    "Low Stock Alert",
                    `Low Stock Warning: Only ${meal.stock} units of ${meal.name} are left in the kitchen.`,
                    "stock",
                );
            }
        });
    }
}

// ─── Collection ───────────────────────────────────────────────────────────────

export function recordCollection(
    amount: number,
    collectorName: string,
    staffHandingOver: string,
) {
    const date = new Date().toISOString();
    db.runSync(
        `INSERT INTO transactions (type, title, description, amount, paymentMethod, date, referenceName, operant, createdBy, createdAt, updatedBy, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            "collection",
            "Cash Collection",
            `Cash handed to collector ${collectorName}`,
            amount,
            "cash",
            date,
            collectorName,
            staffHandingOver,
            staffHandingOver,
            date,
            staffHandingOver,
            date,
        ],
    );
    
    addNotification(
        "Cash Collected",
        `KES ${amount.toLocaleString()} handed to collector ${collectorName} by ${staffHandingOver}.`,
        "payment",
    );
}

// ─── Opening Balance ───────────────────────────────────────────────────────────

export function hasOpeningBalanceToday(): boolean {
    const today = new Date().toDateString();
    const rows = db.getAllSync<{ date: string }>(
        "SELECT date FROM transactions WHERE type = 'opening_balance'"
    );
    return rows.some((r) => new Date(r.date).toDateString() === today);
}

export function recordOpeningBalance(
    amount: number,
    operant: string,
) {
    const date = new Date().toISOString();
    db.runSync(
        `INSERT INTO transactions (type, title, description, amount, paymentMethod, date, referenceName, operant, createdBy, createdAt, updatedBy, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            "opening_balance",
            "Opening Balance",
            "Daily opening balance entry",
            amount,
            "cash",
            date,
            null,
            operant,
            operant,
            date,
            operant,
            date,
        ],
    );
    
    // Also update the setting for backward compatibility
    updateSetting("opening_balance", amount.toString());
    
    addNotification(
        "Opening Balance Recorded",
        `KES ${amount.toLocaleString()} opening balance recorded by ${operant}.`,
        "general",
    );
}

// ─── End-of-Day Close ─────────────────────────────────────────────────────────

export function closeDay(
    openingBalance: number,
    totalSales: number,
    totalExpenses: number,
    netBalance: number,
    operant: string,
    collector?: string,
) {
    const date = new Date().toISOString();
    const dateLabel = new Date().toLocaleDateString("en-KE", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const collectorText = collector ? ` | Cash collected by ${collector}` : "";

    db.runSync(
        `INSERT INTO transactions (type, title, description, amount, paymentMethod, date, referenceName, operant)
     VALUES ('day_close', 'Day Closed — B/F', ?, ?, 'none', ?, ?, ?)`,
        [
            `Opening Balance: KES ${openingBalance.toLocaleString()} | Total Sales: KES ${totalSales.toLocaleString()} | Total Expenses: KES ${totalExpenses.toLocaleString()}${collectorText}`,
            netBalance,
            date,
            collector || null,
            operant,
        ],
    );

    addNotification(
        "Day Closed",
        `${dateLabel} closed by ${operant}${collector ? `. Cash collected by ${collector}` : ""}. Net Balance B/F: KES ${netBalance.toLocaleString()}`,
        "day_close",
    );
}

// ─── Debtors ──────────────────────────────────────────────────────────────────

export function getDebtors(): Debtor[] {
    return db.getAllSync<Debtor>("SELECT * FROM debtors ORDER BY name ASC");
}

export function updateDebtor(
    name: string,
    amtOwedDelta: number,
    amtPaidDelta: number,
    phone?: string,
) {
    const date = new Date().toISOString();
    const existing = db.getFirstSync<Debtor>(
        "SELECT * FROM debtors WHERE name = ?",
        [name],
    );

    if (existing) {
        const newOwed = existing.totalOwed + amtOwedDelta;
        const newPaid = existing.totalPaid + amtPaidDelta;
        db.runSync(
            "UPDATE debtors SET totalOwed = ?, totalPaid = ?, lastUpdated = ?, phone = COALESCE(?, phone) WHERE id = ?",
            [newOwed, newPaid, date, phone || null, existing.id],
        );

        // Auto-notify when account is fully cleared
        const balance = newOwed - newPaid;
        if (balance <= 0 && existing.totalOwed > 0) {
            addNotification(
                "Ledger Account Cleared",
                `${name} has successfully settled all active financial obligations.`,
                "payment",
            );
        }
    } else {
        db.runSync(
            "INSERT INTO debtors (name, phone, totalOwed, totalPaid, lastUpdated) VALUES (?, ?, ?, ?, ?)",
            [name, phone || null, amtOwedDelta, amtPaidDelta, date],
        );
    }
}

export function clearDebtor(id: number) {
    const debtor = db.getFirstSync<Debtor>("SELECT * FROM debtors WHERE id = ?", [
        id,
    ]);
    if (debtor) {
        const balance = debtor.totalOwed - debtor.totalPaid;

        if (balance !== 0) {
            // Do not delete historical debtor records. A manual clearance is an
            // accounting correction, so it must leave an adjustment transaction.
            addTransaction(
                "adjustment",
                `Debtor Adjustment — ${debtor.name}`,
                `${balance > 0 ? "DEBTOR_WRITE_OFF" : "CUSTOMER_CREDIT_WRITE_OFF"}: Manual debtor clearance. Previous balance: KES ${balance.toLocaleString()}`,
                Math.abs(balance),
                "none",
                debtor.name,
                "System",
            );

            if (balance > 0) {
                updateDebtor(debtor.name, 0, balance);
            } else {
                updateDebtor(debtor.name, Math.abs(balance), 0);
            }
        }

        addNotification(
            "Debtor Account Adjusted",
            `${debtor.name}'s account has been manually cleared with an audit adjustment.`,
            "payment",
        );
    }
}

// ─── Balance Calculations from Transactions (Source of Truth) ───────────────

export function calculateDebtorBalanceFromTransactions(debtorName: string): number {
    const transactions = db.getAllSync<Transaction>(
        "SELECT * FROM transactions WHERE referenceName = ? AND type IN ('sale', 'debtor_payment', 'adjustment')",
        [debtorName]
    );
    
    let balance = 0;
    transactions.forEach(t => {
        if (t.type === 'sale' && t.paymentMethod === 'credit') {
            balance += t.amount; // Debtor owes us
        } else if (t.type === 'debtor_payment') {
            balance -= t.amount; // Debtor paid us
        } else if (t.type === 'adjustment' && t.description.includes('DEBTOR_WRITE_OFF')) {
            balance -= t.amount; // Manual write-off reduces receivable
        } else if (t.type === 'adjustment' && t.description.includes('CUSTOMER_CREDIT_WRITE_OFF')) {
            balance += t.amount; // Manual clearance reduces customer credit
        }
    });
    
    return balance;
}

export function calculateCreditorBalanceFromTransactions(creditorName: string): number {
    const transactions = db.getAllSync<Transaction>(
        "SELECT * FROM transactions WHERE referenceName = ? AND type IN ('credited_purchase', 'purchase', 'creditor_payment')",
        [creditorName]
    );
    
    let balance = 0;
    transactions.forEach(t => {
        if (t.type === 'credited_purchase' || (t.type === 'purchase' && t.paymentMethod === 'credit')) {
            balance += t.amount; // We owe creditor
        } else if (t.type === 'creditor_payment') {
            balance -= t.amount; // We paid creditor
        }
    });
    
    return balance;
}

// ─── Creditors ────────────────────────────────────────────────────────────────

export function getCreditors(): Creditor[] {
    return db.getAllSync<Creditor>("SELECT * FROM creditors ORDER BY name ASC");
}

export function updateCreditor(
    name: string,
    amtOwedDelta: number,
    amtPaidDelta: number,
    phone?: string,
) {
    const date = new Date().toISOString();
    const existing = db.getFirstSync<Creditor>(
        "SELECT * FROM creditors WHERE name = ?",
        [name],
    );

    if (existing) {
        const newOwed = existing.totalOwed + amtOwedDelta;
        const newPaid = existing.totalPaid + amtPaidDelta;
        db.runSync(
            "UPDATE creditors SET totalOwed = ?, totalPaid = ?, lastUpdated = ?, phone = COALESCE(?, phone) WHERE id = ?",
            [newOwed, newPaid, date, phone || null, existing.id],
        );

        // Auto-notify when creditor account is fully settled
        const balance = newOwed - newPaid;
        if (balance <= 0 && existing.totalOwed > 0) {
            addNotification(
                "Creditor Account Settled",
                `All outstanding obligations to ${name} have been fully settled.`,
                "payment",
            );
        }
    } else {
        db.runSync(
            "INSERT INTO creditors (name, phone, totalOwed, totalPaid, lastUpdated) VALUES (?, ?, ?, ?, ?)",
            [name, phone || null, amtOwedDelta, amtPaidDelta, date],
        );
    }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function getNotifications(): Notification[] {
    return db.getAllSync<Notification>(
        "SELECT * FROM notifications ORDER BY date DESC LIMIT 80",
    );
}

export function getUnreadNotificationsCount(): number {
    const res = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM notifications WHERE read = 0",
    );
    return res ? res.count : 0;
}

export function addNotification(
    title: string,
    message: string,
    type: Notification["type"],
) {
    const date = new Date().toISOString();
    db.runSync(
        "INSERT INTO notifications (title, message, type, date) VALUES (?, ?, ?, ?)",
        [title, message, type, date],
    );
}

export function markNotificationsAsRead() {
    db.runSync("UPDATE notifications SET read = 1 WHERE read = 0");
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSetting(key: string): string {
    const row = db.getFirstSync<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        [key],
    );
    return row ? row.value : "";
}

export function updateSetting(key: string, value: string) {
    db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
        key,
        value,
    ]);
}

// ─── Takeout Sessions ─────────────────────────────────────────────────────────

export function getActiveTakeoutSessions(): TakeoutSession[] {
    return db.getAllSync<TakeoutSession>(
        "SELECT * FROM takeout_sessions WHERE status = 'active' ORDER BY date DESC",
    );
}

export function createTakeoutSession(
    staffName: string,
    items: { mealId: number; name: string; qty: number; price: number }[],
) {
    const date = new Date().toISOString();
    db.runSync(
        "INSERT INTO takeout_sessions (staffName, date, status, dispatchedItems) VALUES (?, ?, ?, ?)",
        [staffName, date, "active", JSON.stringify(items)],
    );
}

export function reconcileTakeoutSession(
    sessionId: number,
    reconciledData: string,
) {
    db.runSync(
        "UPDATE takeout_sessions SET status = 'reconciled', reconciledData = ? WHERE id = ?",
        [reconciledData, sessionId],
    );
}
