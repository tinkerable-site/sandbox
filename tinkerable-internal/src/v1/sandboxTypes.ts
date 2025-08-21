export type ModuleExports = any

// The real type is EvaluationContext from src/bundler/module/Evaluation.ts:6
export type EvaluationContext = {
  exports: ModuleExports;
  dynamicImport: (moduleToImport: string, symbolToImport:string) => Promise<ModuleExports>;
  getModuleEvaluationContext: (moduleName: string) =>  Promise<EvaluationContext>;
  resolve: (moduleName: string) => Promise<string>;
  evaluation: {
    module: {
      source: string;
      filepath: string;
    }
  }
}
