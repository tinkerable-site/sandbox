// Based on https://github.com/mdx-js/mdx/blob/main/packages/react/lib/index.js
// since sandpack-bundler cannot import @mdx-js/react as it chokes on the
// transitive dependency on VFile.
import {createContext, useContext, useMemo, createElement} from 'react'
const emptyComponents = {}

const MDXContext = createContext(emptyComponents);

export function useMDXComponents(components:any) {
  const contextComponents = useContext(MDXContext)

  // Memoize to avoid unnecessary top-level context changes
  return useMemo(
    function () {
      // Custom merge via a function prop
      if (typeof components === 'function') {
        return components(contextComponents)
      }

      return {...contextComponents, ...components}
    },
    [contextComponents, components]
  )
}

export function MDXProvider(properties:any) {

  let allComponents: any

  if (properties.disableParentContext) {
    allComponents =
      typeof properties.components === 'function'
        ? properties.components(emptyComponents)
        : properties.components || emptyComponents
  } else {
    allComponents = useMDXComponents(properties.components)
  }

  return createElement(
    MDXContext.Provider,
    {value: allComponents},
    properties.children
  )
}
