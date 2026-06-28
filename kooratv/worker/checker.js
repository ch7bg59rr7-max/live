import axios from "axios";
import { execFile } from "child_process";

async function headOk(url) {
  try {
    const r = await axios.head(url, { timeout: 6000, validateStatus: () => true });
    return r.status >= 200 && r.status < 300;
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
          ok: true,
          video: v ? { codec:v.codec_name, width:v.width, height:v.height } : null,
          audio: a ? { codec:a.codec_name, channels:a.channels } : null,
          bitrate_kbps: j.format?.bit_rate ? Math.round(Number(j.format.bit_rate)/1000) : null
        });
      } catch (e) { reject(e); }
    });
  });
}

const testUrl = "http://nginx/hls/demo/master.m3u8";
setInterval(async ()=>{
  const ok = await headOk(testUrl);
  if (ok) {
    try {
      const info = await ffprobeInfo(testUrl);
      console.log("[worker] OK demo stream", info);
    } catch(e) {
      console.log("[worker] probe error", String(e));
    }
  } else {
    console.log("[worker] demo stream not reachable");
  }
}, 15000);
