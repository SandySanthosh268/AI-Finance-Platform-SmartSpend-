import { parse } from "papaparse";

// 🧠 Normalize bank CSV into standard transaction format
export async function parseBankCSV(text) {
  return new Promise((resolve) => {
    parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const transactions = result.data.map((row) => {
          const date =
            row["Transaction Date"] || row["Txn Date"] || row["Date"] || row["Value Date"] || row["DATE"] || "";

          const description =
            row["Narration"] || row["Details"] || row["Description"] || row["Particulars"] || row["Transaction Description"] || "";

          const debit = parseFloat(row["Debit"] || row["Withdrawal Amt"] || row["Dr"] || row["debit"] || "0");
          const credit = parseFloat(row["Credit"] || row["Deposit Amt"] || row["Cr"] || row["credit"] || "0");
          const amountField = parseFloat(row["Amount"] || "0");

          const amount = amountField > 0 ? amountField : debit > 0 ? debit : credit;
          const type = debit > 0 ? "EXPENSE" : "INCOME";

          return {
            date: date.trim(),
            description: description.trim(),
            amount: parseFloat(amount.toFixed(2)),
            type,
            category: "",
          };
        });

        resolve(transactions.filter((t) => t.date && !isNaN(t.amount)));
      },
    });
  });
}
