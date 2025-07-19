// app/api/preview-categories/route.js

import { suggestCategories } from "@/lib/ai/route";
import { getCategoryIdFromName } from "@/lib/utils/getCategoryIdFromName";

export async function POST(req) {
  try {
    const { rows } = await req.json();

    // ✅ Basic validation
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: "No transaction rows provided." }, { status: 400 });
    }

    // 🔁 Prepare payload for AI suggestion
    const payload = rows.map(({ description, type }) => ({
      description,
      type,
    }));

    // 🤖 Get category names using AI
    const names = await suggestCategories(payload);

    // 🔁 Convert category names to internal category IDs
    const categories = names.map((name) => getCategoryIdFromName(name));

    return Response.json({ categories });
  } catch (err) {
    console.error("Preview Categories API Error:", err);
    return Response.json({ categories: [] });
  }
}
