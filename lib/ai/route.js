// lib/ai/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultCategories } from "@/data/categories";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_CATEGORY_IDS = defaultCategories.map((cat) => cat.id);

export async function suggestCategories(transactions) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You're a financial assistant AI that categorizes each transaction into a single category ID from the list below.

Valid category IDs:
${VALID_CATEGORY_IDS.map((id) => `- ${id}`).join("\n")}

Each transaction has a description and type (INCOME or EXPENSE).

Return the result as a JSON array of category IDs like:
["groceries", "salary", "food", "other-expense"]

Transactions:
${JSON.stringify(transactions, null, 2)}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate against allowed IDs
    return parsed.map((cat) =>
      VALID_CATEGORY_IDS.includes(cat.toLowerCase()) ? cat.toLowerCase() : "other-expense"
    );
  } catch (err) {
    console.error("AI Category JSON Parse Error:", err);
    return transactions.map(() => "other-expense");
  }
}
