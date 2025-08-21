import { BundlerError } from '../errors/BundlerError';
import { FileSystem } from '../FileSystem';
import { IFrameFSLayer } from '../FileSystem/layers/IFrameFSLayer';
import { MemoryFSLayer } from '../FileSystem/layers/MemoryFSLayer';
import { NodeModuleFSLayer } from '../FileSystem/layers/NodeModuleFSLayer';
import { IFrameParentMessageBus } from '../protocol/iframe';
import { BundlerStatus } from '../protocol/message-types';
import { ResolverCache, resolveAsync } from '../resolver/resolver';
import { IPackageJSON, ISandboxFile } from '../types';
import { Emitter } from '../utils/emitter';
import { replaceHTML } from '../utils/html';
import * as logger from '../utils/logger';
import { NamedPromiseQueue } from '../utils/NamedPromiseQueue';
import { nullthrows } from '../utils/nullthrows';
import { ModuleRegistry } from './module-registry';
import { Module } from './module/Module';
import { Preset } from './presets/Preset';
import { getPreset } from './presets/registry';
import localModulesInfo from '../config/local_modules.json'
import { retryFetch } from '../utils/fetch'
import { basename } from '../utils/path'
import { parseFrontmatter } from './frontmatter';

export type TransformationQueue = NamedPromiseQueue<Module>;

export const DEFAULT_CODE = `
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
`.trim()

interface IBundlerOpts {
  messageBus: IFrameParentMessageBus;
}

interface IFSOptions {
  hasAsyncFileResolver?: boolean;
}

export class Bundler {
  private lastHTML: string | null = null;
  private messageBus: IFrameParentMessageBus;

  fs: FileSystem;
  moduleRegistry: ModuleRegistry;

  parsedPackageJSON: IPackageJSON | null = null;
  // Map filepath => Module
  modules: Map<string, Module> = new Map();
  transformationQueue: TransformationQueue;
  resolverCache: ResolverCache = new Map();
  hasHMR = false;
  isFirstLoad = true;
  preset: Preset | undefined;

  // Map from module id => parent module ids
  initiators = new Map<string, Set<string>>();
  runtimes: string[] = [];
  metadata: Map<string, Record<string, any>> = new Map()

  private onStatusChangeEmitter = new Emitter<BundlerStatus>();
  onStatusChange = this.onStatusChangeEmitter.event;

  private _previousDepString: string | null = null;
  private iFrameFsLayer: IFrameFSLayer;

  constructor(options: IBundlerOpts) {
    this.transformationQueue = new NamedPromiseQueue(true, 50);
    this.moduleRegistry = new ModuleRegistry(this);
    const memoryFS = new MemoryFSLayer();
    memoryFS.writeFile('//empty.js', 'module.exports = () => {};');
    this.iFrameFsLayer = new IFrameFSLayer(memoryFS, options.messageBus);
    this.fs = new FileSystem([memoryFS, this.iFrameFsLayer, new NodeModuleFSLayer(this.moduleRegistry)]);
    this.messageBus = options.messageBus;
  }

  /** Reset all compilation data */
  resetModules(): void {
    this.preset = undefined;
    this.modules = new Map();
    this.resolverCache = new Map();
  }

  configureFS(opts: IFSOptions): void {
    if (opts.hasAsyncFileResolver) {
      this.iFrameFsLayer.enableIFrameFS();
    }
  }

  async initPreset(preset: string): Promise<void> {
    if (!this.preset) {
      this.preset = getPreset(preset);
      await this.preset.init(this);
    }
  }

  registerRuntime(id: string, code: string): void {
    const filepath = `/node_modules/__csb_runtimes/${id}.js`;
    this.fs.writeFile(filepath, code);
    const module = new Module(filepath, code, false, this);
    this.modules.set(filepath, module);
    this.runtimes.push(filepath);
  }

  getModule(filepath: string): Module | undefined {
    return this.modules.get(filepath);
  }

  enableHMR(): void {
    this.hasHMR = true;
  }

  getInitiators(id: string): Set<string> {
    return this.initiators.get(id) ?? new Set();
  }

  addInitiator(moduleId: string, initiatorId: string): void {
    const initiators = this.getInitiators(moduleId);
    initiators.add(initiatorId);
    this.initiators.set(moduleId, initiators);
  }

