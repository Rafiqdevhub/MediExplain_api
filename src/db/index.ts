import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as userSchema from "../models/users.model";
import { config } from "../config/env";

const databaseUrl = config.databaseUrl;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema: { ...userSchema } });
