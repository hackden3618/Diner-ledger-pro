import { Creditor, Debtor, Transaction } from "@/database/db";

export type LedgerLine = {
  transactionId: number;
  timestamp: string;
  reference: string;
  type: Transaction["type"];
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  account: string;
  paymentMethod: Transaction["paymentMethod"];
  entity?: string;
  createdBy?: string;
};

export type JournalLine = {
  transactionId: number;
  timestamp: string;
  reference: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
};

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export type TrialBalanceRow = {
  account: string;
  type: AccountType;
  debitTotal: number;
  creditTotal: number;
  debitBalance: number;
  creditBalance: number;
};

export type AccountingSummary = {
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  cashIn: number;
  cashOut: number;
  debtorBalance: number;
  creditorBalance: number;
  collectionsTotal: number;
  dailyTotals: {
    cashSales: number;
    debtorPayments: number;
    purchasePayments: number;
    expenses: number;
    creditorPayments: number;
    collections: number;
  };
};

const accountTypes: Record<string, AccountType> = {
  "Cash on Hand": "Asset",
  "Mobile Money": "Asset",
  "Accounts Receivable": "Asset",
  "Inventory / Purchases": "Asset",
  Inventory: "Asset",
  "Cash Collections Control": "Asset",
  "M-Pesa Collections Control": "Asset",
  "Accounts Payable": "Liability",
  "Suspense / Control Account": "Liability",
  "Owner Capital / Opening Equity": "Equity",
  "Sales Revenue": "Revenue",
  "Operating Expenses": "Expense",
  "Staff Meals / Internal Consumption": "Expense",
  "Sales Returns / Refunds": "Expense",
  "Adjustment Account": "Expense",
  "General Ledger Debit": "Expense",
  "General Ledger Credit": "Liability",
};

const accountOrder: AccountType[] = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

function makeBalanceRow(
  account: string,
  type: AccountType,
  balance: number,
): TrialBalanceRow {
  const debitNormal = isDebitNormal(type);
  const absBalance = Math.abs(balance);

  return {
    account,
    type,
    debitTotal: balance >= 0 && debitNormal || balance < 0 && !debitNormal ? absBalance : 0,
    creditTotal: balance >= 0 && !debitNormal || balance < 0 && debitNormal ? absBalance : 0,
    debitBalance: balance >= 0 && debitNormal || balance < 0 && !debitNormal ? absBalance : 0,
    creditBalance: balance >= 0 && !debitNormal || balance < 0 && debitNormal ? absBalance : 0,
  };
}

const moneyInTypes: Transaction["type"][] = [
  "opening_balance",
  "sale",
  "debtor_payment",
  "refund",
];

const moneyOutTypes: Transaction["type"][] = [
  "purchase",
  "purchase_payment",
  "expense",
  "creditor_payment",
  "collection",
];

export function sortTransactionsChronologically(
  transactions: Transaction[],
): Transaction[] {
  return [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id,
  );
}

export function referenceForTransaction(transaction: Transaction): string {
  return `TX-${String(transaction.id).padStart(6, "0")}`;
}

function isCashMovement(transaction: Transaction): boolean {
  if (transaction.paymentMethod !== "cash") return false;
  return moneyInTypes.includes(transaction.type) || moneyOutTypes.includes(transaction.type);
}

function cashDirection(transaction: Transaction): "debit" | "credit" | "none" {
  if (!isCashMovement(transaction)) return "none";
  if (moneyInTypes.includes(transaction.type)) return "debit";
  if (moneyOutTypes.includes(transaction.type)) return "credit";
  return "none";
}

function ledgerDescription(transaction: Transaction): string {
  const entity = transaction.referenceName ? ` · ${transaction.referenceName}` : "";
  return `${transaction.title}${entity}${transaction.description ? ` — ${transaction.description}` : ""}`;
}

export function buildCashLedger(transactions: Transaction[]): LedgerLine[] {
  let runningBalance = 0;

  return sortTransactionsChronologically(transactions)
    .filter((transaction) => cashDirection(transaction) !== "none")
    .map((transaction) => {
      const direction = cashDirection(transaction);
      const debit = direction === "debit" ? transaction.amount : 0;
      const credit = direction === "credit" ? transaction.amount : 0;
      runningBalance += debit - credit;

      return {
        transactionId: transaction.id,
        timestamp: transaction.date,
        reference: referenceForTransaction(transaction),
        type: transaction.type,
        description: ledgerDescription(transaction),
        debit,
        credit,
        runningBalance,
        account: "Cash on Hand",
        paymentMethod: transaction.paymentMethod,
        entity: transaction.referenceName,
        createdBy: transaction.createdBy || transaction.operant,
      };
    });
}

