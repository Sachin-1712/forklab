export const arenaLiveDefaultTask =
  "Generate 3 homepage hero variants for a developer tool launch: one enterprise-trust version, one startup-conversion version, and one developer-minimal version.";

export const arenaLiveVariantIds = [
  "enterprise-trust",
  "startup-conversion",
  "developer-minimal",
] as const;

export type ArenaLiveVariantId = (typeof arenaLiveVariantIds)[number];

export type ArenaLiveProvider = "gemini" | "groq" | "auto" | "fallback";

export type ArenaLiveFile = {
  path: "public/index.html" | "public/styles.css";
  content: string;
};

export type ArenaLiveVariant = {
  id: ArenaLiveVariantId;
  title: string;
  strategy: string;
  summary: string;
  audience: string;
  files: ArenaLiveFile[];
};

export type ArenaLiveGenerateInput = {
  task: string;
  issueId: string;
  variantCount: number;
  provider: ArenaLiveProvider;
};

export type ArenaLiveGenerateResponse = {
  provider: "gemini" | "groq" | "fallback";
  isFallback: boolean;
  variants: ArenaLiveVariant[];
};

export const arenaLiveIssues = [
  {
    id: "201",
    label: "#201 Generate 3 homepage hero variants",
    prompt: arenaLiveDefaultTask,
  },
  {
    id: "202",
    label: "#202 Improve enterprise CTA section",
    prompt:
      "Generate 3 frontend variants for an enterprise CTA section: one compliance-led version, one ROI-led version, and one implementation-speed version.",
  },
  {
    id: "203",
    label: "#203 Developer-focused terminal aesthetic",
    prompt:
      "Generate 3 developer-focused homepage hero variants using a terminal-inspired aesthetic, clear command examples, and concise copy.",
  },
] as const;

export const arenaLiveVariantMeta: Record<
  ArenaLiveVariantId,
  { title: string; strategy: string; audience: string }
> = {
  "enterprise-trust": {
    title: "Enterprise Trust",
    strategy: "Governance, security proof, executive confidence.",
    audience: "Platform leaders and security reviewers",
  },
  "startup-conversion": {
    title: "Startup Conversion",
    strategy: "Short path to action, proof counters, high-energy CTA.",
    audience: "Founders, PMs, and growth teams",
  },
  "developer-minimal": {
    title: "Developer Minimal",
    strategy: "Sparse terminal aesthetic, fast scanning, direct product promise.",
    audience: "Developers and staff engineers",
  },
};

export const arenaLiveJsonSchema = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: arenaLiveVariantIds },
          title: { type: "string" },
          strategy: { type: "string" },
          summary: { type: "string" },
          audience: { type: "string" },
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
        required: [
          "id",
          "title",
          "strategy",
          "summary",
          "audience",
          "files",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["variants"],
  additionalProperties: false,
} as const;

const rejectedNeedles = [
  "<script",
  "http://",
  "https://",
  "import(",
  "fetch(",
  "eval(",
  "document.cookie",
  "localstorage",
  "window.location",
];

export function validateArenaLiveInput(value: unknown): ArenaLiveGenerateInput {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = value as Partial<ArenaLiveGenerateInput>;

  if (typeof input.task !== "string" || !input.task.trim()) {
    throw new Error("task is required.");
  }
  if (typeof input.issueId !== "string" || !input.issueId.trim()) {
    throw new Error("issueId is required.");
  }
  if (
    input.variantCount !== 1 &&
    input.variantCount !== 2 &&
    input.variantCount !== 3
  ) {
    throw new Error("variantCount must be 1, 2, or 3.");
  }
  if (
    input.provider !== "gemini" &&
    input.provider !== "groq" &&
    input.provider !== "auto" &&
    input.provider !== "fallback"
  ) {
    throw new Error("provider must be gemini, groq, auto, or fallback.");
  }

  return {
    task: input.task,
    issueId: input.issueId,
    variantCount: input.variantCount,
    provider: input.provider,
  };
}

export function requestedArenaLiveIds(count: number): ArenaLiveVariantId[] {
  return arenaLiveVariantIds.slice(0, count);
}

export function validateArenaLiveVariants(
  value: unknown,
  requestedIds: ArenaLiveVariantId[],
) {
  const parsed = parseJsonish(value);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Arena Live response must be an object.");
  }

  const response = parsed as Partial<Pick<ArenaLiveGenerateResponse, "variants">>;
  if (!Array.isArray(response.variants)) {
    throw new Error("Arena Live response must include variants.");
  }
  if (response.variants.length !== requestedIds.length) {
    throw new Error("Arena Live response returned the wrong variant count.");
  }

  const seen = new Set<ArenaLiveVariantId>();
  const variants = response.variants.map((variant) =>
    validateArenaLiveVariant(variant),
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
      throw new Error(`Missing variant id: ${id}.`);
    }
  }

  return variants.sort(
    (a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id),
  );
}

