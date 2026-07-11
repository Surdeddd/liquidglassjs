#!/usr/bin/env bash
set -u
OTP="${1:?usage: scripts/unpublish-legacy.sh <otp-code>}"
for name in core element react vue svelte; do
  npm unpublish "@surdeddd/liquidglass-$name" --force --otp="$OTP" &
done
wait
echo "---"
for name in core element react vue svelte; do
  if npm view "@surdeddd/liquidglass-$name" version >/dev/null 2>&1; then
    echo "STILL PUBLISHED: @surdeddd/liquidglass-$name"
  else
    echo "gone: @surdeddd/liquidglass-$name"
  fi
done
