import * as v from 'valibot';
import matter from 'gray-matter';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const postSchema = v.object({
  title: v.string([v.minLength(1), v.maxLength(100)]),
  slug: v.string([
    v.minLength(1),
    v.maxLength(100),
    v.custom((input) => /^[a-z0-9-]+$/g.test(input), 'Invalid slug'),
  ]),
  preview: v.string([v.minLength(1), v.maxLength(150)]),
  image: v.transform(
    v.string([v.minLength(1), v.maxLength(25)]),
    (img) =>
      `https://raw.githubusercontent.com/Kyoso-Team/md-content/main/blog/media/${img}`
  ),
  tags: v.array(
    v.union([
      v.literal('Development'),
      v.literal('Announcement'),
      v.literal('Update'),
      v.literal('Tutorial'),
    ])
  ),
  published_at: v.transform(v.date(), (date) => date.toISOString()),
  author: v.object({
    osu_user_id: v.number([v.integer(), v.minValue(1)]),
    osu_username: v.string([v.minLength(1), v.maxLength(15)]),
  }),
});

async function main() {
  const blogDir = `${process.cwd()}/blog`;
  const files = readdirSync(blogDir).sort();
  files.splice(files.indexOf('media'), 1);
  const posts = [];

  for (const file of files) {
    const content = readFileSync(`${blogDir}/${file}`, 'utf8');
    const md = matter(content);
    const validated = v.safeParse(postSchema, md.data);

    if (!validated.success) {
      const issues = v.flatten(validated.issues);
      throw Error(
        `Error validating frontmatter for file "${file}":\n${JSON.stringify(
          issues.nested
        )}`
      );
    }

    posts.push(validated.output);
  }

  const output = {
    posts,
    tags: ['Development', 'Announcement', 'Update', 'Tutorial'],
  };
  writeFileSync(`${process.cwd()}/.dist/blog.json`, JSON.stringify(output), {
    encoding: 'utf-8',
  });
}

main().then(() => process.exit(0));
