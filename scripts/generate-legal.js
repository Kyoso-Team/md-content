import * as v from 'valibot';
import matter from 'gray-matter';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const legalDocSchema = v.object({
  title: v.string([v.minLength(1), v.maxLength(100)]),
  slug: v.string([
    v.minLength(1),
    v.maxLength(100),
    v.custom((input) => /^[a-z0-9-]+$/g.test(input), 'Invalid slug'),
  ]),
});

async function main() {
  const legalDir = `${process.cwd()}/legal`;
  const files = readdirSync(legalDir);
  const docs = [];

  for (const file of files) {
    const content = readFileSync(`${legalDir}/${file}`, 'utf8');
    const md = matter(content);
    const validated = v.safeParse(legalDocSchema, md.data);

    if (!validated.success) {
      const issues = v.flatten(validated.issues);
      throw Error(
        `Error validating frontmatter for file "${file}":\n${JSON.stringify(
          issues.nested
        )}`
      );
    }

    docs.push(validated.output);
  }

  writeFileSync(`${process.cwd()}/.dist/legal.json`, JSON.stringify(docs), {
    encoding: 'utf-8',
  });
}

main().then(() => process.exit(0));
