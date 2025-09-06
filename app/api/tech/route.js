import { NextResponse } from "next/server";
import dns from "dns/promises";
import { scan } from "@ryntab/wappalyzer-node";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();

  if (!domain) {
    return NextResponse.json({ error: "Missing ?domain=" }, { status: 400 });
  }

  const ips = { A: [], AAAA: [] };
  try {
    ips.A = await dns.resolve(domain, "A").catch(() => []);
    ips.AAAA = await dns.resolve(domain, "AAAA").catch(() => []);
  } catch (e) {
    // ignore
  }

  let techs = [];
  try {
    const result = await scan(`https://${domain}`, { target: "agent" });
    techs = result.technologies || [];
  } catch (err) {
    console.error("Wappalyzer error:", err.message);
  }

  return NextResponse.json({ domain, ips, technologies: techs });
}
