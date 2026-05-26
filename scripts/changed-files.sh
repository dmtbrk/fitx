#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

base="${1:-}"

if [ -n "$base" ]; then
  git diff --name-status "$base"...HEAD
else
  git status --short
fi
