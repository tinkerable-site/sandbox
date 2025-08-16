import * as logger from '../../utils/logger';
import evaluate from './eval';
import { HotContext } from './hot';
import { Module } from './Module';

class EvaluationContext {

  exports: any;
  globals: any;
  hot: HotContext;
  id: string;
  metadata: Record<string, any> | null = null;
  evaluation: Evaluation;

  constructor(evaluation: Evaluation) {
    this.exports = {};
    this.globals = {};
    this.hot = evaluation.module.hot;
    this.id = evaluation.module.id;
    this.metadata = evaluation.module.metadata;
    this.evaluation = evaluation;
  }

  async dynamicImport(moduleToImport: string, symbolToImport = 'default'): Promise<any> {
    const resolvedModuleName = await this.evaluation.module.bundler.resolveAsync(
      moduleToImport,
      this.evaluation.module.filepath
    );
    this.evaluation.module.addDependency(resolvedModuleName);
    const module = await this.evaluation.module.bundler.transformModule(resolvedModuleName)
    const evaluation = module.evaluate()
    return symbolToImport == '*' ? evaluation.context.exports : evaluation.context.exports[symbolToImport];
  }

  async resolve(moduleName: string): Promise<string | undefined> {
    try {
      return await this.evaluation.module.bundler.resolveAsync(
        moduleName,
        this.evaluation.module.filepath
      );
    } catch {
      return undefined
    }
  }
}

export class Evaluation {
  module: Module;
  context: EvaluationContext;

  constructor(module: Module) {
    this.module = module;

    const code = module.compiled + `\n//# sourceURL=${location.origin}${this.module.filepath}`;

    this.context = new EvaluationContext(this);
    this.context.exports = evaluate(code, this.require.bind(this), this.context, {}, {});
  }

  require(specifier: string): any {
    const moduleFilePath = this.module.dependencyMap.get(specifier);
    if (!moduleFilePath) {
      logger.debug('Require', {
        dependencies: this.module.dependencyMap,
        specifier,
      });

      throw new Error(`Dependency "${specifier}" not collected from "${this.module.filepath}"`);
    }
    const module = this.module.bundler.getModule(moduleFilePath);
    if (!module) {
      throw new Error(`Module "${moduleFilePath}" has not been transpiled`);
    }
    return module.evaluate().context.exports ?? {};
  }
}
