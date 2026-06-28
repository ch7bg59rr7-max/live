import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET || "My_Super_Secret_Change_Me";
const base = process.env.BASE_URL || "http://localhost";
const path = "/hls/demo/master.m3u8";

const token = jwt.sign(
  { p: path, scope: "hls", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 300 },
  secret,
  { algorithm: "HS256" }
);

console.log(`${base}${path}?token=${token}`);
