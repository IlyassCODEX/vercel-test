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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl bg-white border rounded-lg shadow-md p-6">
        <h1 className="text-xl font-bold mb-4 text-center">
          🔍 Subdomain & DNS Lookup
        </h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1 border p-2 rounded-md"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {result && (
          <div className="space-y-4 text-sm">
            <div>
              <h2 className="font-semibold mb-1">Domain:</h2>
              <p className="break-words">{result.domain}</p>
            </div>

            <div>
              <h2 className="font-semibold mb-1">DNS Records:</h2>
              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(result.dnsRecords, null, 2)}
              </pre>
            </div>

            <div>
              <h2 className="font-semibold mb-1">Subdomains:</h2>
              {result.subdomains.length > 0 ? (
                <ul className="list-disc pl-6 space-y-1">
                  {result.subdomains.slice(0, 30).map((sub, idx) => (
                    <li key={idx} className="break-words">
                      {sub}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No subdomains found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}