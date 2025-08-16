import { Suspense, createContext, lazy } from 'react';

export type RenderFileContextType = {
  evaluation: any;
};

export const RenderFileContext = createContext<RenderFileContextType | null>(null);

export const defaultLoadingComponent = () => <>loading...</>;

export const defaultErrorComponent = ({ error }: { error: string }) => <>{error}</>;

export const RenderFile = ({
  filename,
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  filename: string;
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
}) => {
  const MyComponent = lazy(async () => {
    try {
      // @ts-ignore
      const evaluation = await module.getModuleEvaluation(filename);
      const Component = evaluation.context.exports.default;
      return {
        default: () => (
          <RenderFileContext value={{evaluation}}>
            <Component />
          </RenderFileContext>
        )
      }
    } catch (e) {
      return {
        default: () => <ErrorComponent error={String(e)} />,
      };
    }
  });
  // TODO: add react error boundary
  return (
      <Suspense fallback={<LoadingComponent />}>
        <MyComponent />
      </Suspense>
  );
};
