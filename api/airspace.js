// Vercel function: fetches OpenAIP's public NZ airspace export and serves it with CORS + caching.
const URLS = [
  "https://s3.openaip.net/openaip-system-exports/nz_asp.geojson",
  "https://storage.openaip.net/openaip-system-exports/nz_asp.geojson",
  "https://storage.openaip.net/openaip-system-exports/nz_asp.json",
];
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const errs = [];
  for (const u of URLS) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "DroneOpsApp/1.0" } });
      if (r.ok) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
        return res.status(200).send(await r.text());
      }
      errs.push(u.split("/")[2] + "/" + u.split("/").pop() + " HTTP " + r.status);
    } catch (e) { errs.push(e.message || "error"); }
  }
  res.status(502).json({ error: "airspace download failed", details: errs });
};
