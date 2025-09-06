// app/api/tech/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dns from "dns/promises";

// ---- helpers ------------------------------------------------

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
}

async function fetchWithTimeout(url, opts = {}, ms = 12000) {
  return Promise.race([fetch(url, opts), timeout(ms)]);
}

function toHeaderMap(headers) {
  const map = {};
  headers?.forEach?.((v, k) => {
    map[k.toLowerCase()] = v;
  });
  return map;
}

function getCookieNames(headersMap) {
  const setCookie = headersMap["set-cookie"];
  if (!setCookie) return [];
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr
    .map((c) => String(c).split(";")[0]?.split("=")[0]?.trim())
    .filter(Boolean);
}

function extractTags(html) {
  // extremely light tag extraction (no DOM lib to keep bundle small)
  const metas = [...html.matchAll(/<meta[^>]+>/gi)].map((m) => m[0]);
  const links = [...html.matchAll(/<link[^>]+>/gi)].map((m) => m[0]);
  const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(
    (m) => m[1]
  );
  const metaGenerator = metas
    .map((tag) => {
      const nameMatch = tag.match(/name=["']?generator["']?/i);
      if (!nameMatch) return null;
      const contentMatch = tag.match(/content=["']([^"']+)["']/i);
      return contentMatch?.[1] || null;
    })
    .filter(Boolean)[0];
  return { scripts, metas, links, metaGenerator };
}

// ---- signature engine --------------------------------------

/**
 * Each signature:
 * {
 *   name: "WordPress",
 *   category: "CMS",
 *   points: [  // evidence items, summed to compute confidence
 *     { type: "header", key: "x-powered-by", pattern: /wordpress/i, weight: 60 },
 *     { type: "html", pattern: /wp-content|wp-includes/i, weight: 50 },
 *     { type: "metaGenerator", pattern: /wordpress/i, weight: 70 },
 *     { type: "scriptSrc", pattern: /\/wp-includes\/|\/wp-content\//i, weight: 40 },
 *     { type: "cookie", pattern: /^wp-/i, weight: 20 },
 *   ]
 * }
 */

const SIGNATURES = [
  // Web servers / platforms
  {
    name: "Nginx",
    category: "Server",
    points: [{ type: "header", key: "server", pattern: /nginx/i, weight: 80 }],
  },
  {
    name: "Apache",
    category: "Server",
    points: [{ type: "header", key: "server", pattern: /apache/i, weight: 80 }],
  },
  {
    name: "IIS",
    category: "Server",
    points: [{ type: "header", key: "server", pattern: /microsoft-iis/i, weight: 90 }],
  },
  {
    name: "Akamai",
    category: "CDN/WAF",
    points: [
      { type: "header", key: "server", pattern: /AkamaiGHost/i, weight: 80 },
      { type: "cookie", pattern: /^ak_?/, weight: 40 }, // ak_bmsc, akavpau_*, etc.
    ],
  },
  {
    name: "Cloudflare",
    category: "CDN/WAF",
    points: [
      { type: "header", key: "server", pattern: /cloudflare/i, weight: 80 },
      { type: "cookie", pattern: /^__cf|^cfduid|^cf_clearance/i, weight: 50 },
      { type: "header", key: "cf-cache-status", pattern: /HIT|MISS|DYNAMIC/i, weight: 40 },
    ],
  },
  {
    name: "Fastly",
    category: "CDN",
    points: [
      { type: "header", key: "x-served-by", pattern: /fastly/i, weight: 60 },
      { type: "header", key: "server", pattern: /Varnish|fastly/i, weight: 40 },
    ],
  },
  {
    name: "CloudFront",
    category: "CDN",
    points: [{ type: "header", key: "server", pattern: /cloudfront/i, weight: 70 }],
  },

  // Languages / frameworks
  {
    name: "PHP",
    category: "Language",
    points: [
      { type: "header", key: "x-powered-by", pattern: /php/i, weight: 70 },
      { type: "cookie", pattern: /^php?session/i, weight: 40 },
    ],
  },
  {
    name: ".NET",
    category: "Framework",
    points: [
      { type: "header", key: "x-powered-by", pattern: /asp\.?net/i, weight: 70 },
      { type: "cookie", pattern: /^ASP\.NET_SessionId|^ARRAffinity/i, weight: 40 },
    ],
  },
  {
    name: "Node.js (Express)",
    category: "Framework",
    points: [
      { type: "header", key: "x-powered-by", pattern: /express/i, weight: 70 },
      { type: "header", key: "server", pattern: /express/i, weight: 50 },
    ],
  },

  // CMS / storefront
  {
    name: "WordPress",
    category: "CMS",
    points: [
      { type: "metaGenerator", pattern: /wordpress/i, weight: 80 },
      { type: "html", pattern: /wp-content|wp-includes/i, weight: 70 },
      { type: "scriptSrc", pattern: /\/wp-(?:includes|content)\//i, weight: 50 },
      { type: "cookie", pattern: /^wp-|^wordpress_|^wordpress_logged_in/i, weight: 40 },
      { type: "header", key: "x-powered-by", pattern: /wordpress/i, weight: 40 },
    ],
  },
  {
    name: "Drupal",
    category: "CMS",
    points: [
      { type: "metaGenerator", pattern: /drupal/i, weight: 80 },
      { type: "html", pattern: /drupal\.settings|drupalSettings/i, weight: 50 },
      { type: "scriptSrc", pattern: /\/misc\/drupal|drupal\.(?:js|min\.js)/i, weight: 40 },
      { type: "cookie", pattern: /^SSESS|^SESS/i, weight: 30 },
    ],
  },
  {
    name: "Joomla",
    category: "CMS",
    points: [
      { type: "metaGenerator", pattern: /joomla!/i, weight: 80 },
      { type: "html", pattern: /com_content|Joomla/i, weight: 40 },
      { type: "cookie", pattern: /^[0-9a-f]{32}$/, weight: 20 },
    ],
  },
  {
    name: "Magento",
    category: "Ecommerce",
    points: [
      { type: "metaGenerator", pattern: /magento/i, weight: 70 },
      { type: "cookie", pattern: /^store|^mage-/, weight: 40 },
      { type: "html", pattern: /mage\/cookies|Magento/i, weight: 40 },
    ],
  },
  {
    name: "Shopify",
    category: "Ecommerce",
    points: [
      { type: "header", key: "server", pattern: /Shopify/i, weight: 70 },
      { type: "scriptSrc", pattern: /cdn\.shopify\.com|shopify\.js/i, weight: 50 },
      { type: "html", pattern: /Shopify theme|window\.Shopify/i, weight: 40 },
    ],
  },

  // Frontend frameworks
  {
    name: "Next.js",
    category: "Frontend",
    points: [
      { type: "html", pattern: /__NEXT_DATA__|<meta name="next-fetch-policy"/i, weight: 70 },
      { type: "scriptSrc", pattern: /_next\/static/i, weight: 50 },
    ],
  },
  {
    name: "React",
    category: "Frontend",
    points: [
      { type: "html", pattern: /data-reactroot|__REACT_DEVTOOLS_GLOBAL_HOOK__/i, weight: 60 },
      { type: "scriptSrc", pattern: /react(?:\.min)?\.js/i, weight: 40 },
    ],
  },
  {
    name: "Vue.js",
    category: "Frontend",
    points: [
      { type: "html", pattern: /data-v-app|__VUE_DEVTOOLS_GLOBAL_HOOK__/i, weight: 60 },
      { type: "scriptSrc", pattern: /vue(?:\.min)?\.js/i, weight: 40 },
    ],
  },
  {
    name: "Angular",
    category: "Frontend",
    points: [
      { type: "html", pattern: /ng-version=|<app-root/i, weight: 60 },
      { type: "scriptSrc", pattern: /angular(?:\.min)?\.js|main\.[a-f0-9]+\.js/i, weight: 30 },
    ],
  },

  // Analytics / consent / APM
  {
    name: "Google Analytics",
    category: "Analytics",
    points: [
      { type: "html", pattern: /www\.googletagmanager\.com\/gtag\/js|analytics\.js/i, weight: 70 },
    ],
  },
  {
    name: "Google Tag Manager",
    category: "Tag Manager",
    points: [{ type: "html", pattern: /www\.googletagmanager\.com\/gtm\.js/i, weight: 70 }],
  },
  {
    name: "Hotjar",
    category: "Analytics",
    points: [{ type: "html", pattern: /static\.hotjar\.com|script\.hotjar\.com/i, weight: 70 }],
  },
  {
    name: "OneTrust",
    category: "Consent",
    points: [
      { type: "cookie", pattern: /^OptanonConsent|^OptanonAlertBoxClosed/i, weight: 60 },
      { type: "html", pattern: /cdn\.cookiepro\.com|cdn\.onetrust\.com/i, weight: 50 },
    ],
  },
  {
    name: "Cookiebot",
    category: "Consent",
    points: [
      { type: "html", pattern: /consent\.cookiebot\.com|cookiebot\.com/i, weight: 60 },
      { type: "cookie", pattern: /^CookieConsent/i, weight: 40 },
    ],
  },
  {
    name: "Dynatrace",
    category: "APM",
    points: [{ type: "cookie", pattern: /^dtCookie|^dtLatC|^dtPC/i, weight: 70 }],
  },
];

function scoreSignature(sig, ctx) {
  let total = 0;
  const evidence = [];

  for (const p of sig.points) {
    switch (p.type) {
      case "header": {
        const val = ctx.headers[p.key];
        if (val && p.pattern.test(val)) {
          total += p.weight;
          evidence.push({ type: "header", key: p.key, value: val });
        }
        break;
      }
      case "cookie": {
        const hit = ctx.cookieNames.find((c) => p.pattern.test(c));
        if (hit) {
          total += p.weight;
          evidence.push({ type: "cookie", name: hit });
        }
        break;
      }
      case "metaGenerator": {
        if (ctx.metaGenerator && p.pattern.test(ctx.metaGenerator)) {
          total += p.weight;
          evidence.push({ type: "metaGenerator", value: ctx.metaGenerator });
        }
        break;
      }
      case "scriptSrc": {
        const hit = ctx.scripts.find((s) => p.pattern.test(s));
        if (hit) {
          total += p.weight;
          evidence.push({ type: "scriptSrc", value: hit });
        }
        break;
      }
      case "html": {
        if (p.pattern.test(ctx.html)) {
          total += p.weight;
          evidence.push({ type: "htmlMatch", pattern: String(p.pattern) });
        }
        break;
      }
      default:
        break;
    }
  }

  return { name: sig.name, category: sig.category, score: total, evidence };
}

// ---- main handler ------------------------------------------

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();

  if (!domain) {
    return NextResponse.json({ error: "Missing ?domain=" }, { status: 400 });
  }

  // 1) Resolve IPs
  const ips = { A: [], AAAA: [] };
  try {
    ips.A = await dns.resolve(domain, "A").catch(() => []);
    ips.AAAA = await dns.resolve(domain, "AAAA").catch(() => []);
  } catch (e) {
    // ignore
  }

  // 2) Fetch site
  const targets = [`https://${domain}`, `http://${domain}`];
  let finalUrl = null;
  let headers = {};
  let html = "";

  for (const url of targets) {
    try {
      const r = await fetchWithTimeout(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
      });
      finalUrl = r.url;
      headers = toHeaderMap(r.headers);
      // cap to 1.5MB to avoid memory blowups
      html = (await r.text()).slice(0, 1_500_000);
      if (html) break;
    } catch {
      // try next scheme
    }
  }

  const { scripts, metaGenerator } = extractTags(html);
  const cookieNames = getCookieNames(headers);

  const ctx = {
    headers,
    cookieNames,
    metaGenerator,
    scripts,
    html,
  };

  // 3) Score all signatures
  const hits = SIGNATURES.map((s) => scoreSignature(s, ctx))
    .filter((h) => h.score >= 60) // require decent confidence
    .sort((a, b) => b.score - a.score);

  // Trim noisy headers for output
  const headerPreview = Object.fromEntries(
    ["server", "x-powered-by", "cf-cache-status", "via"]
      .filter((k) => headers[k])
      .map((k) => [k, headers[k]])
  );

  return NextResponse.json({
    domain,
    url: finalUrl,
    ips,
    headers: headerPreview,
    metaGenerator: metaGenerator || null,
    cookies: cookieNames,
    technologies: hits,
  });
}