export function createArenaLiveFallbackVariants(
  requestedIds: ArenaLiveVariantId[],
): ArenaLiveVariant[] {
  const fallback: Record<ArenaLiveVariantId, ArenaLiveVariant> = {
    "enterprise-trust": {
      id: "enterprise-trust",
      title: "Enterprise Trust",
      strategy:
        "Lead with governance, auditability, and proof that every generated branch ran in isolation.",
      summary:
        "A boardroom-ready hero for security-conscious enterprise buyers.",
      audience: arenaLiveVariantMeta["enterprise-trust"].audience,
      files: [
        { path: "public/index.html", content: enterpriseHtml },
        { path: "public/styles.css", content: enterpriseCss },
      ],
    },
    "startup-conversion": {
      id: "startup-conversion",
      title: "Startup Conversion",
      strategy:
        "Move fast from problem to CTA with compact social proof and a clear trial action.",
      summary: "A launch-oriented variant built for founder and PM reviews.",
      audience: arenaLiveVariantMeta["startup-conversion"].audience,
      files: [
        { path: "public/index.html", content: startupHtml },
        { path: "public/styles.css", content: startupCss },
      ],
    },
    "developer-minimal": {
      id: "developer-minimal",
      title: "Developer Minimal",
      strategy:
        "Use a quiet terminal panel and direct copy that explains the workflow in one scan.",
      summary: "A sparse variant for technical audiences who want signal first.",
      audience: arenaLiveVariantMeta["developer-minimal"].audience,
      files: [
        { path: "public/index.html", content: developerHtml },
        { path: "public/styles.css", content: developerCss },
      ],
    },
  };

  return requestedIds.map((id) => fallback[id]);
}

export function parseJsonish(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
  }

  return value;
}

function validateArenaLiveVariant(value: unknown): ArenaLiveVariant {
  if (!value || typeof value !== "object") {
    throw new Error("Variant must be an object.");
  }

  const variant = value as Partial<ArenaLiveVariant>;

  if (!isArenaLiveVariantId(variant.id)) {
    throw new Error("Variant id is invalid.");
  }
  const meta = arenaLiveVariantMeta[variant.id];
  const title =
    typeof variant.title === "string" && variant.title.trim()
      ? variant.title.trim()
      : meta.title;
  const strategy =
    typeof variant.strategy === "string" && variant.strategy.trim()
      ? variant.strategy.trim()
      : meta.strategy;
  const audience =
    typeof variant.audience === "string" && variant.audience.trim()
      ? variant.audience.trim()
      : meta.audience;
  const summary =
    typeof variant.summary === "string" && variant.summary.trim()
      ? variant.summary.trim()
      : strategy;
  if (!Array.isArray(variant.files) || variant.files.length !== 2) {
    throw new Error(`Variant ${variant.id} must include exactly two files.`);
  }

  const files = variant.files.map(validateArenaLiveFile);
  const sortedPaths = files.map((file) => file.path).sort().join("|");
  if (sortedPaths !== "public/index.html|public/styles.css") {
    throw new Error(`Variant ${variant.id} can only modify HTML and CSS.`);
  }

  return {
    id: variant.id,
    title,
    strategy,
    summary,
    audience,
    files,
  };
}

function validateArenaLiveFile(value: unknown): ArenaLiveFile {
  if (!value || typeof value !== "object") {
    throw new Error("Variant file must be an object.");
  }

  const file = value as Partial<ArenaLiveFile>;
  if (file.path !== "public/index.html" && file.path !== "public/styles.css") {
    throw new Error("Variant file path is not allowed.");
  }
  if (typeof file.content !== "string" || !file.content.trim()) {
    throw new Error(`Variant file ${file.path} content must be non-empty.`);
  }

  const lowerContent = file.content.toLowerCase();
  if (rejectedNeedles.some((needle) => lowerContent.includes(needle))) {
    throw new Error(`Variant file ${file.path} contains unsafe content.`);
  }

  return {
    path: file.path,
    content: file.content,
  };
}

function isArenaLiveVariantId(value: unknown): value is ArenaLiveVariantId {
  return (
    typeof value === "string" &&
    arenaLiveVariantIds.includes(value as ArenaLiveVariantId)
  );
}

const enterpriseHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ForkLab Enterprise Variant</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main class="hero">
      <nav><strong>ForkLab</strong><span>Sandboxed AI branch runs</span></nav>
      <section class="grid">
        <div>
          <p class="eyebrow">Enterprise Trust</p>
          <h1>AI-generated UI branches with proof your reviewers can audit.</h1>
          <p class="lede">ForkLab writes, runs, and verifies every variant in isolated BrowserPod sandboxes before a team reviews the Portal link.</p>
          <div class="actions"><a href="#proof">Review proof</a><a class="secondary" href="#controls">Governance controls</a></div>
        </div>
        <aside id="proof">
          <span>Verification packet</span>
          <strong>BrowserPod Portal captured</strong>
          <p>Files written, npm commands run, nonce returned, portal recorded.</p>
        </aside>
      </section>
    </main>
  </body>
