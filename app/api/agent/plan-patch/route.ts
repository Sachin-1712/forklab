import {
  getProviderConfig,
  planPatch,
} from "@/lib/llm/providers";
import {
  validatePatchPlanInput,
  validatePatchProposal,
} from "@/lib/llm/patchSchema";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getProviderConfig());
}

export async function POST(request: Request) {
  try {
    const input = validatePatchPlanInput(await request.json());
    const proposal = validatePatchProposal(await planPatch(input));
    return Response.json(proposal);
  } catch (error) {
    return Response.json(
      {
        error: "LLM unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
