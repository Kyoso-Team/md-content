import * as v from 'valibot';
import Fuse from 'fuse.js';
import matter from 'gray-matter';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const postSchema = v.object({
  id: v.number([v.integer(), v.minValue(1)]),
  title: v.string([v.minLength(1), v.maxLength(100)]),
  slug: v.string([
    v.minLength(1),
    v.maxLength(100),
    v.custom((input) => /^[a-z0-9-]+$/g.test(input), 'Invalid slug'),
  ]),
  preview: v.string([v.minLength(1), v.maxLength(150)]),
  published_at: v.transform(v.date(), (date) =>
    date.toISOString().slice(0, 10)
  ),
  tags: v.transform(
    v.optional(
      v.array(
        v.union([
          v.literal('Development'),
          v.literal('Announcement'),
          v.literal('Update'),
          v.literal('Tutorial'),
        ])
      )
    ),
    (input) => input || []
  ),
  authors: v.array(
    v.object({
      osu_user_id: v.number([v.integer(), v.minValue(1)]),
      osu_username: v.string([v.minLength(1), v.maxLength(15)]),
    })
  ),
});

async function main() {
  const blogDir = `${process.cwd()}/blog`;
  const files = readdirSync(blogDir)
    .filter((file) => file.includes('.md'))
    .sort();
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

  const authors = Object.fromEntries(
    posts
      .flatMap((post) => post.authors)
      .map((author) => [author.osu_user_id, author.osu_username])
  );
  const tags = Object.fromEntries(
    [...new Set(posts.flatMap((post) => post.tags))].map((tag, i) => [
      (i + 1).toString(),
      { name: tag, slug: tag.toLowerCase().replace(/ /g, '-') },
    ])
  );
  const tagNames = Object.values(tags).map((tag) => tag.name);
  const mappedPosts = posts.map((post) => ({
    ...post,
    authors: post.authors.map((author) => author.osu_user_id.toString()),
    tags: post.tags.map((tag) => (tagNames.indexOf(tag) + 1).toString()),
  }));
  const index = Fuse.createIndex(
    [
      {
        name: 'title',
        weight: 1,
      },
      {
        name: 'preview',
        weight: 0.75,
      },
    ],
    mappedPosts
  ).toJSON();
  const newFiles = [
    {
      data: mappedPosts,
      name: 'posts',
    },
    {
      data: authors,
      name: 'authors',
    },
    {
      data: tags,
      name: 'tags',
    },
    {
      data: index,
      name: 'index',
    },
  ];

  for (const file of newFiles) {
    writeFileSync(
      `${process.cwd()}/.dist/blog/${file.name}.json`,
      JSON.stringify(file.data),
      {
        encoding: 'utf-8',
      }
    );
  }
}

main().then(() => process.exit(0));
