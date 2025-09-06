import { NextResponse } from "next/server";
import dns from "dns/promises";
import https from "https";
import { JSDOM } from "jsdom";

export const runtime = "nodejs";

// Free technology detection methods
async function detectTechnologies(domain) {
  const technologies = [];
  const url = `https://${domain}`;
  
  try {
    // Method 1: HTTP Headers Analysis
    const headers = await fetchHeaders(url);
    analyzeHeaders(headers, technologies);
    
    // Method 2: HTML Content Analysis
    const html = await fetchHTML(url);
    if (html) {
      analyzeHTML(html, technologies);
      analyzeMetaTags(html, technologies);
      analyzeScripts(html, technologies);
    }
    
    // Method 3: Common Technology Patterns
    detectCommonTechPatterns(domain, technologies);
    
  } catch (error) {
    console.error("Detection error:", error.message);
  }
  
  return technologies;
}

async function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      const headers = {};
      Object.keys(res.headers).forEach(key => {
        headers[key.toLowerCase()] = res.headers[key];
      });
      resolve(headers);
    }).on('error', reject).setTimeout(10000, () => reject(new Error('Timeout')));
  });
}

async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).setTimeout(10000, () => reject(new Error('Timeout')));
  });
}

function analyzeHeaders(headers, technologies) {
  // Server detection
  const server = headers['server'] || headers['x-powered-by'];
  if (server) {
    technologies.push({ app: 'Web Server', version: server, categories: ['Server'] });
  }
  
  // Framework detection via headers
  if (headers['x-aspnet-version']) {
    technologies.push({ app: 'ASP.NET', version: headers['x-aspnet-version'], categories: ['Framework'] });
  }
  if (headers['x-aspnetmvc-version']) {
    technologies.push({ app: 'ASP.NET MVC', version: headers['x-aspnetmvc-version'], categories: ['Framework'] });
  }
  if (headers['x-drupal-cache']) {
    technologies.push({ app: 'Drupal', categories: ['CMS'] });
  }
}

function analyzeHTML(html, technologies) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // WordPress detection
    if (html.includes('wp-content') || html.includes('wp-includes') || 
        doc.querySelector('meta[name="generator"][content*="WordPress"]')) {
      technologies.push({ app: 'WordPress', categories: ['CMS'] });
    }
    
    // React detection
    if (html.includes('react') || html.includes('__next') || 
        doc.querySelector('script[src*="react"]')) {
      technologies.push({ app: 'React', categories: ['JavaScript Framework'] });
    }
    
    // Vue.js detection
    if (html.includes('vue') || doc.querySelector('script[src*="vue"]')) {
      technologies.push({ app: 'Vue.js', categories: ['JavaScript Framework'] });
    }
    
    // jQuery detection
    if (html.includes('jquery') || doc.querySelector('script[src*="jquery"]')) {
      technologies.push({ app: 'jQuery', categories: ['JavaScript Library'] });
    }
    
    // Bootstrap detection
    if (html.includes('bootstrap') || doc.querySelector('link[href*="bootstrap"]')) {
      technologies.push({ app: 'Bootstrap', categories: ['CSS Framework'] });
    }
  } catch (error) {
    console.error("HTML analysis error:", error.message);
  }
}

function analyzeMetaTags(html, technologies) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const metaGenerator = doc.querySelector('meta[name="generator"]');
    if (metaGenerator) {
      const content = metaGenerator.getAttribute('content');
      if (content) {
        technologies.push({ app: content.split(' ')[0], version: content, categories: ['Platform'] });
      }
    }
  } catch (error) {
    console.error("Meta tag analysis error:", error.message);
  }
}

function analyzeScripts(html, technologies) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const scripts = doc.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      
      // Google Analytics
      if (src.includes('google-analytics.com') || src.includes('ga.js')) {
        technologies.push({ app: 'Google Analytics', categories: ['Analytics'] });
      }
      
      // Google Tag Manager
      if (src.includes('googletagmanager.com')) {
        technologies.push({ app: 'Google Tag Manager', categories: ['Tag Manager'] });
      }
      
      // Facebook Pixel
      if (src.includes('facebook.net') && src.includes('pixel')) {
        technologies.push({ app: 'Facebook Pixel', categories: ['Advertising'] });
      }
    });
  } catch (error) {
    console.error("Script analysis error:", error.message);
  }
}

function detectCommonTechPatterns(domain, technologies) {
  // Common backend patterns
  const backendPatterns = [
    { pattern: /\.php$/, tech: 'PHP', category: 'Backend' },
    { pattern: /\.aspx$/, tech: 'ASP.NET', category: 'Backend' },
    { pattern: /\.jsp$/, tech: 'Java Server Pages', category: 'Backend' },
    { pattern: /\.py$/, tech: 'Python', category: 'Backend' },
    { pattern: /\.rb$/, tech: 'Ruby', category: 'Backend' }
  ];
  
  // Check common files that indicate technologies
  const commonFiles = [
    { path: '/wp-admin/', tech: 'WordPress', category: 'CMS' },
    { path: '/wp-content/', tech: 'WordPress', category: 'CMS' },
    { path: '/administrator/', tech: 'Joomla', category: 'CMS' },
    { path: '/sites/all/', tech: 'Drupal', category: 'CMS' },
    { path: '/_next/', tech: 'Next.js', category: 'Framework' },
    { path: '/static/react/', tech: 'React', category: 'Framework' }
  ];
}

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

  let technologies = [];
  try {
    technologies = await detectTechnologies(domain);
  } catch (err) {
    console.error("Technology detection error:", err.message);
  }

  return NextResponse.json({ 
    domain, 
    ips, 
    technologies,
    timestamp: new Date().toISOString()
  });
}