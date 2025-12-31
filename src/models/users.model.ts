import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "enterprise"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  plan: planEnum("plan").default("free").notNull(),
  filesUploadedCount: integer("files_uploaded_count").default(0).notNull(),
  monthlyFileLimit: integer("monthly_file_limit").default(5).notNull(),
  lastLimitReset: timestamp("last_limit_reset").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
