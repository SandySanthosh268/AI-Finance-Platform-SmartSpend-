import Link from "next/link";
import { getUserAccounts } from "@/actions/dashboard";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default async function ImportPage() {
  const accounts = await getUserAccounts();
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id;

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title">Import Transactions</h1>
      </div>

      {/* Account Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Account</label>
        <Select defaultValue={defaultAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({formatCurrency(account.balance)})
              </SelectItem>
            ))}
            <CreateAccountDrawer>
              <Button
                variant="ghost"
                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                Create Account
              </Button>
            </CreateAccountDrawer>
          </SelectContent>
        </Select>
      </div>

      {/* Format Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Format</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Choose File */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Choose File</label>
        <Input type="file" accept=".csv, application/pdf" />
      </div>

      {/* Action Buttons */}
{/* Action Buttons */}
<div className="pt-4 flex gap-4">
  <Button className="flex-1">Import</Button>
  <Link href="/dashboard" className="flex-1">
    <Button type="button" variant="outline" className="w-full">
      Cancel
    </Button>
  </Link>
</div>
    </div>
  );
}