  async processPackageJSON(): Promise<void> {
    const foundPackageJSON = await this.fs.readFileAsync('/package.json');
    try {
      this.parsedPackageJSON = JSON.parse(foundPackageJSON);
    } catch (err) {
      // Makes the bundler a bit more error-prone to invalid pkg.json's
      if (!this.parsedPackageJSON) {
        throw err;
      }
    }
  }

  async resolveEntryPoint(): Promise<string> {
    if (!this.parsedPackageJSON) {
      throw new BundlerError('No parsed package.json found!');
    }

    if (!this.preset) {
      throw new BundlerError('Preset has not been loaded yet');
    }

    const potentialEntries = new Set(
      [
        this.parsedPackageJSON.main,
        this.parsedPackageJSON.source,
        this.parsedPackageJSON.module,
        ...this.preset.defaultEntryPoints,
      ].filter((e) => typeof e === 'string')
    );

    for (let potentialEntry of potentialEntries) {
      if (typeof potentialEntry === 'string') {
        try {
          // Normalize path
          const entryPoint =
            potentialEntry[0] !== '.' && potentialEntry[0] !== '/' ? `./${potentialEntry}` : potentialEntry;
          const resolvedEntryPont = await this.resolveAsync(entryPoint, '/index.js');
          return resolvedEntryPont;
        } catch (err) {
          logger.debug(`Could not resolve entrypoint ${potentialEntry}`);
          logger.debug(err);
        }
      }
    }
    throw new BundlerError(
      `Could not resolve entry point, potential entrypoints: ${Array.from(potentialEntries).join(
        ', '
      )}. You can define one by changing the "main" field in package.json.`
    );
  }

  async loadNodeModules() {
    if (!this.parsedPackageJSON) {
      throw new BundlerError('No parsed pkg.json found!');
    }

    let dependencies = this.parsedPackageJSON.dependencies;
    if (dependencies) {
      dependencies = nullthrows(
        this.preset,
        'Preset needs to be defined when loading node modules'
      ).augmentDependencies(dependencies);

      await this.moduleRegistry.fetchManifest(dependencies);

      // Load all modules
      await this.moduleRegistry.preloadModules();
      await this.moduleRegistry.loadModuleDependencies();
    }
  }

  async resolveAsync(
    specifier: string,
    filename: string,
    extensions: string[] = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mdx']
  ): Promise<string> {
    try {
      const resolved = await resolveAsync(specifier, {
        filename,
        extensions,
        isFile: this.fs.isFile,
        readFile: this.fs.readFile,
        resolverCache: this.resolverCache,
      });
      return resolved;
    } catch (err) {
      logger.error(err);
      logger.error(Array.from(this.modules));
      // logger.error(Array.from(this.fs.files));
      throw err;
    }
  }

  private async _transformModule(path: string): Promise<Module> {
    let module = this.modules.get(path);
    if (module) {
      if (module.compiled != null) {
        return Promise.resolve(module);
      } else {
        // compilation got reset, we re-read the source to ensure it's the latest version.
        // reset happens mostly when we receive changes from the editor, so this ensures we actually output the changes...
        module.source = await this.fs.readFileAsync(path);
      }
    } else {
      const content = await this.fs.readFileAsync(path);
      module = new Module(path, content, false, this);
      this.modules.set(path, module);
    }
    await module.compile();
    for (let dep of module.dependencies) {
      const resolvedDependency = await this.resolveAsync(dep, module.filepath);
      this.transformModule(resolvedDependency);
    }
    return module;
  }

  /** Transform file at a certain absolute path */
  async transformModule(path: string): Promise<Module> {
    let module = this.modules.get(path);
    if (module && module.compiled != null) {
      return Promise.resolve(module);
    }
    return this.transformationQueue.addEntry(path, () => {
      return this._transformModule(path);
    });
  }

  async moduleFinishedPromise(id: string, moduleIds: Set<string> = new Set()): Promise<any> {
    if (moduleIds.has(id)) return;

    const foundPromise = this.transformationQueue.getItem(id);
    if (foundPromise) {
      await foundPromise;
    }

    const asset = this.modules.get(id);
    if (!asset) {
      throw new BundlerError(`Asset not in the compilation tree ${id}`);
    } else {
      if (asset.compilationError != null) {
        throw asset.compilationError;
      } else if (asset.compiled == null) {
        throw new BundlerError(`Asset ${id} has not been compiled`);
      }
    }

    moduleIds.add(id);

    for (const dep of asset.dependencies) {
      if (!moduleIds.has(dep)) {
        try {
          await this.moduleFinishedPromise(dep, moduleIds);
        } catch (err) {
          logger.debug(`Failed awaiting transpilation ${dep} required by ${id}`);

          throw err;
        }
      }
    }
  }

