#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

base="${1:-}"

if [ -n "$base" ]; then
  git diff --stat "$base"...HEAD
  git diff --check "$base"...HEAD
else
  git diff --stat
  git diff --check
fi
