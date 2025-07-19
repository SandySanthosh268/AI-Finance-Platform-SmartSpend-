import { NextResponse } from "next/server";
import { parse } from "papaparse";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { defaultCategories } from "@/data/categories";
import { suggestCategoryAI } from "@/lib/ai/detect-category";

// 🔍 Normalize bank format fields
function normalizeBankRow(row) {
  const date =
    row["Txn Date"] || row["Transaction Date"] || row["Date"] || row["Value Date"] || row["DATE"] || row["date"];

  const description =
    row["Narration"] || row["Details"] || row["Description"] || row["Particulars"] || row["Transaction Description"] || row["description"] || "";

  const debit = parseFloat(row["Debit"] || row["Withdrawal Amt"] || row["Dr"] || row["debit"] || "0");
  const credit = parseFloat(row["Credit"] || row["Deposit Amt"] || row["Cr"] || row["credit"] || "0");

  const amount = debit > 0 ? debit : credit;
  const type = debit > 0 ? "EXPENSE" : "INCOME";

  return { date, description, amount: amount?.toFixed(2), type };
}

// 🔠 Category mapping
function buildCategoryMap() {
  const map = {};
  for (const cat of defaultCategories) {
    const key = cat.name.toLowerCase().replace(/[-_]/g, " ");
    map[key] = cat.id;
  }
  return map;
}

// 🧠 Keyword category detection
function detectCategory(description = "", map) {
  const lower = description.toLowerCase();
  for (const key in map) {
    if (lower.includes(key)) return map[key];
  }
  return "other-expense";
}

// 🧠 Smart date parser (handles dd-mm-yyyy, mm/dd/yyyy, yyyy-mm-dd, etc.)
function parseSmartDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[-/]/).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  let [a, b, c] = parts;
  if (a > 31) return new Date(`${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`);
  if (c > 1900) return new Date(`${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`);
  return new Date(`${b}-${String(a).padStart(2, "0")}-${String(c).padStart(2, "0")}`);
}

// 🧾 Parse CSV
function parseCSV(text) {
  return new Promise((resolve) => {
    parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
    });
  });
}

export async function POST(req) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    const accountId = formData.get("accountId");

    if (!file || !accountId)
      return NextResponse.json({ error: "Missing file or account" }, { status: 400 });

    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
    });
    if (!account)
      return NextResponse.json({ error: "Account not found" }, { status: 403 });

    const text = await file.text();
    const rawRows = await parseCSV(text);
    const categoryMap = buildCategoryMap();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = [];
    let balanceChange = 0;

    for (const raw of rawRows) {
      const row = raw.amount ? raw : normalizeBankRow(raw);
      const amount = parseFloat(row.amount);
      const parsedDate = parseSmartDate(row.date);

      if (!amount || isNaN(amount) || !parsedDate || parsedDate > today) continue;

      const type = row.type?.toUpperCase?.() || "EXPENSE";
      const description = row.description || "";
      let category = row.category?.trim().toLowerCase();

      if (!category) category = detectCategory(description, categoryMap);
      if (!category || category === "other-expense")
        category = await suggestCategoryAI(description);

      transactions.push({
        userId: user.id,
        accountId: account.id,
        type,
        amount,
        description,
        date: parsedDate,
        category,
        status: "COMPLETED",
      });

      balanceChange += type === "EXPENSE" ? -amount : amount;
    }

    if (transactions.length === 0)
      return NextResponse.json({ error: "No valid transactions parsed." }, { status: 400 });

    await db.$transaction([
      db.transaction.createMany({ data: transactions }),
      db.account.update({
        where: { id: account.id },
        data: { balance: { increment: balanceChange } },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath(`/account/${account.id}`);

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (err) {
    console.error("CSV Import Error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
