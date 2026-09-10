/**
 * @jest-environment jsdom
 *
 * ModuleRegistry (index.ts) — the esm.sh fallback the registry wires for packages
 * the primary CDN drops. Exercises the real `_fetchEsmFallbackModule` seam: it
 * derives the `?external=` list from the CDN-resolved manifest plus the self-hosted
 * modules (`SELF_HOST_BASES`, today the SDK), then transpiles esm.sh source through
 * the bundler's chain so `require(...)` binds to the shared instances. The network
 * boundary is stubbed; the transpile and the chunk-detector run for real.
 * (jsdom: importing ModuleRegistry transitively loads the evaluation runtime,
 * which references `window`/`self` at module scope.)
 */
import { ModuleRegistry } from '.';
import { Bundler } from '../bundler';
import type { EsmFallbackFetcher } from './esm-fallback';
import { fetchManifest, fetchModule, ICDNModuleFile, IResolvedDependency } from './module-cdn';

jest.mock('./module-cdn', () => ({
  ...jest.requireActual('./module-cdn'),
  fetchManifest: jest.fn(),
  fetchModule: jest.fn(),
}));

const mockedFetchManifest = fetchManifest as jest.MockedFunction<typeof fetchManifest>;
const mockedFetchModule = fetchModule as jest.MockedFunction<typeof fetchModule>;

// Primary CDN resolves react/react-dom but drops the fallback package.
const REACT_RESOLVED: IResolvedDependency[] = [
  { n: 'react', v: '19.3.0', d: 0 },
  { n: 'react-dom', v: '19.3.0', d: 0 },
  { n: 'scheduler', v: '0.28.0', d: 1 },
];

describe('ModuleRegistry esm.sh fallback (transpile-through)', () => {
  const registry = (fetcher: EsmFallbackFetcher | null) => new ModuleRegistry({} as Bundler, fetcher);

  beforeEach(() => {
    mockedFetchManifest.mockReset();
    mockedFetchModule.mockReset();
    mockedFetchManifest.mockImplementation(async () => REACT_RESOLVED.map((d) => ({ ...d }))); // fallback pkg dropped
    mockedFetchModule.mockResolvedValue({ f: {}, m: [] }); // react/react-dom stubs
  });

  it('externalizes react and bridges the package so require() resolves it (no second React)', async () => {
    const LUCIDE_MJS = [
      'import { createElement, forwardRef, useContext, createContext } from "react";',
      'const IconContext = createContext({});',
      'export const Search = forwardRef((p, ref) => { useContext(IconContext); return createElement("svg", { ...p, ref }); });',
    ].join('\n');
    const fetcher = jest.fn<Promise<string>, [string]>().mockResolvedValue(LUCIDE_MJS);
    const r = registry(fetcher);

    await r.fetchManifest({ 'lucide-react': '^1.21.0', react: '^19.2.5', 'react-dom': '^19.2.5' });
    expect(r.manifest.map((d) => d.n)).toContain('lucide-react');
    await r.preloadModules();

    const url = fetcher.mock.calls[0][0];
    expect(url).toContain('https://esm.sh/lucide-react@^1.21.0');
    expect(url).toMatch(/external=[^&]*react/);

    const synthetic = r.modules.get('lucide-react')!;
    const index = synthetic.files['index.js'] as ICDNModuleFile;
    expect(index.c).toMatch(/require\(["']react["']\)/);
    expect(index.c).not.toMatch(/import\s/);
    expect(index.d).toContain('react');
  });

  it('surfaces a clear error (not a silent undefined) when esm.sh also fails', async () => {
    const fetcher = jest.fn<Promise<string>, [string]>().mockRejectedValue(new Error('HTTP 404'));
    const r = registry(fetcher);
    await r.fetchManifest({ 'lucide-react': '^1.21.0', react: '^19.2.5' });
    await expect(r.preloadModules()).rejects.toThrow(
      /Could not resolve "lucide-react@\^1\.21\.0".*esm\.sh fallback.*404/,
    );
  });

  it('externalizes self-hosted modules (the SDK), so a first-party SDK-importing package loads (R3-566)', async () => {
    const OMNIBOX_MJS = [
      'import { link } from "@immediately-run/sdk/platformLink";',
      'import { createElement } from "react";',
      'export const Cta = (p) => createElement("a", p);',
    ].join('\n');
    const fetcher = jest.fn<Promise<string>, [string]>().mockResolvedValue(OMNIBOX_MJS);
    const r = registry(fetcher);

    await r.fetchManifest({ '@immediately-run/omnibox': '^0.3.0', react: '^19.2.5' });
    await r.preloadModules();

    const url = fetcher.mock.calls[0][0];
    expect(url).toContain('https://esm.sh/@immediately-run/omnibox@^0.3.0');
    expect(url).toMatch(/external=[^&]*@immediately-run\/sdk/);

    const synthetic = r.modules.get('@immediately-run/omnibox')!;
    const index = synthetic.files['index.js'] as ICDNModuleFile;
    expect(index.d).toContain('@immediately-run/sdk/platformLink');
    expect(index.c).toMatch(/require\(["']@immediately-run\/sdk\/platformLink["']\)/);
    expect(index.c).not.toMatch(/esm\.sh\/.*sdk/i);
  });

  it('with the fallback disabled, a dropped package fails fast via the resolution guard', async () => {
    const r = registry(null);
    await expect(r.fetchManifest({ 'lucide-react': '^1.21.0', react: '^19.2.5' })).rejects.toThrow(
      /Could not resolve.*lucide-react@\^1\.21\.0/,
    );
  });
});
