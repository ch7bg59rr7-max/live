#!/usr/bin/env bash
set -euo pipefail

IN="${1:-}"
OUT="${2:-./hls/vod}"
APP_NAME="${3:-stream}"

if [[ -z "$IN" ]]; then echo "usage: $0 <input> [out_dir] [name]"; exit 1; fi
mkdir -p "$OUT"

ffmpeg -re -i "$IN"   -map 0:v:0 -map 0:a:0 -c:v libx264 -b:v 800k -g 60 -sc_threshold 0 -c:a aac -b:a 96k   -map 0:v:0 -map 0:a:0 -c:v libx264 -b:v 1800k -g 60 -sc_threshold 0 -c:a aac -b:a 128k   -map 0:v:0 -map 0:a:0 -c:v libx264 -b:v 3500k -g 60 -sc_threshold 0 -c:a aac -b:a 128k   -f hls -hls_time 2 -hls_list_size 6 -hls_flags delete_segments+independent_segments   -hls_segment_type fmp4 -hls_fmp4_init_filename "init.mp4"   -master_pl_name master.m3u8   -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2"   "$OUT/${APP_NAME}_%v/playlist.m3u8"
