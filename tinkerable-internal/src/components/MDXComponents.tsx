import { ReactNode, Suspense, use, useCallback, useMemo } from 'react';

import { defaultLoadingComponent as LoadingComponent } from './defaults';
import { ModuleCacheContext } from '../moduleCache';
import { FILES_PREFIX, navigate } from '../routing';
import { NavigationState, TinkerableContext } from '../TinkerableContext';
import { constructUrl, isAbsolutePath, isInternalHref, parseTarget } from '../urlUtils';
import { RenderExportedComponentContext } from './Include';

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
  const outerLink = constructUrl({ ...navigationState, sandboxPath: `${FILES_PREFIX}${resolvedPath}` });
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
  const pathPromise = useMemo(() => moduleCacheContext.resolveModuleName(navigationState.sandboxPath, mod), [navigationState]);
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
  const { navigation } = use(TinkerableContext);
  let nextNavigationState = parseTarget(to, navigation);
  if (!isAbsolutePath(nextNavigationState.sandboxPath)) {
    return (
      <RelativeInternalLink props={props} navigationState={nextNavigationState}>
        {children}
      </RelativeInternalLink>
    );
  }
  // add FILES_PREFIX to the path
  nextNavigationState.sandboxPath = `${FILES_PREFIX}${nextNavigationState.sandboxPath}`;
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
