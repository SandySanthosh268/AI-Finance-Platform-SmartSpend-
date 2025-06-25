"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";

export default function ImportClient({ accounts }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const userId = accounts[0]?.userId;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !accountId || !userId) {
      toast.error("Missing file, account, or user ID");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", accountId);
    formData.append("userId", userId);

    const res = await fetch("/api/import-csv", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`${data.count} transactions imported!`);
      router.push("/dashboard");
    } else {
      toast.error("Import failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title">Import Transactions</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Select */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select defaultValue={accountId} onValueChange={setAccountId}>
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
                  className="w-full text-left text-sm py-1.5"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>
        </div>

        {/* File Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Choose CSV File</label>
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        </div>

        {/* Buttons */}
        <div className="pt-4 flex gap-4">
          <Button type="submit" className="flex-1">Import</Button>
          <Link href="/dashboard" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
