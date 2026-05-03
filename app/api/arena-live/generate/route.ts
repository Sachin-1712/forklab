import { getProviderConfig } from "@/lib/llm/providers";
import { generateArenaLiveVariants } from "@/lib/llm/arenaLiveProviders";
import { validateArenaLiveInput } from "@/lib/llm/arenaLiveSchema";
import { arenaLiveRepo } from "@/lib/arenaLiveProject";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getProviderConfig();

  return Response.json({
    repo: arenaLiveRepo,
    geminiModel: config.geminiModel,
    groqModel: config.groqModel,
  });
}

export async function POST(request: Request) {
  try {
    const input = validateArenaLiveInput(await request.json());
    return Response.json(await generateArenaLiveVariants(input));
  } catch (error) {
    return Response.json(
      {
        provider: "fallback",
        isFallback: true,
        error: "Arena Live generation failed",
        message: error instanceof Error ? error.message : String(error),
        variants: [],
      },
      { status: 503 },
    );
  }
}
