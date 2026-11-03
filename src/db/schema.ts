import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  client: text("client"),
  description: text("description"),
  color: text("color").notNull().default("#22d3ee"),
  status: text("status").notNull().default("active"), // active | paused | done | archived
  progress: integer("progress").notNull().default(0),
  budget: doublePrecision("budget").notNull().default(0),
  spent: doublePrecision("spent").notNull().default(0),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("todo"), // backlog | todo | doing | review | done
  priority: text("priority").notNull().default("med"), // low | med | high | urgent
  due: timestamp("due", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull().default("expense"), // income | expense
  amount: doublePrecision("amount").notNull().default(0),
  category: text("category").notNull().default("عام"),
  note: text("note"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  status: text("status").notNull().default("lead"), // lead | active | archived
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  kind: text("kind").notNull().default("note"), // note | report
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Note = typeof notes.$inferSelect;
