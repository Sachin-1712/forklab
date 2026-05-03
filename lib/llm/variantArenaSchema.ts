export const variantArenaTask =
  "Generate 3 homepage hero variants for a developer tool launch: one enterprise-trust version, one startup-conversion version, and one developer-minimal version.";

export const variantIds = [
  "enterprise-trust",
  "startup-conversion",
  "developer-minimal",
] as const;

export type VariantId = (typeof variantIds)[number];

export type VariantFile = {
  path: "public/index.html" | "public/styles.css";
  content: string;
};

export type GeneratedVariant = {
  id: VariantId;
  title: string;
  summary: string;
  files: VariantFile[];
};

export type VariantGenerationInput = {
  task: string;
  variants: VariantId[];
};

export type VariantGenerationResponse = {
  provider: "gemini" | "groq" | "fallback";
  isFallback: boolean;
  variants: GeneratedVariant[];
};

export const variantDefinitions: Array<{
  id: VariantId;
  title: string;
  goal: string;
}> = [
  {
    id: "enterprise-trust",
    title: "Enterprise Trust",
    goal: "Reassure security and platform leaders with proof, governance, and reliability.",
  },
  {
    id: "startup-conversion",
    title: "Startup Conversion",
    goal: "Drive signups with crisp benefits, urgency, and a confident launch offer.",
  },
  {
    id: "developer-minimal",
    title: "Developer Minimal",
    goal: "Give developers a quiet, fast, terminal-like product story with minimal chrome.",
  },
];

export const variantGenerationJsonSchema = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: variantIds },
          title: { type: "string" },
          summary: { type: "string" },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  enum: ["public/index.html", "public/styles.css"],
                },
                content: { type: "string" },
              },
              required: ["path", "content"],
              additionalProperties: false,
            },
          },
        },
        required: ["id", "title", "summary", "files"],
        additionalProperties: false,
      },
    },
  },
  required: ["variants"],
  additionalProperties: false,
} as const;

const unsafeContentNeedles = [
  "<script",
  "javascript:",
  "http://",
  "https://",
  "fetch(",
  "XMLHttpRequest",
  "import(",
  "child_process",
  "exec(",
  "spawn(",
  "#!/bin/",
];

export function validateVariantGenerationInput(
  value: unknown,
): VariantGenerationInput {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = value as Partial<VariantGenerationInput>;

  if (typeof input.task !== "string" || !input.task.trim()) {
    throw new Error("task is required.");
  }
  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    throw new Error("variants must be a non-empty array.");
  }
  for (const id of input.variants) {
    if (!isVariantId(id)) {
      throw new Error("variants contains an unknown variant id.");
    }
  }

  return {
    task: input.task,
    variants: Array.from(new Set(input.variants)),
  };
}

export function validateVariantGenerationResponse(
  value: unknown,
  requestedIds: VariantId[] = [...variantIds],
): GeneratedVariant[] {
  const parsed = parseJsonish(value);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Variant response must be an object.");
  }

  const response = parsed as Partial<Pick<VariantGenerationResponse, "variants">>;
  if (!Array.isArray(response.variants) || response.variants.length === 0) {
    throw new Error("Variant response must contain variants.");
  }

  const seen = new Set<VariantId>();
  const variants: GeneratedVariant[] = response.variants.map((variant) =>
    validateGeneratedVariant(variant),
  );

  for (const variant of variants) {
    if (!requestedIds.includes(variant.id)) {
      throw new Error(`Unexpected variant id: ${variant.id}.`);
    }
    if (seen.has(variant.id)) {
      throw new Error(`Duplicate variant id: ${variant.id}.`);
    }
    seen.add(variant.id);
  }

  for (const id of requestedIds) {
    if (!seen.has(id)) {
      throw new Error(`Missing generated variant: ${id}.`);
    }
  }

  return variants.sort(
    (a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id),
  );
}

export function createFallbackVariants(
  requestedIds: VariantId[] = [...variantIds],
): GeneratedVariant[] {
  const all: Record<VariantId, GeneratedVariant> = {
    "enterprise-trust": {
      id: "enterprise-trust",
      title: "Enterprise Trust",
      summary:
        "A security-first hero focused on governance, audit trails, and verified execution.",
      files: [
        {
          path: "public/index.html",
          content: enterpriseHtml,
        },
        {
          path: "public/styles.css",
          content: enterpriseCss,
        },
      ],
    },
    "startup-conversion": {
      id: "startup-conversion",
      title: "Startup Conversion",
      summary:
        "A punchy launch page with value-first copy, proof counters, and a strong signup CTA.",
      files: [
        {
          path: "public/index.html",
          content: startupHtml,
        },
        {
          path: "public/styles.css",
          content: startupCss,
        },
      ],
    },
    "developer-minimal": {
      id: "developer-minimal",
      title: "Developer Minimal",
      summary:
        "A sparse, terminal-inspired homepage for developers who want the product in one scan.",
      files: [
        {
          path: "public/index.html",
          content: developerHtml,
        },
        {
          path: "public/styles.css",
          content: developerCss,
        },
      ],
    },
  };

  return requestedIds.map((id) => all[id]);
}

