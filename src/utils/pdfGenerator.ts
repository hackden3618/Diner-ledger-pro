import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Transaction, Debtor, Creditor, getTransactionItems } from '../database/db';
import { Alert } from 'react-native';
import { AccountingSummary, buildCashLedger, buildJournalEntries, buildTrialBalance } from './accounting';

export async function generateLedgerPDF(
  businessName: string,
  transactions: Transaction[],
  debtors: Debtor[],
  creditors: Creditor[],
  periodText: string,
  summary: AccountingSummary
) {
  const ledgerLines = buildCashLedger(transactions);
  const journalLines = buildJournalEntries(transactions);
  const trialBalanceRows = buildTrialBalance(transactions, debtors, creditors);

  const txnRows = ledgerLines
    .map(line => {
      const drVal = line.debit > 0 ? `KES ${line.debit.toLocaleString()}` : '';
      const crVal = line.credit > 0 ? `KES ${line.credit.toLocaleString()}` : '';

      const dateFormatted = new Date(line.timestamp).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = new Date(line.timestamp).toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Fetch line items for this transaction
      let lineItemsHtml = '';
      try {
        const items = getTransactionItems(line.transactionId);
        if (items.length > 0) {
          lineItemsHtml = `<ul style="margin:4px 0 0 0; padding-left:14px; color:#666; font-size:10px;">
            ${items.map(i => `<li>${i.quantity}× ${i.mealName} @ KES ${i.unitPrice}</li>`).join('')}
          </ul>`;
        }
      } catch { /* no items for this tx */ }

      return `
        <tr>
          <td style="white-space:nowrap">${dateFormatted}<br/><small>${timeFormatted}</small></td>
          <td>${line.reference}</td>
          <td>
            <strong>${line.description}</strong><br/>
            <small style="color:#666">${line.account}${line.entity ? ` · ${line.entity}` : ''}</small>
            ${lineItemsHtml}
          </td>
          <td style="color:#666; font-size:10px">${line.createdBy || '—'}</td>
          <td style="color:#d35400; text-align:right">${drVal}</td>
          <td style="color:#27ae60; text-align:right">${crVal}</td>
          <td style="text-align:right; font-weight:600">KES ${line.runningBalance.toLocaleString()}</td>
          <td style="text-transform:capitalize; font-weight:500">${line.paymentMethod}</td>
        </tr>
      `;
    })
    .join('');

  const journalRows = journalLines
    .map(line => `
      <tr>
        <td style="white-space:nowrap">${new Date(line.timestamp).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td>${line.reference}</td>
        <td>${line.account}</td>
        <td>${line.description}</td>
        <td style="text-align:right; color:#d35400">${line.debit ? `KES ${line.debit.toLocaleString()}` : ''}</td>
        <td style="text-align:right; color:#27ae60">${line.credit ? `KES ${line.credit.toLocaleString()}` : ''}</td>
      </tr>
    `)
    .join('');

  const debtorRows = debtors
    .filter(d => d.totalOwed - d.totalPaid !== 0)
    .map(d => `
      <tr>
        <td>${d.name}${d.phone ? `<br/><small style="color:#64748b">📞 ${d.phone}</small>` : ''}</td>
        <td style="color:#c0392b; font-weight:600">KES ${d.totalOwed.toLocaleString()}</td>
        <td style="color:#27ae60">KES ${d.totalPaid.toLocaleString()}</td>
        <td style="font-weight:600">KES ${(d.totalOwed - d.totalPaid).toLocaleString()}</td>
      </tr>
    `)
    .join('');

  const creditorRows = creditors
    .filter(c => c.totalOwed - c.totalPaid !== 0)
    .map(c => `
      <tr>
        <td>${c.name}${c.phone ? `<br/><small style="color:#64748b">📞 ${c.phone}</small>` : ''}</td>
        <td style="color:#d35400; font-weight:600">KES ${c.totalOwed.toLocaleString()}</td>
        <td style="color:#27ae60">KES ${c.totalPaid.toLocaleString()}</td>
        <td style="font-weight:600">KES ${(c.totalOwed - c.totalPaid).toLocaleString()}</td>
      </tr>
    `)
    .join('');

  const journalDebitTotal = journalLines.reduce((sum, line) => sum + line.debit, 0);
  const journalCreditTotal = journalLines.reduce((sum, line) => sum + line.credit, 0);
  const trialDebitTotal = trialBalanceRows.reduce((sum, row) => sum + row.debitBalance, 0);
  const trialCreditTotal = trialBalanceRows.reduce((sum, row) => sum + row.creditBalance, 0);
  const journalBalanced = Math.abs(journalDebitTotal - journalCreditTotal) < 0.01;
  const trialBalanceHtml = trialBalanceRows
    .map(row => `
      <tr>
        <td>${row.account}</td>
        <td>${row.type}</td>
        <td style="text-align:right; color:#d35400">${row.debitBalance ? `KES ${row.debitBalance.toLocaleString()}` : ''}</td>
        <td style="text-align:right; color:#27ae60">${row.creditBalance ? `KES ${row.creditBalance.toLocaleString()}` : ''}</td>
      </tr>
    `)
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ledger Report — ${businessName}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2c3e50; padding: 24px; background: #fff; }
          .header { border-bottom: 3px solid #2ecc71; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 22px; font-weight: bold; margin: 0; color: #1e272c; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 4px 0 0 0; color: #7f8c8d; font-size: 13px; }
          .summary-grid { display: flex; gap: 12px; margin-bottom: 24px; }
          .summary-card { flex: 1; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
          .summary-card .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px; }
          .summary-card .val { font-size: 17px; font-weight: bold; color: #0f172a; }
          .section-title { font-size: 13px; font-weight: bold; color: #0f172a; border-left: 4px solid #2ecc71; padding-left: 8px; margin: 24px 0 10px 0; text-transform: uppercase; letter-spacing: 0.8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; font-size: 10px; text-transform: uppercase; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; letter-spacing: 0.4px; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          .trial-row { background: #e8f8f5; font-weight: bold; }
          .totals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 18px; }
          .mini-card { border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px; }
          .mini-card span { display:block; color:#64748b; font-size:9px; text-transform:uppercase; font-weight:700; }
          .mini-card strong { display:block; margin-top:3px; color:#0f172a; font-size:12px; }
          .footer { text-align: center; margin-top: 36px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${businessName}</h1>
          <p>Professional Accounting Ledger, Cashbook &amp; Journal · Period: ${periodText}</p>
          <p style="font-size:10px; margin-top:2px; color:#94a3b8">Generated: ${new Date().toLocaleString('en-KE')}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="lbl">Opening Balance</div>
            <div class="val">KES ${summary.openingBalance.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Total Debits (Dr)</div>
            <div class="val" style="color:#27ae60">KES ${summary.totalDebits.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Total Credits (Cr)</div>
            <div class="val" style="color:#d35400">KES ${summary.totalCredits.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Closing Cash</div>
            <div class="val">KES ${summary.closingBalance.toLocaleString()}</div>
            <div style="font-size:10px; margin-top:3px">${journalBalanced ? '<span style="color:#27ae60">Journal balanced</span>' : '<span style="color:#e74c3c">Journal variance</span>'}</div>
          </div>
        </div>

        <div class="section-title">Daily Totals</div>
        <div class="totals-grid">
          <div class="mini-card"><span>Cash Sales</span><strong>KES ${summary.dailyTotals.cashSales.toLocaleString()}</strong></div>
          <div class="mini-card"><span>Debtor Payments</span><strong>KES ${summary.dailyTotals.debtorPayments.toLocaleString()}</strong></div>
          <div class="mini-card"><span>Purchase Payments</span><strong>KES ${summary.dailyTotals.purchasePayments.toLocaleString()}</strong></div>
          <div class="mini-card"><span>Expenses</span><strong>KES ${summary.dailyTotals.expenses.toLocaleString()}</strong></div>
          <div class="mini-card"><span>Creditor Payments</span><strong>KES ${summary.dailyTotals.creditorPayments.toLocaleString()}</strong></div>
          <div class="mini-card"><span>Collections</span><strong>KES ${summary.dailyTotals.collections.toLocaleString()}</strong></div>
        </div>

        <div class="section-title">Cashbook Ledger</div>
        <table>
          <thead>
            <tr>
              <th style="width:10%">Date</th>
              <th style="width:8%">Reference</th>
              <th style="width:32%">Description / Line Items</th>
              <th style="width:8%">Operant</th>
              <th style="width:12%; text-align:right">Dr</th>
              <th style="width:12%; text-align:right">Cr</th>
              <th style="width:12%; text-align:right">Running Balance</th>
              <th style="width:10%">Payment</th>
            </tr>
          </thead>
          <tbody>
            ${txnRows || '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px">No transactions in this period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="trial-row">
              <td colspan="4" style="text-align:right; font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:0.5px">Totals</td>
              <td style="text-align:right; color:#d35400">KES ${summary.totalDebits.toLocaleString()}</td>
              <td style="text-align:right; color:#27ae60">KES ${summary.totalCredits.toLocaleString()}</td>
              <td style="text-align:right; font-weight:600">KES ${summary.closingBalance.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="section-title">Double-Entry Journal</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Account</th>
              <th>Description</th>
              <th style="text-align:right">Debit</th>
              <th style="text-align:right">Credit</th>
            </tr>
          </thead>
          <tbody>${journalRows || '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px">No journal entries in this period.</td></tr>'}</tbody>
          <tfoot>
            <tr class="trial-row">
              <td colspan="4" style="text-align:right">Journal Totals</td>
              <td style="text-align:right">KES ${journalDebitTotal.toLocaleString()}</td>
              <td style="text-align:right">KES ${journalCreditTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div class="section-title">Unadjusted Trial Balance</div>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Class</th>
              <th style="text-align:right">Debit Balance</th>
              <th style="text-align:right">Credit Balance</th>
            </tr>
          </thead>
          <tbody>${trialBalanceHtml || '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:20px">No account balances in this period.</td></tr>'}</tbody>
          <tfoot>
            <tr class="trial-row">
              <td colspan="2" style="text-align:right">Trial Balance Totals</td>
              <td style="text-align:right">KES ${trialDebitTotal.toLocaleString()}</td>
              <td style="text-align:right">KES ${trialCreditTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        ${debtors.filter(d => d.totalOwed - d.totalPaid !== 0).length > 0 ? `
        <div class="section-title">Debtors Ledger</div>
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Total Owed</th>
              <th>Total Paid</th>
              <th>Remaining Balance</th>
            </tr>
          </thead>
          <tbody>${debtorRows}</tbody>
        </table>` : ''}

        ${creditors.filter(c => c.totalOwed - c.totalPaid !== 0).length > 0 ? `
        <div class="section-title">Creditors Ledger</div>
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>We Owe</th>
              <th>We Paid</th>
              <th>Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>${creditorRows}</tbody>
        </table>` : ''}

        ${transactions.filter(t => t.type === 'collection').length > 0 ? `
        <div class="section-title">Collections Summary</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Collector</th>
              <th>Staff Handing Over</th>
              <th>Method</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.filter(t => t.type === 'collection').map(t => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td>${t.referenceName || '—'}</td>
                <td>${t.operant || '—'}</td>
                <td style="text-transform:capitalize">${t.paymentMethod}</td>
                <td style="text-align:right; font-weight:600">KES ${t.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : ''}

        <div class="footer">
          Official ledger statement generated by ${businessName} Management System.<br/>
          &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${businessName} — Ledger Report`,
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    Alert.alert('Failed to generate PDF:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
