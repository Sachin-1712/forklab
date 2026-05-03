import {
  arenaJudgeJsonSchema,
  arenaPatchJsonSchema,
  createArenaFallbackPatch,
  createArenaFallbackVerdict,
  getArenaStrategy,
  parseJsonish,
  validateArenaJudgeVerdict,
  validateArenaPatchProposal,
  type ArenaJudgeInput,
  type ArenaJudgeVerdict,
  type ArenaPatchPlanInput,
  type ArenaPatchProposal,
} from "./arenaSchema";
import { getProviderConfig } from "./providers";

export async function planArenaPatch(
  input: ArenaPatchPlanInput,
): Promise<ArenaPatchProposal> {
  const attemptNumber = input.previousAttempt?.attemptNumber
    ? input.previousAttempt.attemptNumber + 1
    : 1;

  if (input.provider === "fallback") {
    return createArenaFallbackPatch(input.strategyId, attemptNumber);
  }

  if (input.provider === "gemini") return planArenaWithGemini(input);
  if (input.provider === "groq") return planArenaWithGroq(input);

  try {
    return await planArenaWithGemini(input);
  } catch (geminiError) {
    try {
      return await planArenaWithGroq(input);
    } catch {
      return {
        ...createArenaFallbackPatch(input.strategyId, attemptNumber),
        diagnosis: `LLM unavailable. Gemini failed: ${errorMessage(
          geminiError,
        )}. Falling back to deterministic ${input.strategyId} patch.`,
      };
    }
  }
}

export async function judgeArena(
  input: ArenaJudgeInput,
): Promise<ArenaJudgeVerdict> {
  if (input.provider === "fallback") {
    return createArenaFallbackVerdict(input.proposals);
  }

  if (input.provider === "gemini") return judgeArenaWithGemini(input);
  if (input.provider === "groq") return judgeArenaWithGroq(input);

  try {
    return await judgeArenaWithGemini(input);
  } catch {
    try {
      return await judgeArenaWithGroq(input);
    } catch {
      return createArenaFallbackVerdict(input.proposals);
    }
  }
}

async function planArenaWithGemini(
  input: ArenaPatchPlanInput,
): Promise<ArenaPatchProposal> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { geminiModel } = getProviderConfig();
  if (!apiKey || apiKey === "replace_me") {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      geminiModel,
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: arenaPatchPrompt(input, "gemini") }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: arenaPatchJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini arena patch failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty arena patch response.");

  return validateArenaPatchProposal(parseJsonish(text), "gemini");
}

async function planArenaWithGroq(
  input: ArenaPatchPlanInput,
): Promise<ArenaPatchProposal> {
  try {
    return await groqArenaPatchRequest(input, "json_schema");
  } catch {
    return groqArenaPatchRequest(input, "json_object");
  }
}

async function groqArenaPatchRequest(
  input: ArenaPatchPlanInput,
  mode: "json_schema" | "json_object",
): Promise<ArenaPatchProposal> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const { groqModel } = getProviderConfig();
  if (!apiKey || apiKey === "replace_me") {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const responseFormat =
    mode === "json_schema"
      ? {
          type: "json_schema",
          json_schema: {
            name: "forklab_arena_patch",
            strict: false,
            schema: arenaPatchJsonSchema,
          },
        }
      : { type: "json_object" };

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: "system",
            content:
              "Return only valid JSON. You propose safe full-file JavaScript replacements that fix a sidebar reducer bug. Never return shell commands.",
          },
          { role: "user", content: arenaPatchPrompt(input, "groq") },
        ],
        response_format: responseFormat,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Groq arena patch ${mode} failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty arena patch response.");

  return validateArenaPatchProposal(parseJsonish(content), "groq");
}

async function judgeArenaWithGemini(
  input: ArenaJudgeInput,
): Promise<ArenaJudgeVerdict> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { geminiModel } = getProviderConfig();
  if (!apiKey || apiKey === "replace_me") {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      geminiModel,
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: arenaJudgePrompt(input, "gemini") }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: arenaJudgeJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini judge failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty judge response.");

  return validateArenaJudgeVerdict(parseJsonish(text), "gemini");
}

