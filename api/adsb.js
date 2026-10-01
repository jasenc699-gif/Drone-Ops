// Vercel serverless function: ADS-B proxy with CORS. Called by the app as /adsb?lat=..&lon=..&dist=5
const opensky = (d) => JSON.stringify({ ac: (d.states || []).map((s) => ({
  hex: s[0], flight: s[1], lon: s[5], lat: s[6],
  alt_baro: s[8] ? "ground" : (s[7] != null ? Math.round(s[7] * 3.281) : null),
  gs: s[9] != null ? s[9] * 1.944 : null, track: s[10] })) });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  const lat = Number(req.query.lat), lon = Number(req.query.lon);
  const dist = Math.min(Number(req.query.dist) || 5, 25);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return res.status(400).send('{"error":"bad params"}');
  const dLat = dist / 60, dLon = dist / (60 * Math.cos(lat * Math.PI / 180));
  const sources = [
    ["adsb.lol", `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`],
    ["adsb.fi", `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`],
    ["airplanes.live", `https://api.airplanes.live/v2/point/${lat}/${lon}/${dist}`],
    ["adsb.one", `https://api.adsb.one/v2/point/${lat}/${lon}/${dist}`],
    ["opensky", `https://opensky-network.org/api/states/all?lamin=${lat - dLat}&lomin=${lon - dLon}&lamax=${lat + dLat}&lomax=${lon + dLon}`, opensky],
  ];
  const details = [];
  for (const [name, url, conv] of sources) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "DroneOpsApp/1.0 (personal situational awareness)", Accept: "application/json" } });
      if (r.ok) return res.status(200).send(conv ? conv(await r.json()) : await r.text());
      details.push(name + " HTTP " + r.status);
    } catch (e) {
      details.push(name + " " + (e.message || "error"));
    }
  }
  res.status(502).send(JSON.stringify({ error: "all sources failed", details }));
};
