import Link from "next/link";

import { iconMap } from "@/lib/icon-map";
import { ToolDefinition } from "@/lib/types";

type Props = {
  tool: ToolDefinition;
};

export const ToolCard = ({ tool }: Props) => {
  const Icon = iconMap[tool.icon];

  return (
    <Link
      href={`/${tool.slug}`}
      className="group rounded-2xl border border-brand-100 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/50"
    >
      <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-2 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
        {Icon ? <Icon size={20} /> : null}
      </div>
      <h3 className="text-lg font-semibold text-brand-900">{tool.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
    </Link>
  );
};
