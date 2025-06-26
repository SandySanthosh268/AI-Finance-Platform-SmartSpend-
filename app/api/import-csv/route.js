import { NextResponse } from "next/server";
import { parse } from "papaparse";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { defaultCategories } from "@/data/categories";
import { suggestCategoryAI } from "@/lib/ai/detect-category";

// 1. Keyword-based category matching
function buildCategoryMap() {
  const map = {};
  for (const category of defaultCategories) {
    const key = category.name.toLowerCase().replace(/[-_]/g, " ");
    map[key] = category.id; // Use ID for consistency
  }
  return map;
}

function detectCategory(description = "", map) {
  const lowerDesc = description.toLowerCase();
  for (const key in map) {
    if (lowerDesc.includes(key)) {
      return map[key];
    }
  }
  return "other-expense"; // fallback
}

// 2. CSV Parser
function parseCSV(text) {
  return new Promise((resolve) => {
    parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
    });
  });
}

// 3. Route Handler
export async function POST(req) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    const accountId = formData.get("accountId");

    if (!file || !accountId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const account = await db.account.findUnique({
      where: {
        id: accountId,
        userId: user.id,
      },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 403 });

    const text = await file.text();
    const rows = await parseCSV(text);
    const keywordMap = buildCategoryMap();

    const validTransactions = [];
    let balanceChange = 0;

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (!row.amount || !row.date || !row.type || isNaN(amount)) continue;

      const type = row.type.toUpperCase();
      const description = row.description || "";
      let category = row.category?.trim().toLowerCase();

      if (!category) {
        category = detectCategory(description, keywordMap); // Keyword
      }

      if (!category || category === "other-expense") {
        category = await suggestCategoryAI(description); // AI fallback
      }

      // Transaction insert
      const transaction = await db.transaction.create({
        data: {
          type,
          amount,
          description,
          date: new Date(row.date),
          category,
          userId: user.id,
          accountId: account.id,
          status: "COMPLETED",
        },
      });

      // Update balance
      const change = type === "EXPENSE" ? -amount : amount;
      balanceChange += change;
    }

    // Apply balance update at once
    await db.account.update({
      where: { id: account.id },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${account.id}`);

    return NextResponse.json({
      success: true,
      message: "CSV imported successfully",
    });
  } catch (err) {
    console.error("CSV Import Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
