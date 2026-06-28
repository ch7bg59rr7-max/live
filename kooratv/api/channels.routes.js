import express from "express";
import { q, tx } from "./db.js";
import { slugify } from "./slug.js";

export const router = express.Router();

router.get("/channels", async (_req, res) => {
  const rows = await q(`SELECT c.*,
    COALESCE((SELECT json_agg(s ORDER BY priority) FROM channel_sources s WHERE s.channel_id=c.id), '[]') AS sources
    FROM channels c ORDER BY created_at DESC`);
  res.json(rows);
});

router.post("/channels", async (req, res) => {
  const { name, logo_url, is_active = true } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const slug = slugify(name);
  const rows = await q(
    `INSERT INTO channels(name, slug, logo_url, is_active)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name, logo_url=EXCLUDED.logo_url, is_active=EXCLUDED.is_active
     RETURNING *`,
    [name, slug, logo_url ?? null, is_active]
  );
  res.json(rows[0]);
});

router.put("/channels/:id", async (req, res) => {
  const { name, logo_url, is_active } = req.body || {};
  const rows = await q(
    `UPDATE channels SET
       name = COALESCE($2,name),
       slug = CASE WHEN $2 IS NOT NULL THEN $3 ELSE slug END,
       logo_url = COALESCE($4,logo_url),
       is_active = COALESCE($5,is_active)
     WHERE id=$1 RETURNING *`,
    [req.params.id, name ?? null, name ? slugify(name) : null, logo_url ?? null, is_active ?? null]
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]);
});

router.delete("/channels/:id", async (req, res) => {
  await q(`DELETE FROM channels WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

router.post("/channels/:id/sources", async (req, res) => {
  const { source_url, kind = "m3u8", priority = 1 } = req.body || {};
  if (!source_url) return res.status(400).json({ error: "source_url required" });
  const rows = await q(
    `INSERT INTO channel_sources(channel_id, source_url, kind, priority)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, source_url, kind, priority]
  );
  res.json(rows[0]);
});

router.put("/sources/:sid", async (req, res) => {
  const { source_url, kind, priority, status, last_bitrate_kbps, codecs } = req.body || {};
  const rows = await q(
    `UPDATE channel_sources SET
       source_url=COALESCE($2,source_url),
       kind=COALESCE($3,kind),
       priority=COALESCE($4,priority),
       status=COALESCE($5,status),
       last_bitrate_kbps=COALESCE($6,last_bitrate_kbps),
       codecs=COALESCE($7,codecs),
       last_checked_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.sid, source_url ?? null, kind ?? null, priority ?? null, status ?? null, last_bitrate_kbps ?? null, codecs ?? null]
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]);
});

router.delete("/sources/:sid", async (req, res) => {
  await q(`DELETE FROM channel_sources WHERE id=$1`, [req.params.sid]);
  res.status(204).end();
});

router.post("/import/m3u/commit-db", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "no items" });
  const created = [];
  await tx(async (client) => {
    for (const it of items) {
      const name = it.name?.trim(); if (!name || !it.url) continue;
      const slug = slugify(name);
      const ch = await client.query(
        `INSERT INTO channels(name, slug, logo_url, is_active)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name, logo_url=COALESCE(EXCLUDED.logo_url, channels.logo_url)
         RETURNING *`,
        [name, slug, it.logo ?? null, true]
      );
      const channelId = ch.rows[0].id;
      const exists = await client.query(
        `SELECT id FROM channel_sources WHERE channel_id=$1 AND source_url=$2`,
        [channelId, it.url]
      );
      if (!exists.rows[0]) {
        const src = await client.query(
          `INSERT INTO channel_sources(channel_id, source_url, kind, priority, status)
           VALUES ($1,$2,$3,$4,'unknown') RETURNING *`,
          [channelId, it.url, "m3u8", 1]
        );
        created.push({ channel: ch.rows[0], source: src.rows[0] });
      }
    }
  });
  res.json({ created: created.length, details: created });
});
