import {
  buildSandboxIssue,
  sandboxRepo,
  type SandboxIssue,
} from "@/lib/sandboxIssues";

export const dynamic = "force-dynamic";

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  pull_request?: unknown;
  labels: Array<string | { name?: string }>;
};

export async function GET() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${sandboxRepo.fullName}/issues?state=open&per_page=100`,
      {
        headers: githubHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub issues request failed with ${response.status}.`);
    }

    const githubIssues = ((await response.json()) as GitHubIssue[])
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? "",
        htmlUrl: issue.html_url,
        labels: issue.labels
          .map((label) => (typeof label === "string" ? label : label.name ?? ""))
          .filter(Boolean),
      }));

    const issues: SandboxIssue[] = githubIssues
      .map(buildSandboxIssue)
      .filter((issue): issue is SandboxIssue => issue !== null);

    const skipped = githubIssues.length - issues.length;

    return Response.json({
      repo: sandboxRepo,
      source: "github",
      issues,
      skippedWithoutTargetFile: skipped,
    });
  } catch (error) {
    return Response.json(
      {
        repo: sandboxRepo,
        source: "error",
        message: error instanceof Error ? error.message : String(error),
        issues: [] as SandboxIssue[],
      },
      { status: 200 },
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
