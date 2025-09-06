import { NextResponse } from "next/server";
import dns from "dns/promises";

// helper to fetch subdomains from crt.sh
async function fetchSubdomains(domain) {
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`);
    if (!res.ok) return [];
    const data = await res.json();
    const subs = new Set();
    data.forEach((entry) => {
      if (entry.name_value) {
        entry.name_value.split("\n").forEach((d) => {
          if (d.includes(domain)) subs.add(d.trim());
        });
      }
    });
    return Array.from(subs);
  } catch (err) {
    return [];
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "No domain provided" }, { status: 400 });
  }

  // DNS lookup
  let dnsRecords = {};
  try {
    dnsRecords = {
      A: await dns.resolve(domain, "A").catch(() => []),
      MX: await dns.resolve(domain, "MX").catch(() => []),
      TXT: await dns.resolve(domain, "TXT").catch(() => []),
    };
  } catch (err) {
    dnsRecords = { error: err.message };
  }

  // Subdomain enumeration (crt.sh)
  const subdomains = await fetchSubdomains(domain);

  return NextResponse.json({ domain, dnsRecords, subdomains });
}

