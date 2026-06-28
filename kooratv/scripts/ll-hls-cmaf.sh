#!/usr/bin/env bash
set -euo pipefail

IN="${1:-}"
OUT="${2:-./hls/live}"
APP_NAME="${3:-stream}"

if [[ -z "$IN" ]]; then
  echo "usage: $0 <input> [out_dir] [name]"; exit 1;
fi

mkdir -p "$OUT"

V240="scale=w=426:h=240:flags=lanczos,format=yuv420p"
V360="scale=w=640:h=360:flags=lanczos,format=yuv420p"
V720="scale=w=1280:h=720:flags=lanczos,format=yuv420p"

ffmpeg -re -i "$IN"   -map 0:v:0 -map 0:a:0 -filter:v:$((0)) "$V240" -c:v:$((0)) libx264 -b:v:$((0)) 400k -maxrate:v:$((0)) 450k -bufsize:v:$((0)) 300k -g 48 -keyint_min 48 -sc_threshold 0 -preset veryfast   -c:a:$((0)) aac -b:a:$((0)) 96k -ar 48000   -map 0:v:0 -map 0:a:0 -filter:v:$((1)) "$V360" -c:v:$((1)) libx264 -b:v:$((1)) 800k -maxrate:v:$((1)) 900k -bufsize:v:$((1)) 600k -g 48 -keyint_min 48 -sc_threshold 0 -preset veryfast   -c:a:$((1)) aac -b:a:$((1)) 96k -ar 48000   -map 0:v:0 -map 0:a:0 -filter:v:$((2)) "$V720" -c:v:$((2)) libx264 -b:v:$((2)) 2000k -maxrate:v:$((2)) 2200k -bufsize:v:$((2)) 1200k -g 48 -keyint_min 48 -sc_threshold 0 -preset veryfast   -c:a:$((2)) aac -b:a:$((2)) 128k -ar 48000   -f hls   -hls_time 1   -hls_part_size 0.333   -hls_list_size 10   -hls_flags independent_segments+append_list+omit_endlist   -hls_segment_type fmp4   -master_pl_name master.m3u8   -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2"   -master_pl_publish_rate 1   -hls_fmp4_init_filename "init.mp4"   "$OUT/${APP_NAME}_%v/playlist.m3u8"
