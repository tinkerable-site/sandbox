import { lazy, Suspense, useCallback, useContext, type ReactNode } from 'react';
import { isInternalHref, constructUrl, parseTarget, resolveRelativePath, isAbsolutePath } from './urlUtils';
import { NavigationState, TinkerableContext } from './TinkerableContext';
import {navigate} from './routing'
import { RenderFileContext, defaultLoadingComponent as LoadingComponent } from './render';

export const BasicInternalLink = ({
  props: {href, otherProps},
  children,
}: {
  props: Record<string, any>;
  children: ReactNode[];
}): ReactNode => {
  const clickHandler = useCallback((e) => {
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

export const RelativeInternalLink = ({
  props,
  children,
  nextNavigationState,
  evaluation
}: {
  props: Record<string, any>;
  children: ReactNode[];
  nextNavigationState: NavigationState;
  evaluation:any
}) => {
  const Component = lazy(async () => {
    const navigationState = await resolveRelativePath(nextNavigationState, evaluation);
    const href = constructUrl(navigationState)
    return {
      default: () => <BasicInternalLink props={{href, ...props}}>{children}</BasicInternalLink>
    }
  });
  return <Suspense fallback={<LoadingComponent />}><Component /></Suspense>
}

export const InternalLink = ({
  to,
  props,
  children,
}: {
  to:string;
  props: Record<string, any>;
  children: ReactNode[];
}): ReactNode => {
  const evaluationContext = useContext(RenderFileContext);
  const {context: {navigation}} = useContext(TinkerableContext);
  let nextNavigationState = parseTarget(to, navigation);
  if (!isAbsolutePath(nextNavigationState.path) && evaluationContext !== null) {
    return <RelativeInternalLink props={props} evaluation={evaluationContext.evaluation} nextNavigationState={nextNavigationState}>{children}</RelativeInternalLink>
  }
  const outerLink = constructUrl(nextNavigationState);
  return <BasicInternalLink
    props={{href: outerLink, props}}
    >
      {children}
    </BasicInternalLink>
}

export const Link = ({
  props: {href, otherProps},
  children,
}: {
  props: Record<string, any>;
  children: ReactNode[];
}): ReactNode => {
  const {context} = useContext(TinkerableContext)
  if (isInternalHref(href)) {
    return <InternalLink to={href} props={otherProps}>{children}</InternalLink>
  } else {
    // create a regular link
    return <a {...{href, ...otherProps}} >{children}</a>
  }
};

export const DEFAULT_MDX_COMPONENTS = {
  a({ children, ...properties }) {
    return <Link props={properties}>{children}</Link>;
  },
};
