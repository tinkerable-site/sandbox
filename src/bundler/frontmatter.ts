import matter from 'gray-matter';

export type FrontmatterParseResult = {
    data: {
        [key: string]: any;
    };
    content: string;
}

export const parseFrontmatter = (code: string):FrontmatterParseResult => {
  const {data, excerpt, content} = matter(code, {excerpt: true});
  if (excerpt) {
    data['excerpt'] = excerpt
  }
  return {data, content}
}
