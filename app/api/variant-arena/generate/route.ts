import { getProviderConfig } from "@/lib/llm/providers";
import { generateVariantArena } from "@/lib/llm/variantArenaProviders";
import {
  validateVariantGenerationInput,
  type VariantGenerationResponse,
} from "@/lib/llm/variantArenaSchema";
import { sampleRepoDescriptor } from "@/lib/variantArenaProject";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getProviderConfig();

  return Response.json({
    sampleRepo: sampleRepoDescriptor,
    geminiModel: config.geminiModel,
    groqModel: config.groqModel,
  });
}

export async function POST(request: Request) {
  try {
    const input = validateVariantGenerationInput(await request.json());
    const response: VariantGenerationResponse = await generateVariantArena(input);
    return Response.json(response);
  } catch (error) {
    return Response.json(
      {
        error: "Variant generation failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