</html>
`;

const enterpriseCss = `:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#050505;color:#f4fbff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 80% 10%,rgba(0,205,255,.18),transparent 28%),#050505}.hero{min-height:100vh;display:grid;align-content:center;gap:72px;padding:32px}nav{display:flex;justify-content:space-between;gap:16px;color:#9fb0b7}nav strong{color:#00cdff;letter-spacing:.12em;text-transform:uppercase}.grid{display:grid;grid-template-columns:minmax(0,1fr)360px;gap:32px;align-items:center}.eyebrow{margin:0 0 12px;color:#00cdff;font:700 12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em}h1{margin:0;max-width:850px;font-size:clamp(42px,7vw,82px);line-height:.96;letter-spacing:-.045em}.lede{max-width:650px;color:#c5d5da;font-size:20px;line-height:1.55}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.actions a{border:1px solid #00cdff;border-radius:6px;padding:13px 16px;background:#00cdff;color:#031014;text-decoration:none;font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:12px}.actions .secondary{background:transparent;border-color:#24353c;color:#f4fbff}aside{border:1px solid #222;border-radius:10px;background:rgba(19,19,19,.94);padding:24px;box-shadow:0 22px 80px rgba(0,0,0,.42)}aside span{color:#00cdff;font:700 12px ui-monospace,monospace;text-transform:uppercase}aside strong{display:block;margin:16px 0 10px;font-size:30px}aside p{color:#b9c9cf;line-height:1.55}@media(max-width:760px){.grid{grid-template-columns:1fr}.hero{padding:22px}nav{flex-direction:column}}`;

const startupHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ForkLab Startup Variant</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="badge">Launch sprint ready</p>
        <h1>Three homepage directions before your next standup.</h1>
        <p class="lede">ForkLab turns a product prompt into live frontend variants, terminal proof, and a clean path to team review.</p>
        <form><input aria-label="Work email" placeholder="team@company.com" /><button type="button">Get access</button></form>
        <div class="metrics"><div><strong>3</strong><span>variants</span></div><div><strong>1</strong><span>safe live run</span></div><div><strong>0</strong><span>local setup</span></div></div>
      </section>
    </main>
  </body>
</html>
`;

const startupCss = `:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#050505;color:#fff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(135deg,#050505,#071b22 55%,#050505)}main{min-height:100vh;display:grid;place-items:center;padding:28px}.hero{width:min(980px,100%);text-align:center}.badge{display:inline-flex;margin:0 0 20px;border:1px solid rgba(0,205,255,.42);border-radius:999px;padding:8px 12px;background:rgba(0,205,255,.1);color:#00cdff;font:800 12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.12em}h1{margin:0 auto;max-width:900px;font-size:clamp(40px,8vw,86px);line-height:.94;letter-spacing:-.045em}.lede{max-width:720px;margin:24px auto 0;color:#c9d8dd;font-size:20px;line-height:1.5}form{display:grid;grid-template-columns:minmax(0,1fr)auto;gap:10px;width:min(620px,100%);margin:34px auto 0;padding:8px;border:1px solid #222;border-radius:8px;background:rgba(19,19,19,.92)}input{min-width:0;border:0;outline:0;border-radius:5px;padding:0 14px;background:#050505;color:#fff;font-size:16px}button{border:0;border-radius:5px;padding:15px 18px;background:#00cdff;color:#041014;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:36px}.metrics div{border:1px solid #222;border-radius:8px;padding:18px;background:rgba(0,0,0,.28)}.metrics strong{display:block;color:#00cdff;font-size:34px}.metrics span{color:#9dadb4;font:700 12px ui-monospace,monospace;text-transform:uppercase}@media(max-width:680px){form,.metrics{grid-template-columns:1fr}input{min-height:48px}}`;

const developerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ForkLab Developer Variant</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main>
      <section class="shell">
        <p class="path">~/forklab/arena-live</p>
        <h1>Prompt. Fork. Run. Keep the proof.</h1>
        <p class="sub">Generate frontend variants without pulling the repo, installing packages locally, or hand-stitching screenshots.</p>
        <pre><code>$ forklab variants --count 3
write public/index.html
write public/styles.css
npm test
npm run start
portal ready</code></pre>
      </section>
    </main>
  </body>
</html>
`;

const developerCss = `:root{color-scheme:dark;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#050505;color:#e5e2e1}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#050505}main{min-height:100vh;display:grid;place-items:center;padding:24px}.shell{width:min(880px,100%)}.path{margin:0 0 18px;color:#00cdff;font-size:13px}h1{margin:0;max-width:780px;color:#fff;font:700 clamp(36px,7vw,72px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:-.045em}.sub{max-width:640px;margin:22px 0 0;color:#aebec4;font:400 18px/1.6 ui-sans-serif,system-ui,sans-serif}pre{margin:36px 0 0;overflow:auto;border:1px solid #222;border-radius:8px;padding:18px;background:#090909;color:#aebec4;line-height:1.7;box-shadow:inset 0 0 0 1px rgba(0,205,255,.04)}code{white-space:pre-wrap}`;
