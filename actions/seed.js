import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTransactions() {
  try {
    // Find a user to associate with seed data (adjust as needed)
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error("No user found to seed transactions for.");
    }

    // Find a default account or create one
    let account = await prisma.account.findFirst({
      where: { userId: user.id, isDefault: true },
    });

    if (!account) {
      account = await prisma.account.create({
        data: {
          name: "Default Account",
          type: "CURRENT",
          balance: 1000,
          isDefault: true,
          userId: user.id,
        },
      });
    }

    // Seed some transactions
    await prisma.transaction.createMany({
      data: [
        {
          type: "EXPENSE",
          amount: 50.75,
          description: "Grocery Shopping",
          date: new Date(),
          category: "Food",
          userId: user.id,
          accountId: account.id,
          status: "COMPLETED",
          isRecurring: false,
        },
        {
          type: "INCOME",
          amount: 1500,
          description: "Monthly Salary",
          date: new Date(),
          category: "Salary",
          userId: user.id,
          accountId: account.id,
          status: "COMPLETED",
          isRecurring: false,
        },
      ],
    });

    return { message: "Seeded transactions successfully for user " + user.email };
  } catch (error) {
    console.error("❌ Seed Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
