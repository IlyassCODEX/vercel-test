import { NextResponse } from "next/server";
import dns from "dns/promises";
import { loadSignatures } from "@/lib/signatures";

function testRule(rule, data) {
  const regex = new RegExp(rule.pattern, "i");

  switch (rule.type) {
    case "header":
      return data.headers[rule.key]?.some(v => regex.test(v));
    case "html":
      return regex.test(data.html || "");
    case "cookie":
      return data.cookies?.some(c => regex.test(c));
    case "dns":
      return data.dns?.some(r => regex.test(r));
    // placeholders for favicon/tls
    default:
      return false;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();

  if (!domain) {
    return NextResponse.json({ error: "Missing ?domain=" }, { status: 400 });
  }

  const signatures = loadSignatures();
  const headers = {};
  const cookies = [];
  let html = "";
  let dnsRecords = [];

  try {
    const res = await fetch(`http://${domain}`, { redirect: "follow" });
    res.headers.forEach((v, k) => {
      if (!headers[k]) headers[k] = [];
      headers[k].push(v);
    });
    html = await res.text();
    cookies.push(...(res.headers.get("set-cookie")?.split(";") || []));
  } catch (e) {
    console.error("Fetch error:", e.message);
  }

  try {
    const A = await dns.resolve(domain, "A");
    dnsRecords.push(...A);
  } catch {}
  try {
    const AAAA = await dns.resolve(domain, "AAAA");
    dnsRecords.push(...AAAA);
  } catch {}

  // Run detection
  const results = [];
  for (const sig of signatures) {
    let score = 0;
    for (const rule of sig.rules) {
      if (testRule(rule, { headers, html, cookies, dns: dnsRecords })) {
        score += rule.weight;
      }
    }
    if (score > 0) {
      results.push({
        name: sig.name,
        category: sig.category,
        score
      });
    }
  }

  return NextResponse.json({
    domain,
    ips: { A: dnsRecords },
    technologies: results.sort((a, b) => b.score - a.score)
  });
}