export function parseJsonish(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
  }
  return value;
}

export function getVariantDefinition(id: VariantId) {
  return variantDefinitions.find((variant) => variant.id === id)!;
}

function validateGeneratedVariant(value: unknown): GeneratedVariant {
  if (!value || typeof value !== "object") {
    throw new Error("Each variant must be an object.");
  }

  const variant = value as Partial<GeneratedVariant>;
  if (!isVariantId(variant.id)) {
    throw new Error("Variant id is invalid.");
  }
  if (typeof variant.title !== "string" || !variant.title.trim()) {
    throw new Error(`Variant ${variant.id} title is required.`);
  }
  if (typeof variant.summary !== "string" || !variant.summary.trim()) {
    throw new Error(`Variant ${variant.id} summary is required.`);
  }
  if (!Array.isArray(variant.files) || variant.files.length !== 2) {
    throw new Error(`Variant ${variant.id} must include exactly two files.`);
  }

  const files = variant.files.map(validateVariantFile);
  const paths = files.map((file) => file.path).sort();
  if (paths.join("|") !== "public/index.html|public/styles.css") {
    throw new Error(`Variant ${variant.id} must only write HTML and CSS.`);
  }

  return {
    id: variant.id,
    title: variant.title.trim(),
    summary: variant.summary.trim(),
    files,
  };
}

function validateVariantFile(value: unknown): VariantFile {
  if (!value || typeof value !== "object") {
    throw new Error("Variant file must be an object.");
  }

  const file = value as Partial<VariantFile>;
  if (file.path !== "public/index.html" && file.path !== "public/styles.css") {
    throw new Error("Variant file path is not allowed.");
  }
  if (typeof file.content !== "string" || !file.content.trim()) {
    throw new Error(`Variant file ${file.path} content must be non-empty.`);
  }

  const lowerContent = file.content.toLowerCase();
  if (unsafeContentNeedles.some((needle) => lowerContent.includes(needle))) {
    throw new Error(`Variant file ${file.path} contains unsafe or remote content.`);
  }

  return {
    path: file.path,
    content: file.content,
  };
}

function isVariantId(value: unknown): value is VariantId {
  return typeof value === "string" && variantIds.includes(value as VariantId);
}

const enterpriseHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acme Launch - Enterprise Trust</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main class="hero">
      <nav class="topline">
        <strong>Acme Launch</strong>
        <span>Verified sandboxes for product teams</span>
      </nav>
      <section class="hero-grid">
        <div class="copy">
          <p class="eyebrow">Enterprise Trust</p>
          <h1>Ship AI-assisted changes with proof your security team can read.</h1>
          <p class="lede">Acme Launch gives every generated branch an isolated runtime, an audit trail, and a clear preview before code reaches production.</p>
          <div class="actions">
            <a href="#proof">Review proof</a>
            <a class="ghost" href="#controls">See controls</a>
          </div>
        </div>
        <div class="proof-card" id="proof">
          <span>BrowserPod proof</span>
          <strong>3 isolated runs</strong>
          <p>Install, preview, and evidence captured per branch.</p>
          <dl>
            <div><dt>Policy</dt><dd>Human approval</dd></div>
            <div><dt>Runtime</dt><dd>Sandboxed Node</dd></div>
            <div><dt>Record</dt><dd>Terminal logs</dd></div>
          </dl>
        </div>
      </section>
    </main>
  </body>
</html>
`;

const enterpriseCss = `:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #050505;
  color: #f4fbff;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top right, rgba(0,205,255,0.18), transparent 32%), #050505; }
