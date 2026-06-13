import { Creditor, Debtor, Transaction } from "@/database/db";
import { buildTrialBalance } from "../accounting";

const tx = (
  overrides: Partial<Transaction>,
): Transaction => ({
  id: 1,
  type: "sale",
  title: "Test Transaction",
  description: "Test",
  amount: 0,
  paymentMethod: "cash",
  date: "2026-01-01T08:00:00.000Z",
  ...overrides,
});

describe("accounting trial balance", () => {
  it("consolidates debtors and creditors into control accounts", () => {
    const debtors: Debtor[] = [
      {
        id: 1,
        name: "Alice",
        totalOwed: 1000,
        totalPaid: 400,
        lastUpdated: "2026-01-01T08:00:00.000Z",
      },
    ];
    const creditors: Creditor[] = [
      {
        id: 1,
        name: "Fresh Foods",
        totalOwed: 750,
        totalPaid: 250,
        lastUpdated: "2026-01-01T08:00:00.000Z",
      },
    ];

    const rows = buildTrialBalance(
      [
        tx({ id: 1, type: "sale", amount: 1000, paymentMethod: "credit", referenceName: "Alice" }),
        tx({ id: 2, type: "debtor_payment", amount: 400, paymentMethod: "cash", referenceName: "Alice" }),
        tx({ id: 3, type: "purchase", amount: 750, paymentMethod: "credit", referenceName: "Fresh Foods" }),
        tx({ id: 4, type: "creditor_payment", amount: 250, paymentMethod: "cash", referenceName: "Fresh Foods" }),
      ],
      debtors,
      creditors,
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          account: "Accounts Receivable (Debtors)",
          type: "Asset",
          debitBalance: 600,
          creditBalance: 0,
        }),
        expect.objectContaining({
          account: "Accounts Payable (Creditors)",
          type: "Liability",
          debitBalance: 0,
          creditBalance: 500,
        }),
      ]),
    );
    expect(rows.some((row) => row.account.startsWith("Debtor:"))).toBe(false);
    expect(rows.some((row) => row.account.startsWith("Creditor:"))).toBe(false);
  });

  it("shows customer credits and supplier credits on the correct side", () => {
    const rows = buildTrialBalance(
      [],
      [
        {
          id: 1,
          name: "Alice",
          totalOwed: 0,
          totalPaid: 200,
          lastUpdated: "2026-01-01T08:00:00.000Z",
        },
      ],
      [
        {
          id: 1,
          name: "Fresh Foods",
          totalOwed: 0,
          totalPaid: 300,
          lastUpdated: "2026-01-01T08:00:00.000Z",
        },
      ],
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          account: "Accounts Receivable (Debtors)",
          type: "Liability",
          debitBalance: 0,
          creditBalance: 200,
        }),
        expect.objectContaining({
          account: "Accounts Payable (Creditors)",
          type: "Asset",
          debitBalance: 300,
          creditBalance: 0,
        }),
      ]),
    );
  });
});
