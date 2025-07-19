import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultCategories } from "@/data/categories";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_CATEGORY_IDS = defaultCategories.map((cat) => cat.id);

/**
 * Suggests a transaction category based on description using Gemini AI
 * @param {string} description - The transaction description (e.g., "Uber to Airport")
 * @returns {string} - The most appropriate category ID or "other-expense"
 */
export async function suggestCategoryAI(description = "") {
  if (!description) return "other-expense";

  const prompt = `
You are a smart assistant for a personal finance app.

Your task is to classify the following transaction into one of the predefined category IDs below.
Only return **one** of the category IDs listed.

Category IDs:
${VALID_CATEGORY_IDS.map((id) => `- ${id}`).join("\n")}

Transaction:
"${description}"

Respond with only the category ID. Do not include any explanations.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const category = (await result.response.text()).trim();

    return VALID_CATEGORY_IDS.includes(category) ? category : "other-expense";
  } catch (err) {
    console.error("❌ AI category suggestion failed:", err.message);
    return "other-expense";
  }
}