function pushJournalPair(
  lines: JournalLine[],
  transaction: Transaction,
  debitAccount: string,
  creditAccount: string,
  amount = transaction.amount,
  description = ledgerDescription(transaction),
) {
  const base = {
    transactionId: transaction.id,
    timestamp: transaction.date,
    reference: referenceForTransaction(transaction),
    description,
  };

  lines.push({ ...base, account: debitAccount, debit: amount, credit: 0 });
  lines.push({ ...base, account: creditAccount, debit: 0, credit: amount });
}

export function buildJournalEntries(transactions: Transaction[]): JournalLine[] {
  const lines: JournalLine[] = [];

  sortTransactionsChronologically(transactions).forEach((transaction) => {
    const cashAccount = transaction.paymentMethod === "mpesa" ? "Mobile Money" : "Cash on Hand";

    switch (transaction.type) {
      case "opening_balance":
        pushJournalPair(lines, transaction, cashAccount, "Owner Capital / Opening Equity");
        break;
      case "sale":
        pushJournalPair(
          lines,
          transaction,
          transaction.paymentMethod === "credit" ? "Accounts Receivable" : cashAccount,
          "Sales Revenue",
        );
        break;
      case "debtor_payment":
        pushJournalPair(lines, transaction, cashAccount, "Accounts Receivable");
        break;
      case "purchase":
      case "credited_purchase":
        pushJournalPair(
          lines,
          transaction,
          "Inventory / Purchases",
          transaction.paymentMethod === "credit" ? "Accounts Payable" : cashAccount,
        );
        break;
      case "purchase_payment":
      case "creditor_payment":
        pushJournalPair(lines, transaction, "Accounts Payable", cashAccount);
        break;
      case "expense":
        pushJournalPair(lines, transaction, "Operating Expenses", cashAccount);
        break;
      case "collection":
        pushJournalPair(
          lines,
          transaction,
          transaction.paymentMethod === "mpesa" ? "M-Pesa Collections Control" : "Cash Collections Control",
          cashAccount,
        );
        break;
      case "consumed":
        pushJournalPair(lines, transaction, "Staff Meals / Internal Consumption", "Inventory");
        break;
      case "refund":
        pushJournalPair(lines, transaction, "Sales Returns / Refunds", cashAccount);
        break;
      case "adjustment":
        if (transaction.description.includes("DEBTOR_WRITE_OFF")) {
          pushJournalPair(lines, transaction, "Adjustment Account", "Accounts Receivable");
        } else if (transaction.description.includes("CUSTOMER_CREDIT_WRITE_OFF")) {
          pushJournalPair(lines, transaction, "Accounts Receivable", "Adjustment Account");
        } else {
          pushJournalPair(lines, transaction, "Adjustment Account", "Suspense / Control Account");
        }
        break;
      default:
        pushJournalPair(lines, transaction, "General Ledger Debit", "General Ledger Credit");
        break;
    }
  });

  return lines;
}

function getAccountType(account: string): AccountType {
  return accountTypes[account] || "Expense";
}

function isDebitNormal(type: AccountType): boolean {
  return type === "Asset" || type === "Expense";
}

