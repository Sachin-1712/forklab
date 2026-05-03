import { getProviderConfig } from "./providers";
import {
  arenaLiveJsonSchema,
  arenaLiveVariantMeta,
  createArenaLiveFallbackVariants,
  requestedArenaLiveIds,
  validateArenaLiveVariants,
  type ArenaLiveGenerateInput,
  type ArenaLiveGenerateResponse,
} from "./arenaLiveSchema";

export async function generateArenaLiveVariants(
  input: ArenaLiveGenerateInput,
): Promise<ArenaLiveGenerateResponse> {
  const requestedIds = requestedArenaLiveIds(input.variantCount);

  if (input.provider === "fallback") {
    return {
      provider: "fallback",
      isFallback: true,
      variants: createArenaLiveFallbackVariants(requestedIds),
    };
  }

  if (input.provider === "gemini") {
    return withFallback(input, () => generateWithGemini(input), "Gemini");
  }

  if (input.provider === "groq") {
    return withFallback(input, () => generateWithGroq(input), "Groq");
  }

  try {
    return await generateWithGemini(input);
  } catch (geminiError) {
    try {
      return await generateWithGroq(input);
    } catch (groqError) {
      return fallbackResponse(
        input,
        `Gemini failed with ${errorMessage(
          geminiError,
        )}; Groq failed with ${errorMessage(groqError)}.`,
      );
    }
  }
}

async function withFallback(
  input: ArenaLiveGenerateInput,
  request: () => Promise<ArenaLiveGenerateResponse>,
  providerName: string,
) {
  try {
    return await request();
  } catch (error) {
    return fallbackResponse(
      input,
      `${providerName} generation failed validation or request: ${errorMessage(error)}.`,
    );
  }
}

async function generateWithGemini(
  input: ArenaLiveGenerateInput,
): Promise<ArenaLiveGenerateResponse> {
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
            parts: [{ text: arenaLivePrompt(input, "gemini") }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: arenaLiveJsonSchema,
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
  if (!text) throw new Error("Gemini returned an empty response.");

  return {
    provider: "gemini",
    isFallback: false,
    variants: validateArenaLiveVariants(
      text,
      requestedArenaLiveIds(input.variantCount),
    ),
  };
}

async function generateWithGroq(
  input: ArenaLiveGenerateInput,
): Promise<ArenaLiveGenerateResponse> {
  try {
    return await groqRequest(input, "json_schema");
  } catch {
    return groqRequest(input, "json_object");
  }
}

async function groqRequest(
  input: ArenaLiveGenerateInput,
  mode: "json_schema" | "json_object",
): Promise<ArenaLiveGenerateResponse> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const { groqModel } = getProviderConfig();
  const model = normalizeGroqModel(groqModel);

  if (!apiKey || apiKey === "replace_me") {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const responseFormat =
    mode === "json_schema"
      ? {
          type: "json_schema",
          json_schema: {
            name: "forklab_arena_live_generation",
            strict: shouldUseStrictGroqSchema(model),
            schema: arenaLiveJsonSchema,
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
      model,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON. Generate safe static HTML and CSS only. Do not include scripts, remote resources, storage APIs, or navigation APIs.",
        },
        { role: "user", content: arenaLivePrompt(input, "groq") },
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
  if (!content) throw new Error("Groq returned an empty response.");

  return {
    provider: "groq",
    isFallback: false,
    variants: validateArenaLiveVariants(
      content,
      requestedArenaLiveIds(input.variantCount),
    ),
  };
}

function fallbackResponse(input: ArenaLiveGenerateInput, reason: string) {
  const requestedIds = requestedArenaLiveIds(input.variantCount);

  return {
    provider: "fallback" as const,
    isFallback: true,
    variants: createArenaLiveFallbackVariants(requestedIds).map((variant) => ({
      ...variant,
      summary: `${variant.summary} Deterministic fallback used: ${reason}`,
    })),
  };
}

function normalizeGroqModel(model: string) {
  const trimmed = model.trim();

  if (!trimmed || trimmed === "replace_with_supported_groq_model") {
    return "llama-3.3-70b-versatile";
  }

  return trimmed;
}

function shouldUseStrictGroqSchema(model: string) {
  return model === "openai/gpt-oss-20b" || model === "openai/gpt-oss-120b";
}

function arenaLivePrompt(
  input: ArenaLiveGenerateInput,
  provider: "gemini" | "groq",
) {
  const requestedIds = requestedArenaLiveIds(input.variantCount);
  const variantBrief = requestedIds
    .map((id) => {
      const meta = arenaLiveVariantMeta[id];
      return `- ${id}: ${meta.title}. Strategy: ${meta.strategy}. Audience: ${meta.audience}`;
    })
    .join("\n");

  return `You are ForkLab's enterprise Variant Arena frontend agent.

Task:
${input.task}

Issue:
#${input.issueId}

Sandbox repo:
- Repo name: forklab-sandbox-acme-landing
- Stack: Node.js + Express static frontend
- Runtime files allowed: public/index.html and public/styles.css

Requested variants:
${variantBrief}

Strict output rules:
- Return JSON matching the schema only.
- Include exactly ${input.variantCount} variants, in the requested order.
- Use only these ids: ${requestedIds.join(", ")}.
- Each variant must include strategy, summary, audience, and exactly two files.
- Allowed files are public/index.html and public/styles.css only.
- Generate only static HTML and CSS.
- Do not include script tags.
- Do not include external CSS, external images, CDNs, remote URLs, analytics, fetch calls, eval, storage APIs, or navigation APIs.
- Keep the files valid, small, and suitable for an Express static server.
- Use system fonts only.
- Keep copy honest that these are BrowserPod sandbox runs.
- Do not use the word "demo" anywhere in titles, summaries, HTML, CSS, or button copy.
- Provider must be compatible with ${provider}.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
