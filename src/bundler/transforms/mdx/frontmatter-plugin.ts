// based on https://github.com/remcohaszing/remark-mdx-frontmatter/blob/main/src/remark-mdx-frontmatter.ts
import { type Literal, type Root } from 'mdast'
import { type Plugin } from 'unified'
import { parse } from 'yaml'
import { Module } from '../../module/Module';


export const saveFrontmatterPlugin: Plugin<[Module], Root> = (module: Module) => {

  return (ast, file) => {
    let data: unknown
    const node = ast.children.find((child) => child.type == 'yaml')

    if (node) {

      const { value } = node as Literal
      // TODO: handle YAML parsing error
      data = parse(value)
      module.metadata = data as Record<string, any>
    }

  }
}

