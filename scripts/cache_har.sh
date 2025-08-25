#!/usr/bin/env bash
# usage: bash scripts/cache_har.sh ~/Downloads/localhost.har static/cached_node_module_requests.tar.gz
har_path="$1"
tarball_path="$2"
if [ -z "$har_path" ] || [ -z "$tarball_path" ]; then
    echo "USAGE: $0 <har path> <tarball path>"
    exit 1
fi
temp_dir="$(mktemp -d)"
pushd "$temp_dir"
url_list_json="url_list.json"
manifest_json="manifest.json"
echo "{" >> "$manifest_json"
cat "$har_path" | jq '[ .log.entries[].request.url  | select(contains("localhost")|not)]' > "$url_list_json"
jq -c '.[]' "$url_list_json" | while read i; do
    url="$(echo "$i" | jq -r .)"
    hash="$(echo "$url" | sha256sum | cut -d ' ' -f 1)"
    curl -s -o "$hash" "$url"
    echo "$url"
    echo "\"$hash\":\"$url\"," >> "$manifest_json"
done
echo "\"end\":\"end\"}" >> "$manifest_json"
rm "$url_list_json"
tar -czvf tarball.tar.gz .
popd
mv "$temp_dir/tarball.tar.gz" "$tarball_path"
rm -rf "$temp_dir"
