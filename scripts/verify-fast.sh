#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ -f package.json ]; then
  npm test
elif [ -f Makefile ]; then
  make test
elif [ -f Justfile ]; then
  just test
elif [ -f go.mod ]; then
  go test ./...
elif [ -f Cargo.toml ]; then
  cargo test
else
  echo "No known fast verification command found." >&2
  exit 1
fi