function consolidateSubledgerControlAccounts(
  rows: TrialBalanceRow[],
  debtors: Debtor[],
  creditors: Creditor[],
): TrialBalanceRow[] {
  const consolidatedRows = rows.filter(
    (row) => row.account !== "Accounts Receivable" && row.account !== "Accounts Payable",
  );
  const receivableControl = rows.find((row) => row.account === "Accounts Receivable");
  const payableControl = rows.find((row) => row.account === "Accounts Payable");

  const receivableTotal = receivableControl
    ? receivableControl.debitBalance - receivableControl.creditBalance
    : 0;
  const debtorBalance = debtors.length > 0
    ? debtors.reduce((sum, debtor) => sum + debtor.totalOwed - debtor.totalPaid, 0)
    : receivableTotal;
  const receivableDifference = receivableTotal - debtorBalance;

  const payableTotal = payableControl
    ? payableControl.creditBalance - payableControl.debitBalance
    : 0;
  const creditorBalance = creditors.length > 0
    ? creditors.reduce((sum, creditor) => sum + creditor.totalOwed - creditor.totalPaid, 0)
    : payableTotal;
  const payableDifference = payableTotal - creditorBalance;

  // Trial balance stays compact with one receivables control account and
  // one payables control account; individual names remain in statements.
  if (debtorBalance !== 0) {
    consolidatedRows.push(
      makeBalanceRow(
        "Accounts Receivable (Debtors)",
        debtorBalance >= 0 ? "Asset" : "Liability",
        Math.abs(debtorBalance),
      ),
    );
  }

  if (creditorBalance !== 0) {
    consolidatedRows.push(
      makeBalanceRow(
        "Accounts Payable (Creditors)",
        creditorBalance >= 0 ? "Liability" : "Asset",
        Math.abs(creditorBalance),
      ),
    );
  }

  if (Math.abs(receivableDifference) > 0.01) {
    consolidatedRows.push(
      makeBalanceRow(
        "Accounts Receivable Control Difference",
        "Asset",
        receivableDifference,
      ),
    );
  }

  if (Math.abs(payableDifference) > 0.01) {
    consolidatedRows.push(
      makeBalanceRow(
        "Accounts Payable Control Difference",
        "Liability",
        payableDifference,
      ),
    );
  }

  return consolidatedRows;
}

export function buildTrialBalance(
  transactions: Transaction[],
  debtors: Debtor[] = [],
  creditors: Creditor[] = [],
): TrialBalanceRow[] {
  const totals = new Map<string, { debitTotal: number; creditTotal: number }>();

  buildJournalEntries(transactions).forEach((line) => {
    const current = totals.get(line.account) || { debitTotal: 0, creditTotal: 0 };
    current.debitTotal += line.debit;
    current.creditTotal += line.credit;
    totals.set(line.account, current);
  });

  const rows = Array.from(totals.entries())
    .map(([account, total]) => {
      const type = getAccountType(account);
      const rawBalance = isDebitNormal(type)
        ? total.debitTotal - total.creditTotal
        : total.creditTotal - total.debitTotal;

      return {
        account,
        type,
        debitTotal: total.debitTotal,
        creditTotal: total.creditTotal,
        debitBalance: rawBalance >= 0
          ? (isDebitNormal(type) ? rawBalance : 0)
          : (isDebitNormal(type) ? 0 : Math.abs(rawBalance)),
        creditBalance: rawBalance >= 0
          ? (isDebitNormal(type) ? 0 : rawBalance)
          : (isDebitNormal(type) ? Math.abs(rawBalance) : 0),
      };
    })
    .filter((row) => row.debitTotal !== 0 || row.creditTotal !== 0);

  return consolidateSubledgerControlAccounts(rows, debtors, creditors)
    .sort((a, b) => {
      const typeDiff = accountOrder.indexOf(a.type) - accountOrder.indexOf(b.type);
      return typeDiff || a.account.localeCompare(b.account);
    });
}

export function summarizeAccounting(
  transactions: Transaction[],
  debtors: Debtor[],
  creditors: Creditor[],
): AccountingSummary {
  const ledger = buildCashLedger(transactions);
  const cashIn = ledger.reduce((sum, line) => sum + line.debit, 0);
  const cashOut = ledger.reduce((sum, line) => sum + line.credit, 0);
  const openingBalance = transactions
    .filter((transaction) => transaction.type === "opening_balance")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    openingBalance,
    totalDebits: cashIn,
    totalCredits: cashOut,
    closingBalance: cashIn - cashOut,
    cashIn,
    cashOut,
    debtorBalance: debtors.reduce((sum, debtor) => sum + debtor.totalOwed - debtor.totalPaid, 0),
    creditorBalance: creditors.reduce((sum, creditor) => sum + creditor.totalOwed - creditor.totalPaid, 0),
    collectionsTotal: transactions
      .filter((transaction) => transaction.type === "collection")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    dailyTotals: {
      cashSales: transactions
        .filter((transaction) => transaction.type === "sale" && transaction.paymentMethod === "cash")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      debtorPayments: transactions
        .filter((transaction) => transaction.type === "debtor_payment" && transaction.paymentMethod === "cash")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      purchasePayments: transactions
        .filter((transaction) => transaction.type === "purchase" && transaction.paymentMethod === "cash")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expenses: transactions
        .filter((transaction) => transaction.type === "expense" && transaction.paymentMethod === "cash")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      creditorPayments: transactions
        .filter((transaction) => transaction.type === "creditor_payment" && transaction.paymentMethod === "cash")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      collections: transactions
        .filter((transaction) => transaction.type === "collection")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    },
  };
}
