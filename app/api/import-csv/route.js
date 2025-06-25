import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { parse } from "papaparse";

// Helper to parse CSV text
function parseCSV(csvText) {
  return new Promise((resolve) => {
    parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
    });
  });
}

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("file");
  const accountId = formData.get("accountId");
  const userId = formData.get("userId");

  if (!file || !accountId || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const text = await file.text();
  const transactions = await parseCSV(text);
  const created = [];

  for (const tx of transactions) {
    if (!tx.amount || !tx.date || !tx.category || !tx.type) continue;

    const amount = parseFloat(tx.amount);
    if (isNaN(amount)) continue;

    try {
      const transaction = await db.transaction.create({
        data: {
          type: tx.type.toUpperCase(), // "INCOME" or "EXPENSE"
          amount,
          description: tx.description || "",
          date: new Date(tx.date),
          category: tx.category,
          userId,
          accountId,
          status: "COMPLETED", // 🔥 Required field in Prisma schema
        },
      });

      created.push(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error.message);
    }
  }

  return NextResponse.json({ success: true, count: created.length });
}
