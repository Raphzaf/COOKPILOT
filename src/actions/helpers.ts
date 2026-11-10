import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AuthError, assertAdmin, assertUser, persistDemoState } from "@/lib/auth/session";
import { getStore, type DataStore } from "@/lib/data";
import { StoreError } from "@/lib/data/supabase-store";
import type { SessionUser } from "@/lib/domain/types";

export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "DEVICE_LIMIT_REACHED"
  | "FAVORITE_LIMIT_REACHED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_IN_USE"
  | "WEAK_PASSWORD"
  | "DEMO_ONLY"
  | "DEMO_UNAVAILABLE"
  | "UNKNOWN";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ActionErrorCode };

export class ActionError extends Error {
  constructor(public readonly code: ActionErrorCode) {
    super(code);
    this.name = "ActionError";
  }
}

interface ActionContext {
  user: SessionUser;
  store: DataStore;
}

function toErrorCode(error: unknown): ActionErrorCode {
  if (error instanceof ActionError) return error.code;
  if (error instanceof AuthError) return error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN";
  if (error instanceof ZodError) return "INVALID_INPUT";
  if (error instanceof StoreError) {
    if (error.code === "DEVICE_LIMIT_REACHED" || error.code === "FAVORITE_LIMIT_REACHED") return error.code;
    if (error.code === "42501") return "FORBIDDEN";
  }
  // Details stay in server logs; clients only ever receive a code.
  console.error("[action] unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : "unknown");
  return "UNKNOWN";
}

async function run<T>(guard: () => Promise<SessionUser>, fn: (ctx: ActionContext) => Promise<T>, revalidate: boolean): Promise<ActionResult<T>> {
  try {
    const user = await guard();
    const store = await getStore();
    const data = await fn({ user, store });
    await persistDemoState(user.id);
    if (revalidate) revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toErrorCode(error) };
  }
}

/** Wraps a server action that requires a signed-in user. */
export function userAction<T>(fn: (ctx: ActionContext) => Promise<T>, options: { revalidate?: boolean } = {}): Promise<ActionResult<T>> {
  return run(assertUser, fn, options.revalidate ?? true);
}

/** Wraps a server action that requires the admin role (checked server-side on every call). */
export function adminAction<T>(fn: (ctx: ActionContext) => Promise<T>): Promise<ActionResult<T>> {
  return run(assertAdmin, fn, true);
}
