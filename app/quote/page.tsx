"use client";

import { useState, type FormEvent } from "react";

export default function QuotePage() {
  const [customerName, setCustomerName] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, workDescription, amount }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "PDFの生成に失敗しました");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `見積書_${customerName || "無題"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDFの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col gap-8 bg-white px-8 py-12 dark:bg-black sm:px-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            見積書生成ツール
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            必要事項を入力してPDFの見積書を生成します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="customerName"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              依頼主名
            </label>
            <input
              id="customerName"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="山田 太郎"
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:border-white/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="workDescription"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              工事内容
            </label>
            <textarea
              id="workDescription"
              required
              rows={4}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="キッチンリフォーム一式"
              className="resize-none rounded-md border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:border-white/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="amount"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              金額（円）
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500000"
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:focus:border-white/40"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isGenerating}
            className="flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {isGenerating ? "生成中..." : "PDFを生成"}
          </button>
        </form>
      </main>
    </div>
  );
}
