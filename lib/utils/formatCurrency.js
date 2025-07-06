export function formatCurrency(amount) {
  if (typeof amount !== "number") amount = parseFloat(amount);
  if (isNaN(amount)) return "₹0.00";

  // Fix floating point issue
  amount = Math.round((amount + Number.EPSILON) * 100) / 100;

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
