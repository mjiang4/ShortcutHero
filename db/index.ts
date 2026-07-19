import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type DatabaseBindings = {
  readonly DB?: D1Database;
};

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Cloudflare D1 binding `DB` is unavailable.");
    this.name = "DatabaseUnavailableError";
  }
}

export async function getD1Database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  const bindings = env as DatabaseBindings;
  if (!bindings.DB) throw new DatabaseUnavailableError();
  return bindings.DB;
}

export async function getDb() {
  return drizzle(await getD1Database(), { schema });
}
