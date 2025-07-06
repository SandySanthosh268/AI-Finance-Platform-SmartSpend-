// app/api/preview-categories/route.js
import { suggestCategories } from "@/lib/ai/route";
import { getCategoryIdFromName } from "@/lib/utils/getCategoryIdFromName";

export async function POST(req) {
  try {
    const { rows } = await req.json();

    const payload = rows.map(({ description, type }) => ({
      description,
      type,
    }));

    const names = await suggestCategories(payload);
    const categories = names.map(getCategoryIdFromName); // Convert to internal ID

    return Response.json({ categories });
  } catch (err) {
    console.error("Preview Categories API Error:", err);
    return Response.json({ categories: [] });
  }
}
