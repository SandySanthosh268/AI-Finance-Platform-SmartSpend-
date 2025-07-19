import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { parse } from "papaparse";

// 🔍 Smart date parser for multiple formats
function parseSmartDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split(/[-/]/).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  let [a, b, c] = parts;

  // yyyy-mm-dd or yyyy/dd/mm
  if (a > 1900 && c <= 31) return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
  // dd-mm-yyyy or dd/mm/yyyy
  if (c > 1900) return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  // mm-dd-yyyy fallback
  return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
}

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const filename = file.name?.toLowerCase() || "";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let transactions = [];

    if (filename.endsWith(".pdf")) {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;

      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      for (const line of lines) {
        // Example: 02/07/2025 Uber Ride -150.00
        const match = line.match(/^(\d{2}[/-]\d{2}[/-]\d{4})\s+(.*?)\s+(-?\d+(\.\d+)?)/);

        if (match) {
          const [_, rawDate, desc, amt] = match;
          const date = parseSmartDate(rawDate);
          const amount = parseFloat(amt);
          const type = amount < 0 ? "EXPENSE" : "INCOME";

          transactions.push({
            date,
            description: desc,
            amount: Math.abs(amount),
            type,
          });
        }
      }
    } else if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      const result = parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      for (const row of result.data) {
        const rawDate =
          row["Txn Date"] || row["Transaction Date"] || row["Date"] || row["date"];
        const description =
          row["Narration"] || row["Details"] || row["Description"] || row["Particulars"] || row["Transaction Description"] || row["description"] || "";
        const debit = parseFloat(
          row["Debit"] || row["Withdrawal Amt"] || row["Dr"] || row["debit"] || "0"
        );
        const credit = parseFloat(
          row["Credit"] || row["Deposit Amt"] || row["Cr"] || row["credit"] || "0"
        );

        const amount = debit > 0 ? debit : credit;
        const type = debit > 0 ? "EXPENSE" : "INCOME";

        const date = parseSmartDate(rawDate);

        if (!isNaN(amount) && date) {
          transactions.push({
            date,
            description,
            amount: parseFloat(amount.toFixed(2)),
            type,
          });
        }
      }
    } else {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 });
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No transactions parsed" }, { status: 400 });
    }

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("Bank Parse Error:", err);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
