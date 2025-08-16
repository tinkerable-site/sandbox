import { useCallback, useContext, type ReactNode } from 'react';
import { isInternalHref, constructUrl, parseTarget } from './urlUtils';
import { TinkerableContext } from './TinkerableContext';
import {navigate} from './routing'

export const InternalLink = ({
  to,
  props,
  children,
}: {
  to:string;
  props: Record<string, any>;
  children: ReactNode[];
}): ReactNode => {
  const {context: {navigation}} = useContext(TinkerableContext);
  const outerLink = constructUrl(parseTarget(to, navigation));
  const clickHandler = useCallback((e) => {
   e.preventDefault();
   navigate(outerLink);
 }, [outerLink]);
  return <a
    href={outerLink}
    onClick={clickHandler}
    {...props}
    >
      {children}
    </a>
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
