// app/api/preview-categories/route.js
import { suggestCategories } from "@/lib/ai/route";

export async function POST(req) {
  try {
    const { rows } = await req.json();

    const payload = rows.map(({ description, type }) => ({
      description,
      type,
    }));

    const categories = await suggestCategories(payload);

    return Response.json({ categories });
  } catch (err) {
    console.error("Preview Categories API Error:", err);
    return Response.json({ categories: [] });
  }
}
