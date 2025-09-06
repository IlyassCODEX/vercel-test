"use client";
import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!domain) return;
    setLoading(true);
    setResult(null);

    const res = await fetch(`/api/dns?domain=${domain}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 text-gray-800 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">🔍 Subdomain & DNS Lookup</h1>
        <input
          type="text"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition w-full"
        >
          {loading ? "Searching..." : "Search"}
        </button>

        {result && (
          <div className="mt-6 text-left">
            <h2 className="font-semibold">Domain: {result.domain}</h2>
            <h3 className="mt-2 font-semibold">DNS Records:</h3>
            <pre className="bg-gray-200 p-2 rounded">{JSON.stringify(result.dnsRecords, null, 2)}</pre>
            <h3 className="mt-2 font-semibold">Subdomains:</h3>
            <ul className="list-disc pl-6">
              {result.subdomains.slice(0, 20).map((sub, idx) => (
                <li key={idx}>{sub}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}