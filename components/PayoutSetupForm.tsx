"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Bank = { name: string; code: string };

export default function PayoutSetupForm({
  alreadyConnected,
  accountName
}: {
  alreadyConnected: boolean;
  accountName?: string | null;
}) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    const selectedBank = banks.find((b) => b.code === bankCode);

    const res = await fetch("/api/paystack/create-recipient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        bankCode,
        bankName: selectedBank?.name ?? "",
        accountNumber
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setSuccess(data.accountName);
    router.refresh();
  }

  if ((alreadyConnected && !success)) {
    return (
      <div className="bg-panel border border-hairline rounded-card p-6">
        <div className="text-sm text-teal font-medium mb-1">✓ Payout account connected</div>
        {accountName && <p className="text-paperDim text-[13.5px] mb-2">{accountName}</p>}
        <p className="text-paperDim text-[13.5px]">
          Ticket money is held by Partaey until a few days after your event, then paid out to this account
          automatically.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-panel border border-hairline rounded-card p-6">
        <div className="text-sm text-teal font-medium mb-1">✓ Account connected — {success}</div>
        <p className="text-paperDim text-[13.5px]">
          Ticket money is held by Partaey until a few days after your event, then paid out here automatically.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-panel2 border border-dashed border-hairline rounded-card p-4 text-[13px] text-paperDim">
        Ticket money isn't paid out instantly. Partaey holds it until a few days after your event happens, then
        transfers your share here automatically. This protects buyers from fake listings.
      </div>

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
    </form>
  );
}