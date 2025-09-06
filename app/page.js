"use client";
import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [info, setInfo] = useState(null);
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function scanTech() {
    if (!domain) {
      setError("Please enter a domain");
      return;
    }
    
    setLoading(true);
    setInfo(null);
    setError("");
    
    try {
      const res = await fetch(`/api/tech?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) {
        throw new Error(`Scan failed: ${res.status}`);
      }
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      setError(err.message);
      console.error("Scan error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function scanSubs() {
    if (!domain) {
      setError("Please enter a domain");
      return;
    }
    
    setLoading(true);
    setSubs(null);
    setError("");
    
    try {
      const res = await fetch(`/api/subdomains?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) {
        throw new Error(`Subdomain scan failed: ${res.status}`);
      }
      const data = await res.json();
      setSubs(data);
    } catch (err) {
      setError(err.message);
      console.error("Subdomain scan error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-3xl bg-white border rounded-lg shadow p-6 space-y-6">
        <h1 className="text-xl font-semibold text-center">
          OSINT Scanner (Techs, IPs & Subdomains)
        </h1>

        {/* Error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Input + buttons */}
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md p-2"
            placeholder="example.com"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setError("");
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') scanTech();
            }}
          />
          <button
            onClick={scanTech}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-black text-white disabled:bg-gray-400"
          >
            {loading ? "Scanning..." : "Scan Tech/IP"}
          </button>
          <button
            onClick={scanSubs}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-gray-700 text-white disabled:bg-gray-400"
          >
            {loading ? "Scanning..." : "Find Subdomains"}
          </button>
        </div>

        {/* Results: Tech/IP */}
        {info && (
          <div className="space-y-4 text-sm">
            <div>
              <h2 className="font-medium text-lg mb-2">Domain Information</h2>
              <div className="bg-gray-100 rounded p-3">
                <div className="font-mono text-blue-600">{info.domain}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Scanned: {new Date(info.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-medium text-lg mb-2">Resolved IPs</h2>
              <div className="bg-gray-100 rounded p-3">
                <div className="mb-2">
                  <span className="font-mono text-purple-600">A Records</span>: 
                  {info.ips?.A?.length ? (
                    <div className="ml-2">
                      {info.ips.A.map((ip, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                          {ip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="ml-2 text-gray-500">—</span>
                  )}
                </div>
                <div>
                  <span className="font-mono text-purple-600">AAAA Records</span>: 
                  {info.ips?.AAAA?.length ? (
                    <div className="ml-2">
                      {info.ips.AAAA.map((ip, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
                          {ip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="ml-2 text-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-medium text-lg mb-2">Technologies Detected</h2>
              {info.technologies?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {info.technologies.map((tech, i) => (
                    <div key={i} className="bg-gray-50 border rounded p-3">
                      <div className="font-semibold text-blue-700">{tech.app}</div>
                      {tech.version && (
                        <div className="text-sm text-gray-600">Version: {tech.version}</div>
                      )}
                      {tech.categories?.length && (
                        <div className="text-xs text-gray-500 mt-1">
                          Categories: {tech.categories.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  No technologies detected. The site might be using custom technologies or the scan encountered issues.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <span className="ml-3">Scanning domain...</span>
          </div>
        )}

        {/* Results: Subdomains */}
        {subs && (
          <div className="space-y-4 text-sm">
            <h2 className="font-medium text-lg">Discovered Subdomains</h2>
            {subs.subdomains?.length ? (
              <div className="bg-gray-100 rounded p-3">
                {subs.subdomains.map((s, i) => (
                  <div key={i} className="mb-2 last:mb-0 p-2 bg-white rounded">
                    <span className="font-mono text-green-600">{s.subdomain}</span>
                    {s.ips?.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">IPs: </span>
                        {s.ips.map((ip, index) => (
                          <span key={index} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs mr-1">
                            {ip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                No common subdomains found. Try different scanning techniques.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}