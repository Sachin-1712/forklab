"use client";

export type PodStatus =
  | "idle"
  | "booting"
  | "writing-files"
  | "running-command"
  | "patching"
  | "passed"
  | "failed";

type TextFileHandle = {
  write(data: string): Promise<number>;
  read(length: number): Promise<string>;
  getSize(): Promise<number>;
  close(): Promise<void>;
};

export type BrowserPodInstance = {
  createDirectory(path: string, opts?: { recursive?: boolean }): Promise<void>;
  createFile(path: string, mode: "utf-8" | "binary"): Promise<TextFileHandle>;
  run(
    executable: string,
    args: string[],
    opts: {
      terminal: unknown;
      cwd?: string;
      echo?: boolean;
      env?: string[];
    },
  ): Promise<unknown>;
  createDefaultTerminal(element: HTMLElement): Promise<unknown>;
  openFile(path: string, mode: "utf-8" | "binary"): Promise<TextFileHandle>;
};

type BrowserPodModule = {
  BrowserPod?: {
    boot(opts: {
      apiKey: string;
      nodeVersion?: string;
      storageKey?: string;
    }): Promise<BrowserPodInstance>;
  };
  default?: {
    boot(opts: {
      apiKey: string;
      nodeVersion?: string;
      storageKey?: string;
    }): Promise<BrowserPodInstance>;
  };
};

export type UserFacingError = {
  title: string;
  message: string;
  steps: string[];
};

export function getBrowserPodApiKey() {
  return process.env.NEXT_PUBLIC_BROWSERPOD_API_KEY?.trim() ?? "";
}

export function toUserFacingError(error: unknown): UserFacingError {
  if (isBrowserPodError(error)) {
    return error.userFacing;
  }

  const detail = error instanceof Error ? error.message : String(error);

  return {
    title: "BrowserPod command failed",
    message: detail || "The sandbox command did not complete.",
    steps: [
      "Check that your BrowserPod API key is valid and has available tokens.",
      "Reload the page after updating .env.local.",
      "Open the browser console for the low-level BrowserPod error.",
    ],
  };
}

export function assertBrowserPodReady() {
  const apiKey = getBrowserPodApiKey();

  if (!apiKey || apiKey === "replace_me" || apiKey === "paste_browserpod_key_here") {
    throw browserPodError({
      title: "BrowserPod API key is missing",
      message: "ForkLab needs a public BrowserPod key to boot a pod from the browser.",
      steps: [
        "Create a BrowserPod key at console.browserpod.io.",
        "Restrict the local key origin to http://localhost:3000.",
        "Paste it into NEXT_PUBLIC_BROWSERPOD_API_KEY in .env.local.",
        "Restart npm run dev so Next.js picks up the new value.",
      ],
    });
  }

  if (typeof window === "undefined") {
    throw browserPodError({
      title: "BrowserPod must run in the browser",
      message: "This code path was invoked outside a client component.",
      steps: ["Open /sandbox-test or /sprint in the browser and run the demo there."],
    });
  }

  if (!window.crossOriginIsolated) {
    throw browserPodError({
      title: "Cross-origin isolation headers are missing",
      message: "BrowserPod uses SharedArrayBuffer, which requires COOP and COEP headers.",
      steps: [
        "Confirm next.config.ts sends Cross-Origin-Opener-Policy: same-origin.",
        "Confirm next.config.ts sends Cross-Origin-Embedder-Policy: require-corp.",
        "Use http://localhost:3000 for local testing and hard refresh the page.",
      ],
    });
  }

  return apiKey;
}

export async function bootForkLabPod(storageKey: string) {
  const apiKey = assertBrowserPodReady();
  let mod: BrowserPodModule;

  try {
    mod = (await import("@leaningtech/browserpod")) as BrowserPodModule;
  } catch (error) {
    throw browserPodError(
      {
        title: "BrowserPod package import failed",
        message:
          "The @leaningtech/browserpod package could not be loaded by the client bundle.",
        steps: [
          "Run npm install to install @leaningtech/browserpod.",
          "Restart the Next.js dev server.",
          "Check the browser console for a bundling or network error.",
        ],
      },
      error,
    );
  }

  const BrowserPod = mod.BrowserPod ?? mod.default;

  if (!BrowserPod?.boot) {
    throw browserPodError({
      title: "BrowserPod API shape was not recognized",
      message: "The package loaded, but ForkLab could not find BrowserPod.boot().",
      steps: [
        "Check the installed @leaningtech/browserpod version.",
        "Use a current BrowserPod package that exports BrowserPod.",
      ],
    });
  }

  try {
    return await BrowserPod.boot({
      apiKey,
      nodeVersion: "22",
      storageKey,
    });
  } catch (error) {
    throw browserPodError(
      {
        title: "BrowserPod boot failed",
        message:
          "The browser sandbox did not finish booting. This can happen with an invalid key, exhausted tokens, or blocked cross-origin isolation.",
        steps: [
          "Verify the key in .env.local and restart the dev server.",
          "Confirm the key allows http://localhost:3000.",
          "Check that the page reports crossOriginIsolated as true.",
          "Try again in a Chromium-based browser if the current browser blocks SharedArrayBuffer.",
        ],
      },
      error,
    );
  }
}

export async function writeTextFile(
  pod: BrowserPodInstance,
  path: string,
  content: string,
) {
  const file = await pod.createFile(path, "utf-8");
  await file.write(content);
  await file.close();
}

export async function readTextFile(pod: BrowserPodInstance, path: string) {
  const file = await pod.openFile(path, "utf-8");
  const size = await file.getSize();
  const content = await file.read(size);
  await file.close();
  return content;
}

export function makeStorageKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function browserPodError(userFacing: UserFacingError, cause?: unknown) {
  const error = new Error(userFacing.message);
  (error as Error & { userFacing: UserFacingError; cause?: unknown }).userFacing =
    userFacing;
  (error as Error & { userFacing: UserFacingError; cause?: unknown }).cause = cause;
  return error;
}

function isBrowserPodError(
  error: unknown,
): error is Error & { userFacing: UserFacingError } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "userFacing" in error &&
      (error as { userFacing?: unknown }).userFacing,
  );
}
