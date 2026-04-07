"use client";

import { useMemo, useState } from "react";

import { categories, tools } from "@/lib/tools";

import { ToolCard } from "./ToolCard";

export const ToolSearchGrid = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();

    return tools.filter((tool) => {
      const categoryMatch =
        activeCategory === "All" ? true : tool.category === activeCategory;
      const queryMatch =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.keywords.some((keyword) => keyword.toLowerCase().includes(q));

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, query]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card sm:p-6">
        <label htmlFor="tool-search" className="sr-only">
          Search PDF tools
        </label>
        <input
          id="tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search any tool, e.g. merge, compress, pdf to word..."
          className="w-full rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-sm text-brand-900 outline-none ring-brand-500 transition focus:ring-2"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeCategory === category
                  ? "bg-brand-600 text-white"
                  : "bg-brand-100 text-brand-900 hover:bg-brand-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  );
};
