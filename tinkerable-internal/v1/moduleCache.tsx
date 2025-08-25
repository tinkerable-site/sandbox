// based on: https://www.bbss.dev/posts/react-learn-suspense/#fetchcache-provider

import { createContext, ReactNode, useCallback, useState } from "react"
import { EvaluationContext } from "./sandboxTypes";
import { addListener } from "./sandboxUtils";

export class ModuleCache {
  nameResolutionPromises: Record<string, Promise<string>> = {}
  evaluationContextPromises: Record<string, Promise<EvaluationContext>> = {}

  constructor() {
    // reset cache on compile
    addListener('compile', () => {
      // NOTE: THIS CAUSES AN UNNECESSARY RELOAD
      // the <Include> component's module evaluation context promise is replaced
      // with a new promise for the same value when a compilation occurs which
      // doesn't affect the current module. Commenting out the following lines
      // eliminates the unnecessary component state loss.
      // this.nameResolutionPromises = {};
      // this.evaluationContextPromises = {};
    })
  }

  private getCacheKey(mod:EvaluationContext, moduleName:string):string {
    return `${mod.evaluation.module.filepath}|${moduleName}`;
  }

  resolveModuleName(moduleName:string, baseModule?:EvaluationContext):Promise<string> {
    // note: uses current module (v1.js) as base module if none specified by caller
    // @ts-ignore
    const mod = baseModule ?? (module as EvaluationContext);
    const cacheKey = this.getCacheKey(mod, moduleName);
    if (!(cacheKey in this.nameResolutionPromises)) {
      this.nameResolutionPromises[cacheKey] = mod.resolve(moduleName);
    }
    return this.nameResolutionPromises[cacheKey];
  }

  getEvaluationContext(moduleName:string, baseModule?:EvaluationContext):Promise<EvaluationContext> {
    // note: uses current module (v1.js) as base module if none specified by caller
    // @ts-ignore
    const mod = baseModule ?? (module as EvaluationContext);
    const cacheKey = this.getCacheKey(mod, moduleName);
    if (!(cacheKey in this.evaluationContextPromises)) {
      this.evaluationContextPromises[cacheKey] = mod.getModuleEvaluationContext(moduleName);
    }
    return this.evaluationContextPromises[cacheKey];

  }
}

export const ModuleCacheContext = createContext<null|ModuleCache>(null)

export const ModuleCacheContextProvider = ({ children, moduleCache }:{ children:ReactNode, moduleCache: ModuleCache }) => {

    return (
        <ModuleCacheContext.Provider value={moduleCache}>
            {children}
        </ModuleCacheContext.Provider>
    )
}
