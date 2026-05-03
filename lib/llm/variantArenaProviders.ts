import { sampleRepoDescriptor } from "@/lib/variantArenaProject";
import { getProviderConfig } from "./providers";
import {
  createFallbackVariants,
  validateVariantGenerationResponse,
  variantDefinitions,
  variantGenerationJsonSchema,
  type VariantGenerationInput,
  type VariantGenerationResponse,
} from "./variantArenaSchema";

export async function generateVariantArena(
  input: VariantGenerationInput,
): Promise<VariantGenerationResponse> {
  try {
    return await generateWithGemini(input);
  } catch (geminiError) {
    try {
      return await generateWithGroq(input);
    } catch {
      return {
        provider: "fallback",
        isFallback: true,
        variants: createFallbackVariants(input.variants).map((variant) => ({
          ...variant,
          summary: `${variant.summary} LLM unavailable; deterministic fallback used after Gemini failed with: ${errorMessage(
            geminiError,
          )}`,
        })),
      };
    }
  }
}

async function generateWithGemini(
  input: VariantGenerationInput,
): Promise<VariantGenerationResponse> {
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
            parts: [{ text: variantGenerationPrompt(input, "gemini") }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: variantGenerationJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini variant generation failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty variant response.");

  return {
    provider: "gemini",
    isFallback: false,
    variants: validateVariantGenerationResponse(text, input.variants),
  };
}

async function generateWithGroq(
  input: VariantGenerationInput,
): Promise<VariantGenerationResponse> {
  try {
    return await groqVariantRequest(input, "json_schema");
  } catch {
    return groqVariantRequest(input, "json_object");
  }
}

async function groqVariantRequest(
  input: VariantGenerationInput,
  mode: "json_schema" | "json_object",
): Promise<VariantGenerationResponse> {
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
            name: "forklab_variant_generation",
            strict: false,
            schema: variantGenerationJsonSchema,
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
            "Return only valid JSON. Generate safe static HTML and CSS files only. Do not use scripts, network resources, images, or external fonts.",
        },
        { role: "user", content: variantGenerationPrompt(input, "groq") },
      ],
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq variant generation ${mode} failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty variant response.");

  return {
    provider: "groq",
    isFallback: false,
    variants: validateVariantGenerationResponse(content, input.variants),
  };
}

function variantGenerationPrompt(
  input: VariantGenerationInput,
  provider: "gemini" | "groq",
) {
  const goals = variantDefinitions
    .filter((definition) => input.variants.includes(definition.id))
    .map(
      (definition) =>
        `- ${definition.id}: ${definition.title}. Goal: ${definition.goal}`,
    )
    .join("\n");

  return `You are ForkLab's Variant Arena frontend generator.

Task:
${input.task}

Built-in sample repo:
${JSON.stringify(sampleRepoDescriptor, null, 2)}

Required variants:
${goals}

Rules:
- Return JSON matching the provided schema only.
- variants must include exactly these ids: ${input.variants.join(", ")}.
- Each variant must contain exactly two files: public/index.html and public/styles.css.
- Content must be static HTML and CSS only.
- Do not include script tags, JavaScript, external URLs, external images, remote fonts, analytics, or tracking.
- Use local system fonts only.
- Use polished, distinct hero layouts suitable for a developer tool launch.
- Keep copy honest: this is a BrowserPod sandbox preview, not a production deployment.
- Use plain ASCII characters only.
- Provider context: ${provider}.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
