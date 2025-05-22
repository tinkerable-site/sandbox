import { useState, useEffect, ComponentType } from "react";

const defaultLoadingComponent = () => <>loading...</>;

const defaultErrorComponent = ({error}:{error:string}) => <>{error}</>;

// Content is a ReactNode, a Promise resolving to a ReactNode or an (async) function returning a ReactNode.
export type AsyncComponent =
  | Promise<ComponentType<any>> // promise to a component
  | (() => Promise<ComponentType<any>>) // async function producing component

export const withAsyncComponent = (
  asyncComponent: AsyncComponent,
  loadingComponent: ComponentType = defaultLoadingComponent,
  errorComponent: ComponentType<any> = defaultErrorComponent
) => {
  const WithAsyncComponent:ComponentType = (props) => {
    const [rejectionCause, setRejectionCause] = useState<any>(null);
    // put the component in an object property so useState doesn't invoke it
    // mistaking it for a state update function
    const [resolvedValue, setResolvedValue] = useState<{fn: ComponentType<any>} | null>(null);
    useEffect(() => {
      Promise.resolve(typeof asyncComponent === "function" ? asyncComponent() : asyncComponent).then(
        resolved => {
          setResolvedValue({fn: resolved});
        },
        setRejectionCause
      );
    }, []);
    let Component = loadingComponent;
    if (rejectionCause !== null) {
      Component = errorComponent;
      props = {...props, error: rejectionCause}
    }
    if (resolvedValue !== null) {
      Component = resolvedValue.fn
    }
    return <Component {...props} />;
  }
  WithAsyncComponent.displayName = 'WithAsyncComponent';
  return WithAsyncComponent;
};
