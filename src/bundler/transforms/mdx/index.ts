import { Bundler } from '../../bundler';
import { ITranspilationContext, ITranspilationResult, Transformer } from '../Transformer';
import { compile } from '@mdx-js/mdx'
import { VFile } from 'vfile'
import remarkFrontmatter from 'remark-frontmatter'
import { saveFrontmatterPlugin } from './frontmatter-plugin'
import { BundlerError } from '../../../errors/BundlerError';
import {VFileMessage} from 'vfile-message'

export class MDXTransformer extends Transformer {

  private recmaPlugins = [];
  private rehypePlugins = [];
  private remarkPlugins = [
    remarkFrontmatter
  ];

  constructor() {
    super('mdx-transformer');
  }

  async init(bundler: Bundler): Promise<void> {

  }

  async transform(ctx: ITranspilationContext, config: any): Promise<ITranspilationResult> {


    const file = new VFile({
      path: ctx.module.filepath,
      value: ctx.code
    })
    try {
      const compilerOutput = await compile(file, {
        development: true,
        jsx: false,
        outputFormat: 'program',
        recmaPlugins: this.recmaPlugins,
        rehypePlugins: this.rehypePlugins,
        remarkPlugins: [
          ...this.remarkPlugins,
          [saveFrontmatterPlugin, ctx.module]
        ]
      })

      return {
        code: String(compilerOutput.value),
        // TODO: get required modeuls
        dependencies: new Set([]),
      };
    } catch (e) {
      const err = new BundlerError(String(e), ctx.module.filepath)
      if (e instanceof VFileMessage) {
        err.line = e.line;
        err.column = e.column;
        err.message = e.message;
      }
      return err
    }
  }
}
