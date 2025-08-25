import { Suspense, createContext, use, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ModuleCacheContext } from './moduleCache';
import { EvaluationContext } from './sandboxTypes';

export type RenderFileContextType = {
  evaluationContext: EvaluationContext;
};

export const RenderExportedComponentContext = createContext<RenderFileContextType | null>(null);

export const defaultLoadingComponent = () => <>loading...</>;

export const defaultErrorComponent = () => <>ERROR</>;

export const RenderExportedComponent = ({
  evaluationContextPromise,
  exportedSymbol = 'default',
}: {
  evaluationContextPromise: Promise<EvaluationContext>;
  exportedSymbol: string;
}) => {
  const evaluationContext = use(evaluationContextPromise);
  // TODO: handle case where exported symbol not found.
  const renderedComponent = useMemo(() => {
    const Component = exportedSymbol === '*' ? evaluationContext.exports : evaluationContext.exports[exportedSymbol];
    return (
      <RenderExportedComponentContext value={{ evaluationContext }}>
        <Component />
      </RenderExportedComponentContext>
    );
  }, [exportedSymbol]);
  return renderedComponent;
};

export const Include = ({
  filename,
  exportedSymbol = 'default',
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
  baseModule,
}: {
  filename: string;
  exportedSymbol?: string;
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
  baseModule?: EvaluationContext;
}) => {
  const moduleCache = use(ModuleCacheContext);
  // @ts-ignore
  const evaluationContextPromise = moduleCache!.getEvaluationContext(filename, baseModule ?? module);
  return (
    <ErrorBoundary fallback={<ErrorComponent />}>
      <Suspense fallback={<LoadingComponent />}>
        <RenderExportedComponent evaluationContextPromise={evaluationContextPromise} exportedSymbol={exportedSymbol} />
      </Suspense>
    </ErrorBoundary>
  );
};
