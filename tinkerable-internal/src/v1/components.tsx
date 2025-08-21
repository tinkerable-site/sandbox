import { ReactNode, Suspense, use, useCallback, useContext } from 'react';

import { defaultLoadingComponent as LoadingComponent, RenderExportedComponentContext } from './include';
import { ModuleCacheContext } from './moduleCache';
import { navigate } from './routing';
import { NavigationState, TinkerableContext } from './TinkerableContext';
import { constructUrl, isAbsolutePath, isInternalHref, parseTarget } from './urlUtils';

export const BasicInternalLink = ({
  href,
  children,
  ...props
}: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>): ReactNode => {
  const clickHandler = useCallback(
    (e: any) => {
      if (href) {
        e.preventDefault();
        navigate(href);
      }
    },
    [href]
  );
  return (
    <a href={href} onClick={clickHandler} {...props}>
      {children}
    </a>
  );
};

export const RelativeInternalLinkHelper = ({
  props,
  children,
  navigationState,
  pathPromise,
}: {
  props: Record<string, any>;
  children: ReactNode;
  navigationState: NavigationState;
  pathPromise: Promise<string>;
}) => {
  const resolvedPath = use(pathPromise);
  const outerLink = constructUrl({ ...navigationState, path: resolvedPath });
  return (
    <BasicInternalLink {...props} href={outerLink}>
      {children}
    </BasicInternalLink>
  );
};

export const RelativeInternalLink = ({
  props,
  children,
  navigationState,
}: {
  props: Record<string, any>;
  children: ReactNode;
  navigationState: NavigationState;
}) => {
  const renderContext = use(RenderExportedComponentContext);
  const moduleCacheContext = use(ModuleCacheContext);
  if (renderContext === null || moduleCacheContext === null) {
    throw new Error('renderContext and moduleCacheContext must be defined')!;
  }
  const mod = renderContext.evaluationContext;
  const pathPromise = moduleCacheContext.resolveModuleName(navigationState.path, mod);
  return (
    <Suspense fallback={<LoadingComponent />}>
      <RelativeInternalLinkHelper props={props} navigationState={navigationState} pathPromise={pathPromise}>
        {children}
      </RelativeInternalLinkHelper>
    </Suspense>
  );
};

export const InternalLink = ({
  to,
  children,
  ...props
}: { to: string } & React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>): ReactNode => {
  const {
    context: { navigation },
  } = use(TinkerableContext);
  let nextNavigationState = parseTarget(to, navigation);
  if (!isAbsolutePath(nextNavigationState.path)) {
    return (
      <RelativeInternalLink props={props} navigationState={nextNavigationState}>
        {children}
      </RelativeInternalLink>
    );
  }
  const outerLink = constructUrl(nextNavigationState);
  return (
    <BasicInternalLink href={outerLink} {...props}>
      {children}
    </BasicInternalLink>
  );
};

export const Link = ({
  href,
  children,
  ...properties
}: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>): ReactNode => {
  const { context } = useContext(TinkerableContext);
  if (href && isInternalHref(href)) {
    return (
      <InternalLink to={href} {...properties}>
        {children}
      </InternalLink>
    );
  } else {
    // create a regular link to external resource
    return <a {...{ href, ...properties }}>{children}</a>;
  }
};

export const DEFAULT_MDX_COMPONENTS = {
  a({
    href,
    children,
    ...properties
  }: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) {
    return (
      <Link href={href} {...properties}>
        {children}
      </Link>
    );
  },
};
