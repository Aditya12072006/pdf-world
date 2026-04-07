import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.name}`,
  description: `Read the terms and conditions for using ${siteConfig.name}.`,
};

export default function TermsOfServicePage() {
  return (
    <main className="container-page py-10 sm:py-12">
      <article className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: April 7, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-7 text-slate-700 sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-brand-900">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using PDF World, you agree to these Terms of Service. If you do not agree, please do
              not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">2. Service Description</h2>
            <p className="mt-2">
              PDF World provides browser-based tools for PDF conversion, organization, editing, and related document
              workflows.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">3. User Responsibilities</h2>
            <p className="mt-2">
              You are responsible for all files and content you upload, and you must have the legal right to process
              that content.
            </p>
            <p className="mt-2">You agree not to use the service for unlawful, abusive, or harmful activity.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">4. Prohibited Use</h2>
            <p className="mt-2">You must not attempt to:</p>
            <ul className="mt-2 list-inside list-disc">
              <li>reverse engineer, disrupt, or overload the service,</li>
              <li>upload malware or malicious content,</li>
              <li>violate intellectual property or privacy rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">5. Intellectual Property</h2>
            <p className="mt-2">
              PDF World and its branding, design, and software elements are protected by applicable intellectual
              property laws. Your uploaded files remain your responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">6. Availability and Changes</h2>
            <p className="mt-2">
              We may modify, suspend, or discontinue features at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">7. Disclaimer of Warranties</h2>
            <p className="mt-2">
              The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind,
              express or implied.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">8. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent allowed by law, PDF World is not liable for indirect, incidental, special,
              consequential, or punitive damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">9. Indemnification</h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless PDF World from claims, damages, and expenses resulting from
              your misuse of the service or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">10. Governing Law</h2>
            <p className="mt-2">
              These terms are governed by applicable local laws. Venue and jurisdiction will follow applicable legal
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">11. Contact</h2>
            <p className="mt-2">
              For legal questions related to these terms, refer to the official site:
              {" "}
              <a className="text-brand-700 hover:text-brand-900" href={siteConfig.url}>
                {siteConfig.url}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
