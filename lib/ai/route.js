// lib/ai/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function suggestCategories(transactions) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You're an AI assistant that categorizes financial transactions based on description and type.

Return an array of categories for each transaction in this format:
["Category1", "Category2", "Category3", ...]

Choose from:
["Housing", "Transportation", "Groceries", "Utilities", "Entertainment", "Food", "Shopping", "Healthcare", "Education", "Personal", "Travel", "Insurance", "Gifts", "Bills", "Salary", "Other Expenses"]

Transactions:
${JSON.stringify(transactions, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const text = await result.response.text();
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("AI Category JSON Parse Error:", err);
    return transactions.map(() => "Other Expenses");
  }
}
