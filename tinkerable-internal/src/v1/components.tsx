import { Suspense, use, useCallback, useContext, type ReactNode } from 'react';
import { isInternalHref, constructUrl, parseTarget, isAbsolutePath } from './urlUtils';
import { NavigationState, TinkerableContext } from './TinkerableContext';
import {navigate} from './routing'
import { RenderExportedComponentContext, defaultLoadingComponent as LoadingComponent } from './include';
import { ModuleCacheContext } from './moduleCache';

export const BasicInternalLink = ({
  props: {href, otherProps},
  children,
}: {
  props: Record<string, any>;
  children: ReactNode;
}): ReactNode => {
  const clickHandler = useCallback((e:Event) => {
   e.preventDefault();
   navigate(href);
 }, [href]);
  return <a
    href={href}
    onClick={clickHandler}
    {...otherProps}
    >
      {children}
    </a>
}

export const RelativeInternalLinkHelper = ({
  props,
  children,
  navigationState,
  pathPromise
}: {
  props: Record<string, any>;
  children: ReactNode;
  navigationState: NavigationState;
  pathPromise: Promise<string>
}) => {
  const resolvedPath = use(pathPromise);
  const outerLink = constructUrl({...navigationState, path: resolvedPath})
  return <BasicInternalLink
    props={{...props, href: outerLink, }}
    >
      {children}
    </BasicInternalLink>
}

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
  if ((renderContext === null) || (moduleCacheContext === null)) {
    throw new Error('renderContext and moduleCacheContext must be defined')!
  }
  const mod = renderContext.evaluationContext;
  const pathPromise = moduleCacheContext.resolveModuleName(navigationState.path, mod);
  return <Suspense fallback={<LoadingComponent />}>
    <RelativeInternalLinkHelper props={props} navigationState={navigationState} pathPromise={pathPromise}>
      {children}
    </RelativeInternalLinkHelper>
  </Suspense>
}

export const InternalLink = ({
  to,
  props,
  children,
}: {
  to:string;
  props: Record<string, any>;
  children: ReactNode;
}): ReactNode => {
  const {context: {navigation}} = use(TinkerableContext);
  let nextNavigationState = parseTarget(to, navigation);
  if (!isAbsolutePath(nextNavigationState.path)) {
    return <RelativeInternalLink props={props} navigationState={nextNavigationState}>{children}</RelativeInternalLink>
  }
  const outerLink = constructUrl(nextNavigationState);
  return <BasicInternalLink
    props={{...props, href: outerLink, }}
    >
      {children}
    </BasicInternalLink>
}

export const Link = ({
  props: {href, otherProps},
  children,
}: {
  props: Record<string, any>;
  children: ReactNode;
}): ReactNode => {
  const {context} = useContext(TinkerableContext)
  if (isInternalHref(href)) {
    return <InternalLink to={href} props={otherProps}>{children}</InternalLink>
  } else {
    // create a regular link to external resource
    return <a {...{href, ...otherProps}} >{children}</a>
  }
};

export const DEFAULT_MDX_COMPONENTS = {
  a({ children, ...properties }: {children:ReactNode, properties:any}) {
    return <Link props={properties}>{children}</Link>;
  },
};
