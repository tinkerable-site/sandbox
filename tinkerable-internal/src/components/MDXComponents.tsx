import { ReactNode, use, useCallback } from 'react';
import { navigate } from '../routing';
import { TinkerableContext } from '../TinkerableContext';
import { constructOuterUrl, constructUrl, isInternalHref, repositoryPrefixURL } from '../urlUtils';

export const InternalLink = ({
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

export const Link = ({
  href,
  children,
  ...properties
}: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>): ReactNode => {
  const { outerHref, navigationState } = use(TinkerableContext);
  if (href && isInternalHref(outerHref, href, navigationState)) {
    const targetHref = constructOuterUrl(outerHref, href, navigationState);
    return (
      <InternalLink href={targetHref} {...properties}>
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
