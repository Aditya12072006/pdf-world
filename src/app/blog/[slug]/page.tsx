import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAllBlogPosts, getBlogPostBySlug } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

const renderMarkdown = (content: string) => {
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-8 text-slate-700 sm:text-base">
        {paragraphBuffer.join(" ")}
      </p>,
    );
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-inside list-disc space-y-1 text-sm leading-8 text-slate-700 sm:text-base">
        {listBuffer.map((item) => (
          <li key={`${elements.length}-${item.slice(0, 24)}`}>{item}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-xl font-semibold text-brand-900">
          {line.slice(4)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-2xl font-bold text-brand-900">
          {line.slice(3)}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listBuffer.push(line.slice(2));
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();
  return elements;
};

export const generateStaticParams = async () => {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | ${siteConfig.name}`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `${siteConfig.url}/blog/${post.slug}`,
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="container-page py-10 sm:py-12">
      <article className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
        <Link href="/blog" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
          ← Back to Blog
        </Link>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">Blog Article</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900 sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm text-slate-500">
          {post.publishedAt} • {post.wordCount.toLocaleString()} words • {post.readingMinutes} min read
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{post.description}</p>

        <div className="mt-8 space-y-5">{renderMarkdown(post.content)}</div>
      </article>
    </main>
  );
}
