import {
  getSandboxIssue,
  sandboxRepo,
  type SandboxIssueId,
} from "@/lib/sandboxIssues";

export const dynamic = "force-dynamic";

type PushRequest = {
  issueId: SandboxIssueId;
  patchedContent: string;
};

type GitRefResponse = {
  object: { sha: string };
};

type GitHubContentResponse = {
  sha: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PushRequest>;
    if (!body.issueId || typeof body.patchedContent !== "string") {
      throw new Error("issueId and patchedContent are required.");
    }

    const issue = getSandboxIssue(body.issueId);
    if (!issue) throw new Error("Unknown sandbox issue.");
    if (!body.patchedContent.includes("export")) {
      throw new Error("Patch must keep the ES module export.");
    }

    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token || token === "replace_me") {
      throw new Error(
        "GITHUB_TOKEN is not configured, so ForkLab cannot push the verified patch.",
      );
    }

    const branchName = `forklab/issue-${issue.number}-${Date.now()}`;
    const mainRef = await githubJson<GitRefResponse>(
      `/repos/${sandboxRepo.fullName}/git/ref/heads/${sandboxRepo.defaultBranch}`,
      token,
    );

    await githubJson(
      `/repos/${sandboxRepo.fullName}/git/refs`,
      token,
      {
        method: "POST",
        body: {
          ref: `refs/heads/${branchName}`,
          sha: mainRef.object.sha,
        },
      },
    );

    const currentFile = await githubJson<GitHubContentResponse>(
      `/repos/${sandboxRepo.fullName}/contents/${issue.targetFile}?ref=${sandboxRepo.defaultBranch}`,
      token,
    );

    await githubJson(
      `/repos/${sandboxRepo.fullName}/contents/${issue.targetFile}`,
      token,
      {
        method: "PUT",
        body: {
          message: `fix: resolve issue #${issue.number}`,
          content: Buffer.from(body.patchedContent, "utf8").toString("base64"),
          sha: currentFile.sha,
          branch: branchName,
        },
      },
    );

    const branchUrl = `${sandboxRepo.url}/tree/${encodeURIComponent(branchName)}`;
    return Response.json({
      status: "pushed",
      branchName,
      branchUrl,
      issueUrl: `${sandboxRepo.url}/issues/${issue.number}`,
      message: `Verified patch pushed to ${branchName}.`,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Push failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}

async function githubJson<T = unknown>(
  path: string,
  token: string,
  options?: { method?: "POST" | "PUT"; body?: unknown },
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API ${response.status}: ${detail.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}
