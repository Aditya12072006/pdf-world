import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Contact Us | ${siteConfig.name}`,
  description: `Contact ${siteConfig.name} support and legal team by email.`,
};

export default function ContactPage() {
  return (
    <main className="container-page py-10 sm:py-12">
      <article className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">Contact Us</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          For support, legal, privacy, and general inquiries related to PDF World, please email:
        </p>

        <p className="mt-5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-lg font-semibold text-brand-900 sm:text-xl">
          <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-brand-700">
            {siteConfig.contactEmail}
          </a>
        </p>

        <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
          We usually reply as soon as possible. Please include enough detail about your issue or request so we can
          assist you faster.
        </p>
      </article>
    </main>
  );
}
