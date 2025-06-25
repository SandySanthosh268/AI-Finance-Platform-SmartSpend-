import { getUserAccounts } from "@/actions/dashboard";
import ImportClient from "./import-client";

export default async function ImportPage() {
  const accounts = await getUserAccounts();
  return <ImportClient accounts={accounts} />;
}
