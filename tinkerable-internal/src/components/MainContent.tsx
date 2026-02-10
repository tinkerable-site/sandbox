import { Suspense, use, useMemo } from 'react';

import { ModuleCacheContext } from '../moduleCache';
import { defaultErrorComponent, defaultLoadingComponent } from './defaults';
import { Include } from './Include';

const directories = ['/', '/src/'];
const basenames = ['App', 'landing', 'main', 'README'];
const extensions = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mdx', '.md'];
const candidates = directories.flatMap((dir) =>
  basenames.flatMap((basename) => extensions.map((ext) => `${dir}${basename}${ext}`))
);

const fileExists = async (path: string): Promise<[string, boolean]> => {
  // @ts-ignore
  const bundler = module.evaluation.module.bundler;
  const exists = await bundler.fs.isFile.async(path);
  return [path, exists];
};

export const MainContentInner = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
  candidatesExistPromise,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
  candidatesExistPromise: Promise<[string, boolean][]>;
}) => {
  const candidatesExist = use(candidatesExistPromise);
  const filename = candidatesExist.find(([_, exists]) => exists)?.[0];
  if (!filename) {
    // todo: show file list
    throw new Error(`No main content file present`);
  }

  // @ts-ignore
  return <Include ErrorComponent={ErrorComponent} LoadingComponent={LoadingComponent} filename={filename} baseModule={module} />;
};

export const MainContent = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
} = {}) => {
  const moduleCache = use(ModuleCacheContext);
  // TODO: when to invalidate?
  const candidatesExistPromise = useMemo(() => Promise.all(candidates.map(fileExists)), []);
  return (
    <Suspense fallback={<LoadingComponent />}>
      <MainContentInner LoadingComponent={LoadingComponent} ErrorComponent={ErrorComponent} candidatesExistPromise={candidatesExistPromise} />
    </Suspense>
  );
};
