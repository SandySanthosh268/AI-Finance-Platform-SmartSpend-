//app\(main)\import\import-bank\import-bank-client.jsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function ImportBankClient() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/parse-bank", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setParsedData(result.transactions || []);
      toast.success(`Parsed ${result.transactions.length} transactions`);
    } catch (err) {
      toast.error(err.message || "Failed to parse bank statement");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const header = ["date", "description", "amount", "type"];
    const rows = parsedData.map((t) =>
      [t.date, t.description, t.amount, t.type].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bank-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Import Bank Statement</h1>

      <Input type="file" accept=".pdf,.txt" onChange={handleFileUpload} />

      {parsedData.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Preview ({parsedData.length} transactions)
            </h2>
            <Button onClick={downloadCSV}>Download as CSV</Button>
          </div>

          <div className="overflow-auto border rounded">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Description</th>
                  <th className="p-2 border">Amount</th>
                  <th className="p-2 border">Type</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{row.date}</td>
                    <td className="p-2 border">{row.description}</td>
                    <td className="p-2 border">{formatCurrency(row.amount)}</td>
                    <td className="p-2 border">{row.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
