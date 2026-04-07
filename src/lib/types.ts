export type ToolCategory =
  | "Organize"
  | "Convert To PDF"
  | "Convert From PDF"
  | "Optimize & Edit"
  | "Security & Signs"
  | "AI Suite";

export type ToolDefinition = {
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: string;
  keywords: string[];
  howToSteps?: string[];
  faqs?: Array<{ question: string; answer: string }>;
};
