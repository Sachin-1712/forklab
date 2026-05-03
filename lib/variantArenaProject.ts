import {
  getVariantDefinition,
  type GeneratedVariant,
  type VariantId,
} from "@/lib/llm/variantArenaSchema";

export const sampleRepoDescriptor = {
  name: "acme-landing-page",
  type: "Node.js / Express frontend demo",
  source: "Built-in sandbox repo",
  futureSource: "GitHub MCP / ZIP upload",
  files: [
    "package.json",
    "server.js",
    "public/index.html",
    "public/styles.css",
    "README.md",
  ],
} as const;

export const variantPortById: Record<VariantId, number> = {
  "enterprise-trust": 3000,
  "startup-conversion": 3001,
  "developer-minimal": 3002,
};

export function getVariantFolder(id: VariantId) {
  return `/forklab-variants/${id}`;
}

export function createVariantProjectFiles(
  variant: GeneratedVariant,
  runtime: "express" | "http",
) {
  return [
    {
      path: "package.json",
      content:
        runtime === "express" ? createExpressPackageJson() : createHttpPackageJson(),
    },
    {
      path: "server.js",
      content:
        runtime === "express"
          ? createExpressServer(variant.id)
          : createHttpServer(variant.id),
    },
    {
      path: "README.md",
      content: createReadme(variant),
    },
    ...variant.files,
  ];
}

export function createExpressPackageJson() {
  return `${JSON.stringify(
    {
      name: sampleRepoDescriptor.name,
      version: "1.0.0",
      private: true,
      scripts: {
        start: "node server.js",
      },
      dependencies: {
        express: "^5.1.0",
      },
    },
    null,
    2,
  )}
`;
}

export function createHttpPackageJson() {
  return `${JSON.stringify(
    {
      name: sampleRepoDescriptor.name,
      version: "1.0.0",
      private: true,
      scripts: {
        start: "node server.js",
      },
      dependencies: {},
    },
    null,
    2,
  )}
`;
}

function createExpressServer(id: VariantId) {
  return `const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT || ${variantPortById[id]});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", runtime: "express", variant: "${id}" });
});

app.listen(port, "0.0.0.0", () => {
  console.log("acme-landing-page ${id} listening on port " + port);
});
`;
}

function createHttpServer(id: VariantId) {
  return `const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT || ${variantPortById[id]});
const publicDir = path.join(__dirname, "public");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const rawPath = req.url === "/" ? "/index.html" : req.url || "/index.html";
  const safePath = path.normalize(rawPath).replace(/^\\.\\.(\\/|\\\\|$)/, "");
  const filePath = path.join(publicDir, safePath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "content-type": mimeTypes[ext] || "text/plain; charset=utf-8" });
    res.end(data);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log("acme-landing-page ${id} listening on port " + port + " via node:http");
});
`;
}

function createReadme(variant: GeneratedVariant) {
  const definition = getVariantDefinition(variant.id);

  return `# ${sampleRepoDescriptor.name}

Variant: ${variant.title}
Goal: ${definition.goal}

This is a built-in ForkLab sandbox repo for Variant Arena.

Files:
- public/index.html
- public/styles.css
- server.js

Runtime:
- Express when npm install succeeds
- Built-in node:http fallback if package install fails
`;
}
