export function formatCurrency(amount) {
    if (typeof amount !== "number") amount = parseFloat(amount);
    return amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
  }
  