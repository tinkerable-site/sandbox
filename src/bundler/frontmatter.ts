import matter from 'gray-matter';

export type FrontmatterParseResult = {
    data: Record<string, any>;
    content: string;
}

const excerpt_separator = '<More />';

export const parseFrontmatter = (code: string):FrontmatterParseResult => {
  const {data, excerpt, content} = matter(code, {excerpt: true, excerpt_separator});
  if (excerpt) {
    data['excerpt'] = excerpt
    return {data, content: content.substring(excerpt.length + excerpt_separator.length).trimStart()}
  }
  return {data, content}
}
