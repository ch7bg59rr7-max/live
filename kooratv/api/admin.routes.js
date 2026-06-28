import express from "express";
import { q } from "./db.js";
export const admin = express.Router();

admin.get("/admin/roles", async (_req, res) => {
  const rows = await q(`SELECT id,name,description FROM roles ORDER BY id`);
  res.json(rows);
});

admin.get("/admin/users", async (_req, res) => {
  const rows = await q(`
    SELECT u.id,u.email,u.display_name,u.is_active,
      COALESCE(json_agg(json_build_object('id',r.id,'name',r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id=u.id
    LEFT JOIN roles r ON r.id=ur.role_id
    GROUP BY u.id ORDER BY u.created_at DESC`);
  res.json(rows);
});

admin.post("/admin/users/:id/role", async (req, res) => {
  const userId = req.params.id;
  const roleId = Number(req.body?.roleId);
  if (!roleId) return res.status(400).json({ error:"roleId required" });
  await q(`INSERT INTO user_roles(user_id,role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, roleId]);
  res.json({ ok:true });
});
