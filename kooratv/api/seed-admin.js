import bcrypt from "bcrypt";
import { q } from "./db.js";

const email = process.env.ADMIN_EMAIL || "admin@kooratv.test";
const pass = process.env.ADMIN_PASS || "ChangeMe123!";
const hash = await bcrypt.hash(pass, 10);

await q(`INSERT INTO users(email,password_hash,display_name,is_active)
         VALUES ($1,$2,$3,true)
         ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, display_name=EXCLUDED.display_name`,
        [email, hash, "Administrator"]);

const role = await q(`SELECT id FROM roles WHERE name='admin'`);
if (role[0]) {
  await q(`INSERT INTO user_roles(user_id,role_id)
           SELECT id, $1 FROM users WHERE email=$2
           ON CONFLICT DO NOTHING`, [role[0].id, email]);
}
console.log("Admin ready:", email);
process.exit(0);
