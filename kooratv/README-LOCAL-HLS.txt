لتوليد بث HLS محلياً للاختبار:
ffmpeg -re -f lavfi -i testsrc2=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=48000   -filter_complex "[0:v]split=3[v1][v2][v3];     [v1]scale=426:240[v240];     [v2]scale=640:360[v360];     [v3]scale=1280:720[v720]"   -map "[v240]" -map 1:a -c:v h264 -b:v 400k -c:a aac -ar 48000 -b:a 96k -g 60 -sc_threshold 0   -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments+independent_segments   -master_pl_name master.m3u8 -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0"   -map "[v360]" -map 1:a -b:v 800k   -map "[v720]" -map 1:a -b:v 2000k   ./hls/demo/out_%v/playlist.m3u8

ثم أنشئ رابطاً موقعاً:
  docker compose exec api node jwt.js
