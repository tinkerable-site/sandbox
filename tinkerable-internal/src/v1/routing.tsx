import * as React from 'react';
import { BrowserRouter, useParams } from 'react-router';

import { defaultErrorComponent, defaultLoadingComponent, withAsyncComponent } from './AsyncComponent';
import { sendMessage } from './sandboxUtils';

const ensureLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const makeLocation = (myLocation = window.location, pathname?: string, search?: string, hash?: string) => {
  const result = {
    ...JSON.parse(JSON.stringify(myLocation)),
    pathname: pathname ?? myLocation.pathname,
    search: search ?? myLocation.search,
    hash: hash ?? myLocation.hash,
    /*
    assign: (url: string) => {
      result.pathname = url;
      sendMessage('urlchange', { url, back: false, forward: true });
    },*/
  } as typeof window.location;
  return result;
};

const makeWindow = (myLocation: typeof window.location) => {
  let eventListeners: {type: string, handler: EventListenerOrEventListenerObject}[] = [];
  const invokeListeners = (type: string, event: any) => {
    eventListeners.filter(l => l.type === type).forEach(({handler}) => {
      if (typeof(handler) === 'function') {
        handler(event);
      } else {
        handler.handleEvent(event);
      }
    })
  }
  // Instead of a stack of history entries, we only store a single state object
  // the *actual* history stack is recorded by the parent Window.
  const historyState:{data:any, url:string | URL | null}[] = []
  const myWindow = {
    location: myLocation,
    history: {
      pushState(data: any, unused: string, url: string | URL | null): void {
        historyState.push({data, url});
        const strUrl = String(url);
        if (strUrl) {
          // TODO: update hash and search fields of myLocation if necessary.
          myLocation.pathname = strUrl;
          // Notify parent that the URL (and possibly active file) should be
          // updated.
          sendMessage('urlchange', { url: strUrl, back: false, forward: true });
        }
      },
      replaceState: (...args: any[]) => {
        console.log('replaceState', args);
      },
      length: 1,
      scrollRestoration: 'auto',
      state: null
    } as typeof window.history.state,
    addEventListener: (...args:Parameters<typeof window.addEventListener>):void => {
      eventListeners.push({type: args[0], handler: args[1]})
    },
    removeEventListener: (...args:Parameters<typeof window.removeEventListener>) => {
      eventListeners = eventListeners.filter(({type, handler}) => (type !== args[0]) && (handler !== args[1]));
    },
  } as typeof window;
  // @ts-ignore
  module.evaluation.module.bundler.messageBus.onMessage((msg) => {
    if (msg.type === "urlchange") {
      // TODO: update hash and search fields of myLocation if necessary.
      myLocation.pathname = ensureLeadingSlash(msg.url);
      invokeListeners('popstate', null);
    }
  });
  return myWindow;
};

export const SandboxRouter = ({ children }: { children?: React.ReactNode }) => {
  const pathname = ensureLeadingSlash(new URLSearchParams(window.location.search).get('location') ?? '/');
  const search = new URLSearchParams(window.location.search).get('search') ?? '';
  const hash = new URLSearchParams(window.location.search).get('hash') ?? '';
  const myLocation = makeLocation(window.location, pathname, search, hash);
  const myWindow = makeWindow(myLocation);
  return <BrowserRouter window={myWindow}>{children}</BrowserRouter>;
};

export const Path: React.FC = ({
  loadingComponent = defaultLoadingComponent,
  errorComponent = defaultErrorComponent,
}: {
  loadingComponent?: typeof defaultLoadingComponent;
  errorComponent?: typeof defaultErrorComponent;
}) => {
  // TODO: error handling
  let params = useParams();
  // prefix with '/' to make URL more natural
  let filePath = '/' + params['*'];
  const Component = withAsyncComponent(
    // module.dynamicImport is defined in the sandbox environment.
    // Note that dynamicImport is always relative to the current module,
    // in this case @tinkerable/internal/v1, but this is ok since
    // <Path> only makes sense with absolute module paths.
    // @ts-ignore
    module.dynamicImport(filePath),
    loadingComponent,
    errorComponent
  );
  return <Component />;
};
