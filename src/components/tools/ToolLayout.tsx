import { ReactNode } from "react";

import { AdSlot } from "@/components/AdSlot";
import { ToolDefinition } from "@/lib/types";

type Props = {
  tool: ToolDefinition;
  children: ReactNode;
};

export const ToolLayout = ({ tool, children }: Props) => {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <AdSlot variant="leaderboard" slotLabel="Top Leaderboard" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <main className="space-y-6">
          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              {tool.category}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
              {tool.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              {tool.description}
            </p>
          </section>

          {children}

          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
            <h2 className="text-2xl font-bold text-brand-900">How to use {tool.title}</h2>
            <ol className="mt-4 list-inside list-decimal space-y-2 text-slate-700">
              {tool.howToSteps?.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
            <h2 className="text-2xl font-bold text-brand-900">Frequently Asked Questions</h2>
            <div className="mt-4 space-y-4">
              {tool.faqs?.map((faq) => (
                <article key={faq.question}>
                  <h3 className="font-semibold text-brand-900">{faq.question}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
            <h2 className="text-2xl font-bold text-brand-900">Why PDF World?</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
              PDF World is built for speed and user trust. Every tool is free,
              no-signup, and optimized for fast processing so you can finish work in
              seconds.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
              Our zero-persistence architecture means your files are handled temporarily
              during processing and cleared right after completion.
            </p>
          </section>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <AdSlot variant="sidebar" slotLabel="Tool Sidebar" />
          </div>
        </aside>
      </div>
    </div>
  );
};
