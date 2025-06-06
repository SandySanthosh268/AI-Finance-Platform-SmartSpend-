export const dynamic = "force-dynamic";

import { seedTransactions } from "@/actions/seed";

export async function GET() {
  try {
    const result = await seedTransactions();
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
