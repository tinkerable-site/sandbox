import { Suspense, createContext, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { EvaluationContext } from './sandboxTypes';
import { ModuleCacheContext } from './moduleCache';

export type RenderFileContextType = {
  evaluationContext: EvaluationContext;
};

export const RenderExportedComponentContext = createContext<RenderFileContextType | null>(null);

export const defaultLoadingComponent = () => <>loading...</>;

export const defaultErrorComponent = () => <>ERROR</>;

export const RenderExportedComponent = ({
  evaluationContextPromise,
  exportedSymbol="default"
}: {
  evaluationContextPromise: Promise<EvaluationContext>,
  exportedSymbol:string
}) => {
  const evaluationContext = use(evaluationContextPromise);
  // TODO: handle case where exported symbol not found.
  const Component = exportedSymbol === '*' ? evaluationContext.exports : evaluationContext.exports[exportedSymbol];
  return (
    <RenderExportedComponentContext value={{ evaluationContext }}>
      <Component />
    </RenderExportedComponentContext>
  );
};

export const Include = ({
  filename,
  exportedSymbol="default",
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  filename: string;
  exportedSymbol?: string;
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
}) => {
  const moduleCache = use(ModuleCacheContext);
  // @ts-ignore
  const evaluationContextPromise = moduleCache!.getEvaluationContext(filename, module);
  return (
    <ErrorBoundary fallback={<ErrorComponent />}>
      <Suspense fallback={<LoadingComponent />}>
        <RenderExportedComponent evaluationContextPromise={evaluationContextPromise} exportedSymbol={exportedSymbol}/>
      </Suspense>
    </ErrorBoundary>
  );
};