.hero { min-height: 100vh; padding: 32px; display: grid; align-content: center; gap: 72px; }
.topline { display: flex; justify-content: space-between; gap: 16px; color: #9caeb6; font-size: 14px; }
.topline strong { color: #00cdff; letter-spacing: 0.08em; text-transform: uppercase; }
.hero-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.7fr); gap: 32px; align-items: center; }
.copy { max-width: 780px; }
.eyebrow { margin: 0 0 12px; color: #00cdff; font: 700 12px ui-monospace, SFMono-Regular, monospace; text-transform: uppercase; letter-spacing: 0.14em; }
h1 { margin: 0; font-size: clamp(44px, 7vw, 82px); line-height: 0.96; letter-spacing: -0.04em; }
.lede { max-width: 640px; margin: 24px 0 0; color: #bbc9cf; font-size: 20px; line-height: 1.5; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.actions a { border: 1px solid #00cdff; border-radius: 6px; padding: 14px 18px; background: #00cdff; color: #031014; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
.actions a.ghost { background: transparent; color: #f4fbff; border-color: #293338; }
.proof-card { border: 1px solid #222; border-radius: 10px; padding: 24px; background: rgba(19,19,19,0.92); box-shadow: 0 20px 80px rgba(0,0,0,0.42); }
.proof-card span { color: #00cdff; font: 700 12px ui-monospace, SFMono-Regular, monospace; text-transform: uppercase; }
.proof-card strong { display: block; margin-top: 14px; font-size: 36px; }
.proof-card p { color: #bbc9cf; line-height: 1.55; }
dl { display: grid; gap: 10px; margin: 24px 0 0; }
dl div { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid #222; padding-top: 10px; }
dt { color: #718188; }
dd { margin: 0; color: #f4fbff; }
@media (max-width: 760px) { .hero { padding: 20px; } .topline, .hero-grid { grid-template-columns: 1fr; } .topline { flex-direction: column; } }
`;

const startupHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acme Launch - Startup Conversion</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <p class="badge">Launch week offer</p>
        <h1>Turn feature ideas into preview links before standup.</h1>
        <p class="lede">Generate variants, run them in disposable BrowserPod sandboxes, and walk into the meeting with proof instead of screenshots.</p>
        <form class="signup">
          <input aria-label="Work email" placeholder="team@company.com" />
          <button type="button">Get preview access</button>
        </form>
        <div class="metrics" aria-label="Demo metrics">
          <div><strong>3</strong><span>variants per prompt</span></div>
          <div><strong>1</strong><span>live sandbox first</span></div>
          <div><strong>0</strong><span>local setup steps</span></div>
        </div>
      </section>
    </main>
  </body>
</html>
`;

const startupCss = `:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #050505;
  color: #ffffff;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: linear-gradient(135deg, #050505 0%, #071d25 52%, #050505 100%); }
.page { min-height: 100vh; display: grid; place-items: center; padding: 28px; }
.hero { width: min(980px, 100%); text-align: center; }
.badge { display: inline-flex; margin: 0 0 20px; border: 1px solid rgba(0,205,255,0.38); border-radius: 999px; padding: 8px 12px; background: rgba(0,205,255,0.1); color: #00cdff; font: 800 12px ui-monospace, SFMono-Regular, monospace; text-transform: uppercase; letter-spacing: 0.12em; }
h1 { margin: 0 auto; max-width: 900px; font-size: clamp(40px, 8vw, 86px); line-height: 0.94; letter-spacing: -0.045em; }
.lede { max-width: 720px; margin: 24px auto 0; color: #c8d7dc; font-size: 20px; line-height: 1.5; }
.signup { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; width: min(600px, 100%); margin: 34px auto 0; padding: 8px; border: 1px solid #222; border-radius: 8px; background: rgba(19,19,19,0.92); }
input { min-width: 0; border: 0; outline: 0; border-radius: 5px; padding: 0 14px; background: #050505; color: #fff; font-size: 16px; }
button { border: 0; border-radius: 5px; padding: 15px 18px; background: #00cdff; color: #041014; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 36px; }
.metrics div { border: 1px solid #222; border-radius: 8px; padding: 18px; background: rgba(0,0,0,0.28); }
.metrics strong { display: block; color: #00cdff; font-size: 34px; }
.metrics span { color: #9dadb4; font: 700 12px ui-monospace, SFMono-Regular, monospace; text-transform: uppercase; letter-spacing: 0.08em; }
@media (max-width: 680px) { .signup, .metrics { grid-template-columns: 1fr; } input { min-height: 48px; } }
`;

const developerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acme Launch - Developer Minimal</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main>
      <section class="shell">
        <p class="path">~/acme-launch</p>
        <h1>Fork a frontend. Preview the result. Keep the proof.</h1>
        <p class="sub">A tiny command center for generating UI variants inside isolated BrowserPod sandboxes.</p>
        <pre class="terminal"><code>$ forklab variants "hero launch"
write public/index.html
write public/styles.css
npm install
npm run start
portal ready</code></pre>
      </section>
    </main>
  </body>
</html>
`;

const developerCss = `:root {
  color-scheme: dark;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #050505;
  color: #e5e2e1;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #050505; }
main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.shell { width: min(860px, 100%); }
.path { margin: 0 0 18px; color: #00cdff; font-size: 13px; }
h1 { margin: 0; max-width: 780px; color: #fff; font-size: clamp(36px, 7vw, 72px); line-height: 1; letter-spacing: -0.04em; font-family: ui-sans-serif, system-ui, sans-serif; }
.sub { max-width: 640px; margin: 22px 0 0; color: #aebec4; font-size: 18px; line-height: 1.6; font-family: ui-sans-serif, system-ui, sans-serif; }
.terminal { margin: 36px 0 0; overflow: auto; border: 1px solid #222; border-radius: 8px; padding: 18px; background: #090909; color: #aebec4; line-height: 1.7; box-shadow: inset 0 0 0 1px rgba(0,205,255,0.04); }
code { white-space: pre-wrap; }
code::selection { background: rgba(0,205,255,0.28); }
`;
