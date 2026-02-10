import { ErrorBoundaryPropsWithRender } from 'react-error-boundary';

export const defaultLoadingComponent = () => <>loading...</>;

export const defaultErrorComponent:ErrorBoundaryPropsWithRender["fallbackRender"] = ({error}) => <>ERROR {String(error)}</>;
