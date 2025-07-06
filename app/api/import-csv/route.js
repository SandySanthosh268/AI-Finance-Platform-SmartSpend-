// app/api/import-csv/route.js
import { NextResponse } from "next/server";
import { parse } from "papaparse";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { defaultCategories } from "@/data/categories";
import { suggestCategoryAI } from "@/lib/ai/detect-category";

function buildCategoryMap() {
  const map = {};
  for (const category of defaultCategories) {
    const key = category.name.toLowerCase().replace(/[-_]/g, " ");
    map[key] = category.id;
  }
  return map;
}

function detectCategory(description = "", map) {
  const lowerDesc = description.toLowerCase();
  for (const key in map) {
    if (lowerDesc.includes(key)) return map[key];
  }
  return "other-expense";
}

// 🧠 Smart date parser
function parseSmartDate(dateStr) {
  const parts = dateStr.split(/[-/]/).map(p => parseInt(p));
  if (parts.length !== 3) return null;

  let [a, b, c] = parts;
  if (c > 31) {
    // yyyy-mm-dd or yyyy-dd-mm
    return new Date(dateStr);
  } else if (a > 31) {
    return new Date(`${a}-${b}-${c}`); // yyyy-mm-dd
  } else if (b > 12) {
    return new Date(`${c}-${b}-${a}`); // dd-mm-yyyy
  } else {
    return new Date(`${b}-${a}-${c}`); // mm-dd-yyyy fallback
  }
}

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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
    });
    if (!account)
      return NextResponse.json({ error: "Account not found" }, { status: 403 });

    const text = await file.text();
    const rows = await parseCSV(text);
    const keywordMap = buildCategoryMap();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = [];
    let balanceChange = 0;

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      const parsedDate = parseSmartDate(row.date);

      if (!amount || isNaN(amount) || !parsedDate || parsedDate > today)
        continue;

      const type = row.type.toUpperCase();
      const description = row.description || "";
      let category = row.category?.trim().toLowerCase();

      if (!category) category = detectCategory(description, keywordMap);
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

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found." }, { status: 400 });
    }

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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
