import {
  createIssueFallbackPatch,
  issuePatchJsonSchema,
  parseJsonish,
  validateIssuePatchProposal,
  type IssuePatchPlanInput,
  type IssuePatchProposal,
} from "./issueSchema";
import { getProviderConfig } from "./providers";
import { getSandboxIssue } from "../sandboxIssues";

export async function planIssuePatch(
  input: IssuePatchPlanInput,
): Promise<IssuePatchProposal> {
  const attemptNumber = input.previousAttempt?.attemptNumber
    ? input.previousAttempt.attemptNumber + 1
    : 1;

  if (input.issueId === "issue-1" && attemptNumber === 1) {
    return createIssueFallbackPatch(input.issueId, input.sourceContent, attemptNumber);
  }

  if (input.provider === "fallback") {
    return createIssueFallbackPatch(input.issueId, input.sourceContent, attemptNumber);
  }

  if (input.provider === "gemini") return planIssueWithGemini(input);
  if (input.provider === "groq") return planIssueWithGroq(input);

  try {
    return await planIssueWithGemini(input);
  } catch (geminiError) {
    try {
      return await planIssueWithGroq(input);
    } catch {
      return {
        ...createIssueFallbackPatch(input.issueId, input.sourceContent, attemptNumber),
        diagnosis: `LLM unavailable. Gemini failed: ${errorMessage(
          geminiError,
        )}. ForkLab used the built-in sandbox patch.`,
      };
    }
  }
}

async function planIssueWithGemini(
  input: IssuePatchPlanInput,
): Promise<IssuePatchProposal> {
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
        contents: [{ parts: [{ text: issuePatchPrompt(input, "gemini") }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: issuePatchJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini issue patch failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty issue patch response.");

  return validateIssuePatchProposal(parseJsonish(text), "gemini");
}

async function planIssueWithGroq(
  input: IssuePatchPlanInput,
): Promise<IssuePatchProposal> {
  try {
    return await groqIssuePatchRequest(input, "json_schema");
  } catch {
    return groqIssuePatchRequest(input, "json_object");
  }
}

async function groqIssuePatchRequest(
  input: IssuePatchPlanInput,
  mode: "json_schema" | "json_object",
): Promise<IssuePatchProposal> {
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
            name: "forklab_sandbox_issue_patch",
            strict: false,
            schema: issuePatchJsonSchema,
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
              "Return only valid JSON. You propose safe full-file JavaScript replacements for small ES module files. Never return shell commands.",
          },
          { role: "user", content: issuePatchPrompt(input, "groq") },
        ],
        response_format: responseFormat,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Groq issue patch ${mode} failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty issue patch response.");

  return validateIssuePatchProposal(parseJsonish(content), "groq");
}

function issuePatchPrompt(
  input: IssuePatchPlanInput,
  provider: "gemini" | "groq",
) {
  const issue = getSandboxIssue(input.issueId);
  if (!issue) throw new Error("Unknown sandbox issue.");
  const retryBlock = input.previousAttempt
    ? `

PREVIOUS ATTEMPT FAILED (attempt #${input.previousAttempt.attemptNumber}).
Reason: ${input.previousAttempt.failureReason}

Error output:
${input.previousAttempt.errorOutput}

Previous patchedContent:
\`\`\`js
${input.previousAttempt.patchedContent}
\`\`\`
`
    : "";

  return `You are ForkLab's GitHub issue patch agent.

Sandbox repo:
Jyozaa/forklab-sandbox-issues

Issue:
#${issue.number} ${issue.title}

Issue body:
${issue.body}

Strict rules:
- Return JSON matching the provided schema only.
- provider must be "${provider}".
- issueId must be "${issue.id}".
- targetFile must be "${issue.targetFile}".
- patchedContent must be the full replacement JavaScript file content.
- Keep the existing ES module export style.
- Do not include shell commands, network calls, imports, markdown, or explanations inside patchedContent.
- Use only plain ASCII in patchedContent.

Source file fetched from GitHub (${issue.targetFile}):
\`\`\`js
${input.sourceContent}
\`\`\`

Failing test output:
${input.testOutput}${retryBlock}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
