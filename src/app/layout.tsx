import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";

import "./globals.css";
import { siteConfig } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/pdfworld-banner.png`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} banner`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [`${siteConfig.url}/pdfworld-banner.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1535449916682839"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${manrope.variable} ${sora.variable} min-h-screen antialiased`}
        style={{ fontFamily: "var(--font-manrope)" }}
      >
        <header className="border-b border-brand-100/70 bg-white/80 backdrop-blur">
          <div className="container-page flex items-center justify-between py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/pdfworld-logo.png"
                  width={42}
                  height={42}
                  alt="PDF World logo"
                  className="rounded-lg"
                />
                <div>
                  <p className="text-xl font-bold text-brand-900" style={{ fontFamily: "var(--font-sora)" }}>
                    PDF World
                  </p>
                  <p className="text-xs text-slate-500">Free Online PDF Tools</p>
                </div>
              </Link>

              <nav className="flex items-center gap-3 text-sm font-semibold text-brand-800 sm:gap-4">
                <Link href="/" className="hover:text-brand-600">
                  Tools
                </Link>
                <Link href="/blog" className="hover:text-brand-600">
                  Blog
                </Link>
              </nav>
            </div>

            <p className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 sm:block">
              Fast • No Signup
            </p>
          </div>
        </header>

        {children}

        <footer className="mt-16 border-t border-brand-100 bg-white/90">
          <div className="container-page py-8 text-sm text-slate-600">
            <p>
              {new Date().getFullYear()} PDF World. Free online PDF tools built for speed.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <Link href="/blog" className="text-brand-700 hover:text-brand-900">
                Blog
              </Link>
              <Link href="/contact" className="text-brand-700 hover:text-brand-900">
                Contact Us
              </Link>
              <Link href="/privacy-policy" className="text-brand-700 hover:text-brand-900">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="text-brand-700 hover:text-brand-900">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
