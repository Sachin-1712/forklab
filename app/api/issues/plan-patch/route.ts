import { planIssuePatch } from "@/lib/llm/issueProviders";
import {
  validateIssuePatchPlanInput,
  validateIssuePatchProposal,
} from "@/lib/llm/issueSchema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = validateIssuePatchPlanInput(await request.json());
    const proposal = validateIssuePatchProposal(await planIssuePatch(input));
    return Response.json(proposal);
  } catch (error) {
    return Response.json(
      {
        error: "Sandbox issue LLM unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
