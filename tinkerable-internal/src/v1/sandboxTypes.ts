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

export type Metadata = Record<string, any>;
export type FilesMetadata = Record<string, Metadata>;
export type FileQueryResult = string[]
export type MetadataQueryFunction = (filesMetadata:FilesMetadata) => FileQueryResult;
export type MetadataQueryResult = {result: FileQueryResult} | {error: any}