async function judgeArenaWithGroq(
  input: ArenaJudgeInput,
): Promise<ArenaJudgeVerdict> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const { groqModel } = getProviderConfig();
  if (!apiKey || apiKey === "replace_me") {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: "system",
            content:
              "Return only valid JSON. You are an impartial code reviewer scoring multiple candidate patches for the same bug.",
          },
          { role: "user", content: arenaJudgePrompt(input, "groq") },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Groq judge failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty judge response.");

  return validateArenaJudgeVerdict(parseJsonish(content), "groq");
}

function arenaPatchPrompt(
  input: ArenaPatchPlanInput,
  provider: "gemini" | "groq",
) {
  const strategy = getArenaStrategy(input.strategyId)!;
  const retryBlock = input.previousAttempt
    ? `

PREVIOUS ATTEMPT FAILED (attempt #${input.previousAttempt.attemptNumber}). You MUST stay within the same strategy directive but fix the underlying problem.

Reason for failure: ${input.previousAttempt.failureReason}

Error output:
${input.previousAttempt.errorOutput}

Previous patchedContent that failed:
\`\`\`js
${input.previousAttempt.patchedContent}
\`\`\`

Critical: use only plain ASCII characters in patchedContent. Do not use smart quotes, em-dashes, non-breaking spaces, or any non-ASCII characters — they cause JS parse errors. Use only standard double quotes (") and single quotes ('), regular hyphens (-), and ASCII spaces.`
    : "";

  return `You are ForkLab's parallel-arena patch agent for the "${strategy.title}" strategy (${strategy.agentStyle}).

Strategy directive:
${strategy.systemDirective}

Task:
${input.task}

Strict rules:
- Return JSON matching the provided schema only.
- provider must be "${provider}".
- strategyId must be "${input.strategyId}".
- targetFile must be "src/sidebarState.js".
- patchedContent must be the full replacement JavaScript file content (CommonJS, exporting reduceSidebarState).
- Do not include shell commands, network calls, or imports beyond core Node.
- isFallback must be false.
- Use only plain ASCII characters in patchedContent — no smart quotes, no Unicode dashes, no special spaces.

Buggy file (src/sidebarState.js):
\`\`\`js
${input.buggyContent}
\`\`\`

Failing test output:
${input.testOutput}${retryBlock}`;
}

function arenaJudgePrompt(
  input: ArenaJudgeInput,
  provider: "gemini" | "groq",
) {
  const proposalBlocks = input.proposals
    .map(
      (p) => `
Strategy: ${p.title} (${p.strategyId}, agentStyle=${p.agentStyle})
Tests passed in BrowserPod: ${p.testsPassed ? "yes" : `no (${p.failingTestCount} failing)`}
Diagnosis: ${p.diagnosis}
Summary: ${p.summary}
Patched file content:
\`\`\`js
${p.patchedContent}
\`\`\``,
    )
    .join("\n---\n");

  return `You are an impartial senior reviewer judging multiple candidate patches that all attempt the same fix.

Task:
${input.task}

Original buggy code:
\`\`\`js
${input.buggyContent}
\`\`\`

Candidate patches:
${proposalBlocks}

Score each candidate from 0-100 on four axes:
- correctness: does it fix the bug and not break the working behavior?
- maintainability: small, clear, easy to read and modify later?
- risk: low risk = does not change behavior unexpectedly or alter state shape unnecessarily.
- ux: does the change improve the user-facing navigation experience?
overall is your weighted aggregate (correctness weighted highest).

Return JSON matching the schema. Rules:
- provider must be "${provider}".
- isFallback must be false.
- branches must include exactly one entry per candidate.
- winnerStrategyId must be one of the candidate strategyIds and should reflect the highest overall score.
- winnerReason: 1-2 sentences explaining the choice.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
