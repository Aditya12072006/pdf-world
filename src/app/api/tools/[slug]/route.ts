import {
  executeTool,
  parseFormFiles,
  parseOptions,
  responseForResult,
} from "@/lib/server/tool-executor";
import { toolBySlug } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

type Context = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    if (!toolBySlug[slug]) {
      return new Response("Unsupported tool.", {
        status: 404,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    const formData = await request.formData();
    const files = parseFormFiles(formData);

    if (files.length > MAX_FILES) {
      throw new Error(`Too many files. Maximum allowed is ${MAX_FILES}.`);
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error("Total upload size exceeded. Max total size is 100MB.");
    }

    const oversizedFile = files.find((file) => file.size > MAX_FILE_BYTES);
    if (oversizedFile) {
      throw new Error(`File too large: ${oversizedFile.name}. Max size per file is 25MB.`);
    }

    const options = parseOptions(formData.get("options"));

    const result = await executeTool(slug, files, options);
    return responseForResult(result);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Tool execution failed.", {
      status: 400,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
