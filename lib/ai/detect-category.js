import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function suggestCategoryAI(description = "") {
  if (!description) return "other-expense";

  const prompt = `
Suggest a spending category for the following transaction:
"${description}"

Available categories:
housing, transportation, groceries, utilities, entertainment, food, shopping, healthcare, education, personal, travel, insurance, gifts, bills, other-expense

Return only one category string from the list.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim().toLowerCase();

    const valid = [
      "housing", "transportation", "groceries", "utilities", "entertainment",
      "food", "shopping", "healthcare", "education", "personal", "travel",
      "insurance", "gifts", "bills", "other-expense"
    ];

    return valid.includes(category) ? category : "other-expense";
  } catch (err) {
    console.error("AI category suggestion failed:", err);
    return "other-expense";
  }
}
