import { judgeArena } from "@/lib/llm/arenaProviders";
import {
  validateArenaJudgeInput,
  validateArenaJudgeVerdict,
} from "@/lib/llm/arenaSchema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = validateArenaJudgeInput(await request.json());
    const verdict = validateArenaJudgeVerdict(await judgeArena(input));
    return Response.json(verdict);
  } catch (error) {
    return Response.json(
      {
        error: "Arena judge unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
