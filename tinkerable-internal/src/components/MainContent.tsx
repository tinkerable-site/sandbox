import { Suspense, use, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FILES_PREFIX, navigate, useTinkerableLink } from '../routing';

import { defaultErrorComponent, defaultLoadingComponent } from './defaults';

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

export const MainContentRedirect = ({filename}:{filename:string}) => {
  const url = useTinkerableLink(filename);
  navigate(url);
  return <>Redirecting to {filename}</>;
}

export const MainContentInner = ({
  candidatesExistPromise,
}: {
  candidatesExistPromise: Promise<[string, boolean][]>;
}) => {
  const candidatesExist = use(candidatesExistPromise);
  const filename = candidatesExist.find(([_, exists]) => exists)?.[0];
  if (!filename) {
    // todo: show file list
    throw new Error(`No main content file present`);
  }
  return <MainContentRedirect filename={FILES_PREFIX + filename}/>;
};

export const MainContent = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
} = {}) => {
  // TODO: when to invalidate?
  const candidatesExistPromise = useMemo(() => Promise.all(candidates.map(fileExists)), []);
  return (
    <ErrorBoundary fallbackRender={ErrorComponent}>
      <Suspense fallback={<LoadingComponent />}>
        <MainContentInner candidatesExistPromise={candidatesExistPromise} />
      </Suspense>
    </ErrorBoundary>
  );
};
