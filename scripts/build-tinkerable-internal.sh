#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
pushd "$SCRIPT_DIR/.."
rm -rf static/tinkerable-internal
mkdir -p static/tinkerable-internal
temp_dir="$(mktemp -d)"
./node_modules/.bin/tsc -p tinkerable-internal/tsconfig.json --outDir "$temp_dir"
cp -r "${temp_dir}/src/" static/tinkerable-internal/
cp tinkerable-internal/package.json static/tinkerable-internal/
rm -rf "$temp_dir"
popd