  private getNodeModuleFiles(moduleName: string, code?: string, packageJSON?: string): [string, string][] {
    return [
      [`/node_modules/${moduleName}/package.json`, packageJSON ?? JSON.stringify({
        name: moduleName,
        main: "./index.js",
      })],
      [`/node_modules/${moduleName}/index.js`, code ?? DEFAULT_CODE]
    ]
  }

  async addPreloadedModule(moduleName: string, code?: string, packageJSON?: string): Promise<void> {
    const files = this.getNodeModuleFiles(moduleName, code, packageJSON);
    const manifest = files.filter(([filename, _]) => basename(filename) === 'package.json')
    if (manifest.length !== 1) {
      throw Error('addPreloadedModule did not find manifest for ' + moduleName);
    }
    const parsedPackageJSON: any = JSON.parse(manifest[0][1]);
    for (let [filepath, contents] of files) {
      this.fs.writeFile(filepath, contents);
      if (filepath.endsWith('.js')) {
        const module = new Module(filepath, contents, false, this);
        this.modules.set(filepath, module);
      }
    }
  }

  async preloadModules(): Promise<void> {
    this.addPreloadedModule("path");
    this.addPreloadedModule("fs");
    this.addPreloadedModule("util");
    this.addPreloadedModule("assert");
    this.addPreloadedModule("module");
    this.addPreloadedModule("os");
    // this.addPreloadedModule("@internationalized/date");
  }

  async fetchSource(url: string): Promise<string> {
    return await (await retryFetch(url)).text()
  }

  private getModuleRelativePath(moduleName: string, relativePath: string): string {
    return `/node_modules/${moduleName}/${relativePath}`;
  }

  async addLocalModules(): Promise<void> {
    for (let [moduleName, {urls}] of Object.entries(localModulesInfo.modules)) {
      const moduleSources = Object.entries(urls);
      const codeContents = await Promise.all(moduleSources.map(([_name, url]) => this.fetchSource(url)))
      for (let ix = 0; ix < moduleSources.length; ix++) {
        const filepath = this.getModuleRelativePath(moduleName, moduleSources[ix][0]);
        this.fs.writeFile(filepath, codeContents[ix]);
        if (filepath.endsWith('.js')) {
          const module = new Module(filepath, codeContents[ix], false, this);
          this.modules.set(filepath, module);
        }
      }
    }
  }


  /** writes any new files and returns a list of updated modules */
  writeNewFiles(files: ISandboxFile[]): string[] {
    const res: string[] = [];
    for (let file of files) {
      try {
        const content = this.fs.readFileSync(file.path);
        if (content == file.code) {
          // no code change for the given file
          continue
        }
      } catch (err) {
        // file does not exist
      }
      this.extractMetadata(file);
      res.push(file.path);
      this.fs.writeFile(file.path, file.code);
    }
    return res;
  }

  extractMetadata(file: ISandboxFile) {
    if (file.path.endsWith('.mdx')) {
      try {
        const {data} = parseFrontmatter(file.code);
        if (Object.keys(data).length > 0) {
          this.metadata.set(
            file.path,
            data
          )
        }
      } catch (e) {
        console.warn(`Error parsing metadata for ${file.path}`, e);
      }
    }
  }

