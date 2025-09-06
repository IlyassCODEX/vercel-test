// app/api/subdomains/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dns from "dns/promises";

const COMMON_SUBS = [
  "www",
  "mail",
  "api",
  "dev",
  "test",
  "staging",
  "blog",
  "shop",
  "vpn",
  "admin",
  "portal",
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();

  if (!domain) {
    return NextResponse.json({ error: "Missing ?domain=" }, { status: 400 });
  }

  const found = [];
  for (const sub of COMMON_SUBS) {
    const fqdn = `${sub}.${domain}`;
    try {
      const ips = await dns.resolve(fqdn, "A");
      found.push({ subdomain: fqdn, ips });
    } catch {
      // not found
    }
  }

  return NextResponse.json({ domain, subdomains: found });
}
