import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description: `Read how ${siteConfig.name} handles files, logs, analytics, and ad services.`,
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container-page py-10 sm:py-12">
      <article className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: April 7, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-7 text-slate-700 sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-brand-900">1. Overview</h2>
            <p className="mt-2">
              This Privacy Policy explains how PDF World collects, uses, and protects information when you use
              {" "}
              <a className="text-brand-700 hover:text-brand-900" href={siteConfig.url}>
                {siteConfig.url}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">2. File Processing</h2>
            <p className="mt-2">
              Uploaded files are processed to provide the requested PDF tool output. Files are handled temporarily
              during processing and are not intended for permanent storage.
            </p>
            <p className="mt-2">
              You should avoid uploading highly sensitive or regulated data unless you are satisfied with your own
              risk assessment and legal requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">3. Technical Data</h2>
            <p className="mt-2">
              We may collect limited technical information such as IP address, browser type, device details, and
              request metadata for service reliability, abuse prevention, and security monitoring.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">4. Advertising</h2>
            <p className="mt-2">
              PDF World uses Google AdSense. Google and its partners may use cookies and similar technologies to
              serve ads based on your visits to this and other websites.
            </p>
            <p className="mt-2">
              Learn more about how Google uses information here:
              {" "}
              <a
                href="https://policies.google.com/technologies/ads"
                className="text-brand-700 hover:text-brand-900"
                target="_blank"
                rel="noreferrer"
              >
                https://policies.google.com/technologies/ads
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">5. Cookies</h2>
            <p className="mt-2">
              Cookies may be used for essential site behavior, analytics, and advertising personalization where
              applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">6. Third-Party Services</h2>
            <p className="mt-2">
              The site may rely on third-party infrastructure and libraries. Their independent privacy terms may
              apply when their services are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">7. Data Security</h2>
            <p className="mt-2">
              We apply reasonable technical controls to reduce risk, but no online service can guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">8. Children&apos;s Privacy</h2>
            <p className="mt-2">
              PDF World is not directed to children under 13, and we do not knowingly collect personal data from
              children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">9. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Continued use of the service means you accept the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-900">10. Contact</h2>
            <p className="mt-2">
              For privacy-related questions, email us at
              {" "}
              <a
                className="text-brand-700 hover:text-brand-900"
                href={`mailto:${siteConfig.contactEmail}`}
              >
                {siteConfig.contactEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
