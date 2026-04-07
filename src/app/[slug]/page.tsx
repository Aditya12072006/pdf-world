import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolLayout } from "@/components/tools/ToolLayout";
import { UniversalToolClient } from "@/components/tools/UniversalToolClient";
import {
  buildToolMetadata,
  howToSchema,
  softwareApplicationSchema,
} from "@/lib/seo";
import { toolBySlug, tools } from "@/lib/tools";

type Props = {
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = () =>
  tools.map((tool) => ({
    slug: tool.slug,
  }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const tool = toolBySlug[slug];

  if (!tool) {
    return {};
  }

  return buildToolMetadata(tool);
};

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = toolBySlug[slug];

  if (!tool) {
    notFound();
  }

  const softwareSchema = softwareApplicationSchema(tool);
  const guideSchema = howToSchema(tool);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideSchema) }}
      />

      <ToolLayout tool={tool}>
        <UniversalToolClient tool={tool} />
      </ToolLayout>
    </>
  );
}
