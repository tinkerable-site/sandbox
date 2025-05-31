# Regenerating node modules cache

```bash
# First, clean build dir
npm run clean
# Remove the old tarball from the static dir
rm static/cached_node_module_requests.tar.gz
# Start a dev server
npm run dev
# Go to localhost:3000, load the app with cache turned off and save the HAR file in the network tab.
# Then, run the following:
bash scripts/cache_har.sh ~/Downloads/localhost.har static/cached_node_module_requests.tar.gz
# The build step copies the tarball from static/ to dist/
npm run build
# Verify that no CDN requests are made with the new tarball in place
npm run dev

```

# Sandpack Bundler

The sandpack bundler, this aims to eventually replace the current sandpack with a more streamlined and faster version.

## Getting started

1. Run `yarn` to install dependencies.
2. Run `yarn dev` to start the development server
3. Set the `bundlerURL` of sandpack-react to `http://localhost:1234/` to see it in action.

## Test the production build (performance/integration tests)

1. Run `yarn` to install dependencies.
2. Run `yarn build` to build the application
3. Run `yarn start` to start a local test server
4. Set the `bundlerURL` of sandpack-react to `http://localhost:4587/`

## Using the deployed version

The `main` branch of this repository is automatically deployed to `https://sandpack-bundler.codesandbox.io` so you can update `bundlerURL` of `sandpack-react` to that url and start using the new sandpack bundler.

## Fonts

```
cp -r /Users/neumark/git/sandpack-test/my-app/node_modules/@fontsource/roboto/files ./dist/
```
