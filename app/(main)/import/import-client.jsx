"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
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
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setLoading(true);

    try {
      const text = await selectedFile.text();
      const { data: rows } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      // Send to Gemini-based category suggestion API
      const res = await fetch("/api/preview-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const { categories } = await res.json();

      const preview = rows.map((row, idx) => ({
        ...row,
        category: categories?.[idx] || "Other Expenses",
      }));

      setPreviewData(preview);
    } catch (err) {
      toast.error("Failed to generate preview");
      console.error("Preview Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !accountId) {
      toast.error("Missing file or account");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", accountId);

    setLoading(true);
    const res = await fetch("/api/import-csv", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      toast.success(`${data.count} transactions imported!`);
      router.push("/dashboard");
    } else {
      toast.error(data.error || "Import failed");
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
          <Select value={accountId} onValueChange={setAccountId}>
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
          <Input type="file" accept=".csv" onChange={handleFileChange} />
        </div>

        {/* Preview Table */}
        {previewData.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/40 space-y-3">
            <div className="text-lg font-medium text-red-600 flex items-center gap-2">
              📂 Preview Transactions
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      <td className="p-2 border">{row.date}</td>
                      <td className="p-2 border">{row.description}</td>
                      <td className="p-2 border">{formatCurrency(row.amount)}</td>
                      <td className="p-2 border">{row.type}</td>
                      <td className="p-2 border">{row.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-4 flex gap-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Importing..." : "Confirm Import"}
          </Button>
          <Link href="/dashboard" className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