  async compile(files: ISandboxFile[]): Promise<() => any> {
    if (!this.preset) {
      throw new BundlerError('Cannot compile before preset has been initialized');
    }

    this.onStatusChangeEmitter.fire('installing-dependencies');

    // TODO: Have more fine-grained cache invalidation for the resolver
    // Reset resolver cache
    this.resolverCache = new Map();
    this.fs.resetCache();

    let changedFiles: string[] = [];
    if (!this.isFirstLoad) {
      logger.debug('Started incremental compilation');

      changedFiles = this.writeNewFiles(files);

      if (!changedFiles.length) {
        logger.debug('Skipping compilation, no changes detected');
        return () => { };
      }

      // If it's a change and we don't have any hmr modules we simply reload the application
      if (!this.hasHMR) {
        logger.debug('HMR is not enabled, doing a full page refresh');
        window.location.reload();
        return () => { };
      }
    } else {
      for (let file of files) {
        this.extractMetadata(file);
        this.fs.writeFile(file.path, file.code);
        await this.preloadModules();
        await this.addLocalModules();
      }
    }

    if (changedFiles.length) {
      const promises = [];
      for (let changedFile of changedFiles) {
        const module = this.getModule(changedFile);
        if (module) {
          module.resetCompilation();
          promises.push(this.transformModule(changedFile));
        }
      }
      await Promise.all(promises);
    }

    const pkgJsonChanged = changedFiles.find((f) => f === '/package.json');
    if (this.isFirstLoad || pkgJsonChanged) {
      logger.debug('Loading node modules');
      await this.processPackageJSON();

      const depString = Object.entries(this.parsedPackageJSON?.dependencies || {})
        .map((v) => `${v[0]}:${v[1]}`)
        .sort()
        .join(',');

      if (this._previousDepString != null && depString !== this._previousDepString) {
        logger.debug('Dependencies changed, reloading');
        location.reload();
        return () => { };
      }

      this._previousDepString = depString;

      await this.loadNodeModules();
    }

    this.onStatusChangeEmitter.fire('transpiling');

    // Transform runtimes
    if (this.isFirstLoad) {
      for (const runtime of this.runtimes) {
        await this.transformModule(runtime);
        await this.moduleFinishedPromise(runtime);
      }
    }

    // Resolve entrypoints
    const resolvedEntryPoint = await this.resolveEntryPoint();
    logger.debug('Resolved entrypoint:', resolvedEntryPoint);

    // Transform entrypoint and deps
    const entryModule = await this.transformModule(resolvedEntryPoint);
    await this.moduleFinishedPromise(resolvedEntryPoint);
    logger.debug('Bundling finished, manifest:');
    logger.debug(this.modules);

    entryModule.isEntry = true;

    const transpiledModules = Array.from(this.modules, ([name, value]) => {
      return {
        /**
         * TODO: adds trailing for backwards compatibility
         */
        [name + ':']: {
          source: {
            isEntry: entryModule.filepath === value.filepath,
            fileName: value.filepath,
            compiledCode: value.compiled,
          },
        },
      };
    }).reduce((prev, curr) => {
      return { ...prev, ...curr };
    }, {});

    this.messageBus.sendMessage('state', { state: { transpiledModules } });

    return () => {
      // Evaluate
      logger.debug('Evaluating...');

      if (this.isFirstLoad) {
        for (const runtime of this.runtimes) {
          const module = this.modules.get(runtime);
          if (!module) {
            throw new BundlerError(`Runtime ${runtime} is not defined`);
          } else {
            logger.debug(`Loading runtime ${runtime}...`);
            module.evaluate();
          }
        }

        entryModule.evaluate();
        this.isFirstLoad = false;
      } else {
        this.modules.forEach((module) => {
          if (module.hot.hmrConfig?.isDirty()) {
            module.evaluate();
          }
        });

        // TODO: Validate that this logic actually works...
        // Check if any module has been invalidated, because in that case we need to
        // restart evaluation.
        const invalidatedModules = Object.values(this.modules).filter((m: Module) => {
          if (m.hot.hmrConfig?.invalidated) {
            m.resetCompilation();
            this.transformModule(m.filepath);
            return true;
          }

          return false;
        });

        if (invalidatedModules.length > 0) {
          return this.compile(files);
        }
      }
    };
  }

  // TODO: Support template languages...
  getHTMLEntry(): string {
    const foundHTMLFilepath = ['/index.html', '/public/index.html'].find((filepath) => this.fs.isFileSync(filepath));

    if (foundHTMLFilepath) {
      return this.fs.readFileSync(foundHTMLFilepath);
    } else {
      if (!this.preset) {
        throw new BundlerError('Bundler has not been initialized with a preset');
      }
      return this.preset.defaultHtmlBody;
    }
  }

  replaceHTML() {
    const html = this.getHTMLEntry() ?? '<div id="root"></div>';
    if (this.lastHTML) {
      if (this.lastHTML !== html) {
        window.location.reload();
      }
      return;
    } else {
      this.lastHTML = html;
      replaceHTML(html);
    }
  }
}
