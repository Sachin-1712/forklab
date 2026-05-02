import {
  createFallbackPatch,
  parsePatchProposal,
  patchProposalJsonSchema,
  tenantAllowedCommand,
  tenantTargetFile,
  validatePatchProposal,
  type AgentProvider,
  type PatchPlanInput,
  type PatchProposal,
} from "./patchSchema";

type ProviderConfig = {
  defaultProvider: Exclude<AgentProvider, "fallback">;
  geminiModel: string;
  groqModel: string;
};

export function getProviderConfig(): ProviderConfig {
  return {
    defaultProvider:
      process.env.AGENT_LLM_PROVIDER === "groq" ||
      process.env.AGENT_LLM_PROVIDER === "auto"
        ? process.env.AGENT_LLM_PROVIDER
        : "gemini",
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    groqModel:
      process.env.GROQ_MODEL?.trim() || "replace_with_supported_groq_model",
  };
}

export async function planPatch(input: PatchPlanInput): Promise<PatchProposal> {
  if (input.provider === "fallback") {
    return createFallbackPatch();
  }

  if (input.provider === "gemini") {
    return planWithGemini(input);
  }

  if (input.provider === "groq") {
    return planWithGroq(input);
  }

  try {
    return await planWithGemini(input);
  } catch (geminiError) {
    try {
      return await planWithGroq(input);
    } catch {
      return {
        ...createFallbackPatch(),
        diagnosis: `LLM unavailable. Gemini failed with: ${errorMessage(geminiError)}. Groq also failed, so ForkLab used the deterministic demo patch.`,
      };
    }
  }
}

async function planWithGemini(input: PatchPlanInput): Promise<PatchProposal> {
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
          {
            parts: [{ text: promptForPatch(input, "gemini") }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: patchProposalJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return validatePatchProposal(parsePatchProposal(text), "gemini");
}

async function planWithGroq(input: PatchPlanInput): Promise<PatchProposal> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey || apiKey === "replace_me") {
    throw new Error("GROQ_API_KEY is missing.");
  }

  try {
    return await requestGroq(input, "json_schema");
  } catch {
    return requestGroq(input, "json_object");
  }
}

async function requestGroq(
  input: PatchPlanInput,
  mode: "json_schema" | "json_object",
): Promise<PatchProposal> {
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
            name: "forklab_patch_proposal",
            strict: false,
            schema: patchProposalJsonSchema,
          },
        }
      : { type: "json_object" };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            "Return only valid JSON. You propose safe full-file JavaScript replacements; never return shell commands.",
        },
        { role: "user", content: promptForPatch(input, "groq") },
      ],
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq ${mode} request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return validatePatchProposal(parsePatchProposal(content), "groq");
}

function promptForPatch(input: PatchPlanInput, provider: "gemini" | "groq") {
  return `You are ForkLab's patch planning agent.

Task:
${input.task}

Scenario:
${input.scenarioId}

Strict rules:
- Return JSON matching the provided schema only.
- provider must be "${provider}".
- targetFile must be "${tenantTargetFile}".
- testsToRun must be exactly ["${tenantAllowedCommand}"].
- patchedContent must be the full replacement JavaScript file content only.
- The app will choose the file path and command. Do not include shell commands.
- Fix the tenant access-control bug by enforcing tenant equality before role or owner checks.

Files:
${JSON.stringify(input.files, null, 2)}

Failing test output:
${input.testOutput}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
