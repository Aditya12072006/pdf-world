import type { Metadata } from "next";
import Link from "next/link";

import { getAllBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Blog | ${siteConfig.name}`,
  description:
    "Read in-depth guides on PDF tools, document workflows, and practical best practices for students and businesses.",
};

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();

  return (
    <main className="container-page py-10 sm:py-12">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Blog</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900 sm:text-4xl">
          PDF Guides and Best Practices
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          Detailed tutorials to help you merge, compress, secure, and optimize PDFs for real-world use cases.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <article key={post.slug} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
            <p className="text-xs font-semibold text-brand-600">{post.publishedAt}</p>
            <h2 className="mt-2 text-xl font-semibold text-brand-900">{post.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{post.description}</p>
            <p className="mt-3 text-xs text-slate-500">
              {post.wordCount.toLocaleString()} words • {post.readingMinutes} min read
            </p>
            <Link href={`/blog/${post.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-900">
              Read article
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
