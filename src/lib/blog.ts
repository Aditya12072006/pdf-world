import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  tags: string[];
  content: string;
  wordCount: number;
  readingMinutes: number;
};

const BLOG_DIR = path.join(process.cwd(), "blog");

const parseFrontmatter = (raw: string) => {
  if (!raw.startsWith("---")) {
    return { meta: {} as Record<string, string>, content: raw.trim() };
  }

  const end = raw.indexOf("\n---", 3);
  if (end < 0) {
    return { meta: {} as Record<string, string>, content: raw.trim() };
  }

  const frontmatter = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).trim();
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    meta[key] = value;
  }

  return { meta, content };
};

const buildPostFromFile = async (fileName: string): Promise<BlogPost> => {
  const slug = fileName.replace(/\.md$/, "");
  const fullPath = path.join(BLOG_DIR, fileName);
  const raw = await readFile(fullPath, "utf-8");
  const { meta, content } = parseFrontmatter(raw);

  const words = content.split(/\s+/g).filter(Boolean);
  const wordCount = words.length;

  return {
    slug,
    title: meta.title || slug.replace(/-/g, " "),
    description: meta.description || "Practical PDF workflow guide.",
    publishedAt: meta.publishedAt || "2026-04-07",
    tags: (meta.tags || "PDF,Productivity")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    content,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
  };
};

export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const posts = await Promise.all(files.map((fileName) => buildPostFromFile(fileName)));
  return posts.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  try {
    return await buildPostFromFile(`${slug}.md`);
  } catch {
    return null;
  }
};
