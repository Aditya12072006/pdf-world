import Image from "next/image";

import { ToolSearchGrid } from "@/components/tools/ToolSearchGrid";

export default function HomePage() {
  return (
    <main>
      <section className="container-page py-10 sm:py-14">
        <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="mb-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                Premium PDF Utility Platform
              </p>
              <h1
                className="text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl"
                style={{ fontFamily: "var(--font-sora)" }}
              >
                Every PDF Tool You Need,
                <br />
                Faster Than Ever.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Merge, split, convert, compress, edit, sign, and secure PDFs in one
                clean workspace. Built for speed and reliable everyday processing.
              </p>
            </div>

            <Image
              src="/pdfworld-banner.png"
              width={900}
              height={280}
              alt="PDF World banner"
              className="h-auto w-full rounded-2xl border border-brand-100"
              priority
            />
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <ToolSearchGrid />
      </section>
    </main>
  );
}
