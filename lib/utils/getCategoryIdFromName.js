// lib/utils/getCategoryIdFromName.js
import { defaultCategories } from "@/data/categories";

/**
 * Convert a category name to a valid internal ID from defaultCategories.
 * Case-insensitive. Returns 'other-expense' if no match is found.
 */
export function getCategoryIdFromName(name = "") {
  if (!name) return "other-expense";
  const match = defaultCategories.find(
    (cat) => cat.name.toLowerCase() === name.toLowerCase()
  );
  return match?.id || "other-expense";
}
