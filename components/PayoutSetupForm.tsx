"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Bank = { name: string; code: string };

export default function PayoutSetupForm({ alreadyConnected }: { alreadyConnected: boolean }) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/paystack/banks")
      .then((res) => res.json())
      .then((data) => {
        setBanks(data.banks ?? []);
        setLoadingBanks(false);
      })
      .catch(() => setLoadingBanks(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/paystack/create-subaccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, bankCode, accountNumber })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  if (alreadyConnected && !success) {
    return (
      <div className="bg-panel border border-hairline rounded-card p-6">
        <div className="text-sm text-teal font-medium mb-1">✓ Payouts are connected</div>
        <p className="text-paperDim text-[13.5px]">
          Ticket sales for your events settle directly to your bank account via Paystack.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-panel border border-hairline rounded-card p-6">
        <div className="text-sm text-teal font-medium mb-1">✓ Payout account connected</div>
        <p className="text-paperDim text-[13.5px]">
          Future ticket sales on your events will settle straight to this account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] text-paperDim mb-2">Business / organizer name</label>
        <input
          className="field-input"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Lagos Beats Collective"
        />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Bank</label>
        <select className="field-input" value={bankCode} onChange={(e) => setBankCode(e.target.value)} disabled={loadingBanks}>
          <option value="">{loadingBanks ? "Loading banks..." : "Select your bank"}</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Account number</label>
        <input
          className="field-input"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="10-digit NUBAN account number"
          maxLength={10}
        />
      </div>

      {error && <div className="text-[13px] text-coral">{error}</div>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Connecting..." : "Connect payout account"}
      </button>

      <p className="text-[12px] text-paperDim">
        Ticket money from your events will pay out to this account automatically. Partaey keeps a small
        percentage on each sale; the rest settles to you.
      </p>
    </form>
  );
}