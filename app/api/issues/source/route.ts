import { getSandboxIssue, sandboxRepo } from "@/lib/sandboxIssues";

export const dynamic = "force-dynamic";

type GitHubContent = {
  content: string;
  encoding: string;
  sha: string;
  html_url: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { issueId?: string };
    if (!body.issueId) throw new Error("issueId is required.");
    const issue = getSandboxIssue(body.issueId);
    if (!issue) throw new Error("Unknown sandbox issue.");

    const response = await fetch(
      `https://api.github.com/repos/${sandboxRepo.fullName}/contents/${encodeURIComponentPath(
        issue.targetFile,
      )}?ref=${encodeURIComponent(sandboxRepo.defaultBranch)}`,
      {
        headers: githubHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub source request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GitHubContent;
    const sourceContent = Buffer.from(payload.content, "base64").toString("utf8");

    return Response.json({
      issueId: issue.id,
      targetFile: issue.targetFile,
      sourceContent,
      sha: payload.sha,
      htmlUrl: payload.html_url,
      repo: sandboxRepo.fullName,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Source fetch failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token && token !== "replace_me"
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };
}

function encodeURIComponentPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
