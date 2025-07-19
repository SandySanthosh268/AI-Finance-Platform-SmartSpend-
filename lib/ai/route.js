import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultCategories } from "@/data/categories";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_CATEGORY_IDS = defaultCategories.map((cat) => cat.id);

// 🔁 Fallback Keyword Matching if AI quota fails
function basicKeywordFallback(description = "") {
  const desc = description.toLowerCase();

  if (desc.includes("zomato") || desc.includes("swiggy") || desc.includes("domino")) return "food";
  if (desc.includes("uber") || desc.includes("ola") || desc.includes("petrol") || desc.includes("fuel")) return "transportation";
  if (desc.includes("amazon") || desc.includes("flipkart") || desc.includes("shopping")) return "shopping";
  if (desc.includes("salary") || desc.includes("credited") || desc.includes("payroll")) return "salary";
  if (desc.includes("rent") || desc.includes("housing")) return "housing";
  if (desc.includes("electricity") || desc.includes("gas") || desc.includes("internet") || desc.includes("wifi")) return "utilities";
  if (desc.includes("phone") || desc.includes("recharge") || desc.includes("mobile")) return "utilities";
  if (desc.includes("hospital") || desc.includes("medical") || desc.includes("pharmacy")) return "healthcare";
  if (desc.includes("school") || desc.includes("tuition") || desc.includes("course")) return "education";

  return "other-expense";
}

export async function suggestCategories(transactions) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a financial assistant AI.

You must classify each of the following transactions into a category ID from the list below.

Valid Category IDs:
${VALID_CATEGORY_IDS.map((id) => `- ${id}`).join("\n")}

Each transaction includes a description and type (INCOME or EXPENSE).

Return the result strictly as a JSON array of category IDs in order:
["salary", "shopping", "groceries", "other-expense"]

Transactions:
${JSON.stringify(transactions, null, 2)}

Do not include any extra text, explanation, or formatting. Only return the JSON array.
`;

  try {
    const { response } = await model.generateContent(prompt);
    const raw = await response.text();

    const cleaned = raw.trim().replace(/^[^\[]*/, "").replace(/[^\]]*$/, "");
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error("AI returned non-array");

    return parsed.map((cat) =>
      VALID_CATEGORY_IDS.includes(cat.toLowerCase()) ? cat.toLowerCase() : "other-expense"
    );
  } catch (err) {
    console.error("❌ AI Category JSON Parse Error or Quota Exceeded:", err);

    // 🔁 Fallback to keyword matching
    return transactions.map(({ description }) => basicKeywordFallback(description));
  }
}
