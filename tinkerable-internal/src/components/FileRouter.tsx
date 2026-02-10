import type { FC } from 'react';
import { useContext } from 'react';

import { TinkerableContext } from '../TinkerableContext';
import { defaultErrorComponent, defaultLoadingComponent } from './defaults';
import { Include } from './Include';

export const FileRouter: FC = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
} = {}) => {
  const { navigation: { pathParameters, sandboxPath } } = useContext(TinkerableContext);
  const filename = pathParameters?.filename;
  if (!filename) {
    return <ErrorComponent error={new Error(`No filename could be extracted from ${sandboxPath}`)} resetErrorBoundary={() => {}}/>;
  }
  return <Include
    filename={filename}
    LoadingComponent={LoadingComponent}
    ErrorComponent={ErrorComponent}
    // @ts-ignore
    baseModule={module}
  />
};
