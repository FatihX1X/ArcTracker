/**
 * /api/proxy.js  –  Vercel Serverless Function
 *
 * WHY THIS EXISTS:
 *   Browsers enforce CORS. testnet.arcscan.app does not return
 *   "Access-Control-Allow-Origin: *" headers, so every direct
 *   fetch() from the React app is silently blocked.
 *
 *   This proxy runs server-side (Node.js on Vercel), so it is
 *   not subject to browser CORS rules. It forwards the request
 *   to arcscan and streams the JSON back to the browser.
 *
 * USAGE (called by ArcTracker.jsx):
 *   GET /api/proxy?target=https://testnet.arcscan.app/api/v2/addresses/0x...
 */

export default async function handler(req, res) {
  // Allow the browser to call this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { target } = req.query;

  if (!target) {
    return res.status(400).json({ error: "Missing ?target= parameter" });
  }

  // Security: only allow requests to testnet.arcscan.app
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return res.status(400).json({ error: "Invalid target URL" });
  }

  if (!["testnet.arcscan.app"].includes(targetUrl.hostname)) {
    return res.status(403).json({ error: "Target host not allowed" });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "ArcTracker/1.0",
      },
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    const body = await upstream.text();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    return res.status(upstream.status).send(body);
  } catch (err) {
    console.error("[proxy] upstream fetch failed:", err.message);
    return res.status(502).json({ error: "Upstream request failed", detail: err.message });
  }
}
