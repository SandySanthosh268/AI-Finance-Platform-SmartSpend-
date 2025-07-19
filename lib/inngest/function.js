import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";
import { sendSMSAlert, sendWhatsAppAlert } from "@/actions/send-alert";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Recurring Transaction Processing
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    if (!event?.data?.transactionId || !event?.data?.userId) return;

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: { id: event.data.transactionId, userId: event.data.userId },
        include: { account: true },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        // 🔄 Create recurring transaction
        const newTxn = await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        // 💰 Update account balance
        const balanceChange = transaction.type === "EXPENSE"
          ? -transaction.amount.toNumber()
          : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        // 🔁 Update last processed + next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(new Date(), transaction.recurringInterval),
          },
        });

        // 🔔 Send Alerts
        const user = await db.user.findUnique({ where: { id: transaction.userId } });
        const amount = transaction.amount.toNumber();
        const isExpense = transaction.type === "EXPENSE";
        const txnTypeLabel = isExpense ? "Expense" : "Income";

        const alertMessage = `🔁 Recurring ${txnTypeLabel} Processed:
₹${amount.toFixed(2)} ${isExpense ? "debited" : "credited"} for ${transaction.description}.
Account: ${transaction.account.name}`;

        if (user?.mobileNumber) {
          await sendSMSAlert(user.mobileNumber, alertMessage);
          await sendWhatsAppAlert(user.mobileNumber, alertMessage);
        }

        await sendEmail({
          to: user.email,
          subject: `Recurring ${txnTypeLabel} Alert`,
          react: EmailTemplate({
            userName: user.name,
            type: "custom",
            data: {
              message: alertMessage,
            },
          }),
        });
      });
    });
  }
);


// 2. Trigger Recurring Transactions
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const transactions = await step.run("fetch-recurring-transactions", async () => {
      return await db.transaction.findMany({
        where: {
          isRecurring: true,
          status: "COMPLETED",
          OR: [{ lastProcessed: null }, { nextRecurringDate: { lte: new Date() } }],
        },
      });
    });

    const events = transactions.map((t) => ({
      name: "transaction.recurring.process",
      data: { transactionId: t.id, userId: t.userId },
    }));

    await inngest.send(events);
    return { triggered: transactions.length };
  }
);

// 3. Generate Monthly Reports
async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: ₹${stats.totalIncome}
    - Total Expenses: ₹${stats.totalExpenses}
    - Net Income: ₹${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: ₹${amount}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", { month: "long" });

        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });

        const income = Number(stats.totalIncome);
        const expenses = Number(stats.totalExpenses);
        const net = income - expenses;

        const smsText = `Hi ${user.name}, your SmartSpend report for ${monthName} is ready:
Income ₹${income.toFixed(2)}, Expenses ₹${expenses.toFixed(2)}, Net Savings ₹${net.toFixed(2)}.
Check the app for insights!`;

        const whatsappText = `📊 SmartSpend Report for ${monthName}:
Income ₹${income.toFixed(2)}, Expenses ₹${expenses.toFixed(2)}, Net ₹${net.toFixed(2)}`;

        if (user.mobileNumber) {
          await sendSMSAlert(user.mobileNumber, smsText);
          await sendWhatsAppAlert(user.mobileNumber, whatsappText);
        }
      });
    }

    return { processed: users.length };
  }
);

// 4. Budget Alerts
export const checkBudgetAlerts = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: { include: { accounts: { where: { isDefault: true } } } },
        },
      });
    });

    for (const budget of budgets) {
      const acc = budget.user.accounts[0];
      if (!acc) continue;

      await step.run(`check-budget-${budget.id}`, async () => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const expenseAgg = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: acc.id,
            type: "EXPENSE",
            date: { gte: start },
          },
          _sum: { amount: true },
        });

        const spent = Number(expenseAgg._sum.amount || 0);
        const budgetAmt = Number(budget.amount);
        const percent = (spent / budgetAmt) * 100;
        const remaining = budgetAmt - spent;

        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
        const now = new Date();
        const lastSent = new Date(budget.lastAlertSent || 0);
        const timeSinceLastAlert = now - lastSent;

        if (percent >= 80 && timeSinceLastAlert >= SIX_HOURS_MS) {
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${acc.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed: percent,
                budgetAmount: budgetAmt,
                totalExpenses: spent,
                accountName: acc.name,
              },
            }),
          });

          const smsText = `Hi ${budget.user.name}, your SmartSpend Budget Alert:
You've used ${percent.toFixed(1)}% of your ₹${budgetAmt.toFixed(2)} budget for ${acc.name}.
Remaining ₹${remaining.toFixed(2)}. Check the app for details!`;

          const whatsappText = `⚠️ SmartSpend Budget Alert:
Account: ${acc.name}
Budget: ₹${budgetAmt.toFixed(2)}
Spent: ₹${spent.toFixed(2)}
Remaining: ₹${remaining.toFixed(2)} (${percent.toFixed(1)}% used)`;

          if (budget.user.mobileNumber) {
            await sendSMSAlert(budget.user.mobileNumber, smsText);
            await sendWhatsAppAlert(budget.user.mobileNumber, whatsappText);
          }

          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        }
      });
    }

    return { checked: budgets.length };
  }
);


// Utility Helpers
function isTransactionDue(t) {
  return !t.lastProcessed || new Date(t.nextRecurringDate) <= new Date();
}

function isNewMonth(last, current) {
  return (
    new Date(last).getMonth() !== current.getMonth() ||
    new Date(last).getFullYear() !== current.getFullYear()
  );
}

function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);
  switch (interval) {
    case "DAILY": next.setDate(next.getDate() + 1); break;
    case "WEEKLY": next.setDate(next.getDate() + 7); break;
    case "MONTHLY": next.setMonth(next.getMonth() + 1); break;
    case "YEARLY": next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

async function getMonthlyStats(userId, month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const txs = await db.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
  });

  return txs.reduce((acc, t) => {
    const amt = Number(t.amount);
    if (t.type === "EXPENSE") {
      acc.totalExpenses += amt;
      acc.byCategory[t.category] = (acc.byCategory[t.category] || 0) + amt;
    } else {
      acc.totalIncome += amt;
    }
    return acc;
  }, {
    totalIncome: 0,
    totalExpenses: 0,
    byCategory: {},
    transactionCount: txs.length,
  });
}
