#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
pushd "$SCRIPT_DIR/.."
rm -rf static/tinkerable-internal
./node_modules/.bin/tsc -p tinkerable-internal/tsconfig.json
cp tinkerable-internal/package.json static/tinkerable-internal
popd
