// lib/ai/detect-category.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultCategories } from "@/data/categories";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_CATEGORY_IDS = defaultCategories.map((cat) => cat.id);

export async function suggestCategoryAI(description = "") {
  if (!description) return "other-expense";

  const prompt = `
You're a smart assistant that classifies this transaction into one of these category IDs:

${VALID_CATEGORY_IDS.map((id) => `- ${id}`).join("\n")}

Transaction:
"${description}"

Return just one category ID from the list above.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim().toLowerCase();

    return VALID_CATEGORY_IDS.includes(category) ? category : "other-expense";
  } catch (err) {
    console.error("AI category suggestion failed:", err);
    return "other-expense";
  }
}
