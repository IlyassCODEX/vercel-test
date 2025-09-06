"use client";
import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [info, setInfo] = useState(null);
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);

  async function scanTech() {
    if (!domain) return;
    setLoading(true);
    setInfo(null);
    const res = await fetch(`/api/tech?domain=${encodeURIComponent(domain)}`);
    const data = await res.json();
    setInfo(data);
    setLoading(false);
  }

  async function scanSubs() {
    if (!domain) return;
    setLoading(true);
    setSubs(null);
    const res = await fetch(`/api/subdomains?domain=${encodeURIComponent(domain)}`);
    const data = await res.json();
    setSubs(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-3xl bg-white border rounded-lg shadow p-6 space-y-6">
        <h1 className="text-xl font-semibold text-center">
          OSINT Scanner (Techs, IPs & Subdomains)
        </h1>

        {/* Input + buttons */}
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md p-2"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button
            onClick={scanTech}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-black text-white"
          >
            {loading ? "..." : "Scan Tech/IP"}
          </button>
          <button
            onClick={scanSubs}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-gray-700 text-white"
          >
            {loading ? "..." : "Find Subdomains"}
          </button>
        </div>

        {/* Results: Tech/IP */}
        {info && (
          <div className="space-y-4 text-sm">
            <div>
              <h2 className="font-medium">Resolved IPs</h2>
              <div className="bg-gray-100 rounded p-2">
                <div><span className="font-mono">A</span>: {info.ips?.A?.join(", ") || "—"}</div>
                <div><span className="font-mono">AAAA</span>: {info.ips?.AAAA?.join(", ") || "—"}</div>
              </div>
            </div>

            <div>
              <h2 className="font-medium mt-4">Technologies Detected</h2>
                  {info.technologies?.length ? (
                    <ul className="list-disc pl-6">
                      {info.technologies.map((app, i) => (
                        <li key={i} className="break-words">
                          <span className="font-semibold">{app.app}</span>
                          {app.version && <span className="ml-2">v{app.version}</span>}
                          {app.categories?.length && (
                            <span className="ml-2 text-gray-600">
                              ({app.categories.join(", ")})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No technologies detected.</p>
                  )}
            </div>
          </div>
        )}

        {/* Results: Subdomains */}
        {subs && (
          <div className="space-y-2 text-sm">
            <h2 className="font-medium">Discovered Subdomains</h2>
            {subs.subdomains?.length ? (
              <ul className="list-disc pl-6">
                {subs.subdomains.map((s, i) => (
                  <li key={i}>
                    <span className="font-mono">{s.subdomain}</span>
                    {s.ips?.length > 0 && (
                      <span className="ml-2 text-gray-500">→ {s.ips.join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No common subdomains found.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
