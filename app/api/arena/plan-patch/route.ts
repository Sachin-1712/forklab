import { planArenaPatch } from "@/lib/llm/arenaProviders";
import {
  validateArenaPatchPlanInput,
  validateArenaPatchProposal,
} from "@/lib/llm/arenaSchema";
import { getProviderConfig } from "@/lib/llm/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getProviderConfig());
}

export async function POST(request: Request) {
  try {
    const input = validateArenaPatchPlanInput(await request.json());
    const proposal = validateArenaPatchProposal(await planArenaPatch(input));
    return Response.json(proposal);
  } catch (error) {
    return Response.json(
      {
        error: "Arena LLM unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
