
import express from "express";
import helmet from "helmet";
import axios from "axios";
import jwt from "jsonwebtoken";
import { execFile } from "child_process";
import { router as channelsRouter } from "./channels.routes.js";
import { admin as adminRouter } from "./admin.routes.js";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));

const SECRET = process.env.JWT_SECRET || "My_Super_Secret_Change_Me";

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let meta = {};
  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").slice(1).join(",").trim();
      const lgMatch = /tvg-logo="([^"]+)"/.exec(line);
      const gpMatch = /group-title="([^"]+)"/.exec(line);
      meta = { name, logo: lgMatch?.[1], group: gpMatch?.[1] };
    } else if (line && !line.startsWith("#")) {
      if (meta.name) {
        items.push({ name: meta.name, logo: meta.logo, group: meta.group, url: line.trim() });
        meta = {};
      }
    }
  }
  return items;
}

app.use("/api", channelsRouter);
app.use("/api", adminRouter);

app.post("/api/import/m3u/preview", async (req, res) => {
  try {
    const { url, m3uText } = req.body || {};
    const text = m3uText ?? (await axios.get(url, { responseType: "text", timeout: 10000 })).data;
    const items = parseM3U(text);
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.post("/api/import/m3u/commit", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const out = [];
  for (const it of items) {
    const headOk = await quickHead(it.url);
    const probe = headOk ? await ffprobeInfo(it.url).catch(()=>null) : null;
    out.push({ ...it, headOk, probe });
  }
  res.json({ created: items.length, details: out });
});

app.get("/internal/auth/hls", (req, res) => {
  const original = req.headers["x-original-uri"];
  const authHeader = req.headers.authorization || "";
  const token = (req.query.token || authHeader.replace(/^Bearer\s+/i, "")).toString();
  if (!token) return res.status(401).end();
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    if (payload.scope !== "hls") return res.status(403).end();
    if (payload.p && typeof payload.p === "string") {
      if (!original || !original.toString().startsWith(payload.p)) return res.status(403).end();
    }
    return res.status(200).end();
  } catch (_e) {
    return res.status(401).end();
  }
});

app.get("/", (_req, res)=>res.send("kooratv API running"));

const port = process.env.PORT || 4000;
app.listen(port, ()=>console.log("API on", port));

async function quickHead(url) {
  try {
    const r = await axios.head(url, { timeout: 6000, validateStatus: () => true });
    const ct = (r.headers["content-type"]||"").toLowerCase();
    return r.status >= 200 && r.status < 300 && (ct.includes("mpegurl") || ct.includes("application") || ct.includes("octet-stream"));
  } catch { return false; }
}

function ffprobeInfo(url) {
  return new Promise((resolve, reject) => {
    execFile("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", url], { timeout: 12000 }, (err, stdout) => {
      if (err) return reject(err);
      try {
        const j = JSON.parse(stdout);
        const v = (j.streams||[]).find(s=>s.codec_type==="video");
        const a = (j.streams||[]).find(s=>s.codec_type==="audio");
        resolve({
          video: v ? { codec:v.codec_name, width:v.width, height:v.height, fps: v.avg_frame_rate } : null,
          audio: a ? { codec:a.codec_name, channels:a.channels, sample_rate:a.sample_rate } : null,
          bitrate: j.format?.bit_rate ? Number(j.format.bit_rate)/1000 : null
        });
      } catch (e) { reject(e); }
    });
  });
}
