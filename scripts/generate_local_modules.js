// run as:
// node scripts/generate_local_modules.js > src/config/local_modules.json
const path = require('path')
const glob = require('glob')

const rootdir = path.join(
    __dirname,
    '..')

const subdir = 'tinkerable-internal/src/'

const files = glob.sync(
    path.join(
        rootdir,
        `${subdir}/**`))



const urls = Object.fromEntries(
        files.sort()
            .map(f => {
                const relpath = f.substring(rootdir.length + subdir.length + 1);
                if (relpath.endsWith('.ts') || relpath.endsWith('.tsx')) {
                    return relpath.replace(/\.tsx?$/, '.js')
                }
                return null;
            })
            .filter(f => f)
            .map(f => [f, `/tinkerable-internal/${f}`])
        )

console.log(
    JSON.stringify({
  "modules": {
    "@tinkerable/internal": {
      "urls": {
        ...urls,
        "package.json": "/tinkerable-internal/package.json",
      }
    }
  }
}, null, 2));
