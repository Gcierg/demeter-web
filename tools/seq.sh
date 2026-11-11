#!/bin/sh
# Turns the Higgsfield clips into the scroll sequence the page plays.
#   sh tools/seq.sh clip1.mp4 clip2.mp4 ... clip7.mp4
# Each clip is one stage, in order. Writes assets/seq/f_0001.jpg ... and manifest.json (frame count + where each stage starts).
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd); OUT="$HERE/assets/seq"; FPS=${FPS:-12}; WIDTH=${WIDTH:-1280}
mkdir -p "$OUT"; find "$OUT" -name 'f_*.jpg' -delete
n=0; starts=""
for clip in "$@"; do
  starts="$starts $n"
  tmp=$(mktemp -d)
  ffmpeg -v error -i "$clip" -vf "fps=$FPS,scale=$WIDTH:-2" -q:v 5 "$tmp/t_%04d.jpg"
  for f in "$tmp"/t_*.jpg; do n=$((n + 1)); mv "$f" "$OUT/$(printf 'f_%04d.jpg' $n)"; done
  rmdir "$tmp"
done
st=$(for s in $starts; do awk -v s=$s -v n=$n 'BEGIN{printf "%.4f,", s/n}'; done | sed 's/,$//')
printf '{"count":%d,"ext":"jpg","stages":[%s]}\n' "$n" "$st" > "$OUT/manifest.json"
echo "frames: $n"; cat "$OUT/manifest.json"; du -sh "$OUT"
