import { Bundler } from '../../bundler';
import { ITranspilationContext, ITranspilationResult, Transformer } from '../Transformer';
import {compile} from '@mdx-js/mdx'
import {VFile} from 'vfile'

export class MDXTransformer extends Transformer {

  private recmaPlugins = [];
  private rehypePlugins = [];
  private remarkPlugins = [];

  constructor() {
    super('mdx-transformer');
  }

  async init(bundler: Bundler): Promise<void> {

  }

  async transform(ctx: ITranspilationContext, config: any): Promise<ITranspilationResult> {

    const file = new VFile({
      path: ctx.module.filepath,
      valu: ctx.code
    })

    const compilerOutput = await compile(file, {
      development: true,
      jsx: false,
      outputFormat: 'program',
      recmaPlugins: this.recmaPlugins,
      rehypePlugins: this.rehypePlugins,
      remarkPlugins: this.remarkPlugins
    })

    return {
      code: String(compilerOutput.value),
      // TODO: get required modeuls
      dependencies: new Set([]),
    };
  }
}
