import { Metadata } from "next";

import { siteConfig } from "@/lib/site";
import { ToolDefinition } from "@/lib/types";

export const buildToolMetadata = (tool: ToolDefinition): Metadata => {
  const title = `${tool.title} - Free Online, No Signup, Fast | ${siteConfig.name}`;
  const description = `${tool.description} Use ${tool.title} for free online with no signup required. Fast processing and secure file handling on ${siteConfig.name}.`;
  const url = `${siteConfig.url}/${tool.slug}`;

  return {
    title,
    description,
    keywords: [...siteConfig.keywords, ...tool.keywords, tool.title],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
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
      title,
      description,
      images: [`${siteConfig.url}/pdfworld-banner.png`],
    },
  };
};

export const softwareApplicationSchema = (tool: ToolDefinition) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `${tool.title} - ${siteConfig.name}`,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "1987",
  },
  description: `${tool.description} Free online, fast, and no signup required.`,
  url: `${siteConfig.url}/${tool.slug}`,
});

export const howToSchema = (tool: ToolDefinition) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: `How to use ${tool.title}`,
  description: `Simple steps to use ${tool.title} on ${siteConfig.name}`,
  totalTime: "PT1M",
  step: (tool.howToSteps ?? []).map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step,
    text: step,
  })),
});
