import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const roleEnum = pgEnum("role", ["ADMIN", "TRAINER", "MEMBER"]);
export const statusEnum = pgEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]);
export const memberStatusEnum = pgEnum("member_status", ["ACTIVE", "INACTIVE", "EXPIRED", "FROZEN"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "CANCELLED",
  "COMPLETED",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["UPI", "CASH", "CARD", "NETBANKING", "OTHER"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT", "LATE"]);
export const attendanceMethodEnum = pgEnum("attendance_method", ["MANUAL", "QR", "APP"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "ANNOUNCEMENT",
  "PAYMENT",
  "MEMBERSHIP",
  "HOLIDAY",
  "EMERGENCY",
  "EVENT",
  "TRAINER",
]);

/* ------------------------------------------------------------------ */
/* Core                                                                */
/* ------------------------------------------------------------------ */

export const gyms = pgTable("gyms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  tagline: varchar("tagline", { length: 200 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 160 }),
  address: text("address"),
  logoText: varchar("logo_text", { length: 8 }),
  openingHours: varchar("opening_hours", { length: 120 }),
  currency: varchar("currency", { length: 8 }).notNull().default("INR"),
  inactivityDays: integer("inactivity_days").notNull().default(14),
  expiringThresholdDays: integer("expiring_threshold_days").notNull().default(7),
  reminderDays: jsonb("reminder_days").$type<number[]>().notNull().default([30, 15, 7, 3, 1]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id").notNull(),
    role: roleEnum("role").notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    email: varchar("email", { length: 190 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    profileImage: text("profile_image"),
    passwordHash: text("password_hash").notNull(),
    /** AES-256-GCM copy so the gym owner can re-share credentials; never sent to members. */
    passwordEnc: text("password_enc"),
    status: statusEnum("status").notNull().default("ACTIVE"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_gym_role_idx").on(table.gymId, table.role),
  ],
);

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id").notNull(),
    userId: integer("user_id").notNull(),
    memberCode: varchar("member_code", { length: 24 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 190 }),
    dob: date("dob"),
    gender: varchar("gender", { length: 24 }),
    address: text("address"),
    emergencyContact: varchar("emergency_contact", { length: 60 }),
    joiningDate: date("joining_date").notNull(),
    status: memberStatusEnum("status").notNull().default("ACTIVE"),
    profileImage: text("profile_image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("members_code_unique").on(table.memberCode),
    uniqueIndex("members_user_unique").on(table.userId),
    index("members_gym_status_idx").on(table.gymId, table.status),
    index("members_gym_name_idx").on(table.gymId, table.name),
  ],
);

export const trainers = pgTable(
  "trainers",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id").notNull(),
    userId: integer("user_id").notNull(),
    trainerCode: varchar("trainer_code", { length: 24 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 190 }),
    specialization: varchar("specialization", { length: 120 }),
    experienceYears: integer("experience_years").notNull().default(1),
    bio: text("bio"),
    joiningDate: date("joining_date").notNull(),
    status: statusEnum("status").notNull().default("ACTIVE"),
    profileImage: text("profile_image"),
  },
  (table) => [
    uniqueIndex("trainers_code_unique").on(table.trainerCode),
    uniqueIndex("trainers_user_unique").on(table.userId),
    index("trainers_gym_idx").on(table.gymId),
  ],
);

/* ------------------------------------------------------------------ */
/* Memberships                                                         */
/* ------------------------------------------------------------------ */

export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  durationDays: integer("duration_days").notNull().default(30),
  price: integer("price").notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  accent: varchar("accent", { length: 24 }).notNull().default("cyan"),
  status: statusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  memberId: integer("member_id").notNull(),
  planId: integer("plan_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  price: integer("price").notNull(),
  discount: integer("discount").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  amountDue: integer("amount_due").notNull().default(0),
  status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
  renewedFromId: integer("renewed_from_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("subs_gym_status_idx").on(table.gymId, table.status, table.endDate),
  index("subs_member_end_idx").on(table.memberId, table.endDate),
  index("subs_gym_due_idx").on(table.gymId, table.amountDue),
]);

/* ------------------------------------------------------------------ */
/* Money                                                              */
/* ------------------------------------------------------------------ */

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id").notNull(),
    memberId: integer("member_id").notNull(),
    subscriptionId: integer("subscription_id"),
    amount: integer("amount").notNull(),
    method: paymentMethodEnum("method").notNull().default("UPI"),
    paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
    receiptNumber: varchar("receipt_number", { length: 32 }).notNull(),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_receipt_unique").on(table.receiptNumber),
    index("payments_gym_date_idx").on(table.gymId, table.paymentDate),
    index("payments_member_idx").on(table.memberId, table.paymentDate),
  ],
);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  memberId: integer("member_id").notNull(),
  subscriptionId: integer("subscription_id"),
  paymentId: integer("payment_id"),
  invoiceNumber: varchar("invoice_number", { length: 32 }).notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  dueAmount: integer("due_amount").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("PENDING"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  dueDate: date("due_date"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  category: varchar("category", { length: 60 }).notNull().default("Operations"),
  amount: integer("amount").notNull(),
  expenseDate: date("expense_date").notNull(),
  notes: text("notes"),
});

/* ------------------------------------------------------------------ */
/* Attendance                                                         */
/* ------------------------------------------------------------------ */

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  userId: integer("user_id").notNull(),
  memberId: integer("member_id"),
  trainerId: integer("trainer_id"),
  date: date("date").notNull(),
  checkIn: timestamp("check_in", { withTimezone: true }),
  checkOut: timestamp("check_out", { withTimezone: true }),
  status: attendanceStatusEnum("status").notNull().default("PRESENT"),
  method: attendanceMethodEnum("method").notNull().default("MANUAL"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("attendance_member_day_unique").on(table.memberId, table.date),
  index("attendance_gym_date_idx").on(table.gymId, table.date),
  index("attendance_member_date_idx").on(table.memberId, table.date),
  index("attendance_trainer_date_idx").on(table.trainerId, table.date),
]);

export const trainerMembers = pgTable("trainer_members", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  trainerId: integer("trainer_id").notNull(),
  memberId: integer("member_id").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: varchar("status", { length: 24 }).notNull().default("ACTIVE"),
}, (table) => [
  index("trainer_members_trainer_idx").on(table.trainerId, table.status),
  index("trainer_members_member_idx").on(table.memberId, table.status),
]);

export const trainerContracts = pgTable("trainer_contracts", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  trainerId: integer("trainer_id").notNull(),
  employmentType: varchar("employment_type", { length: 40 }).notNull().default("FULL_TIME"),
  salary: integer("salary").notNull().default(0),
  commissionPct: integer("commission_pct").notNull().default(0),
  joiningDate: date("joining_date").notNull(),
  contractEnd: date("contract_end"),
  workingHours: varchar("working_hours", { length: 80 }).notNull().default("6 AM - 2 PM"),
  status: varchar("status", { length: 24 }).notNull().default("ACTIVE"),
});

/* ------------------------------------------------------------------ */
/* Communication                                                      */
/* ------------------------------------------------------------------ */

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull().default("ANNOUNCEMENT"),
  audience: varchar("audience", { length: 40 }).notNull().default("EVERYONE"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notifications_gym_created_idx").on(table.gymId, table.createdAt)]);

export const notificationRecipients = pgTable("notification_recipients", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").notNull(),
  userId: integer("user_id").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("notif_recipients_user_idx").on(table.userId, table.readAt),
  uniqueIndex("notif_recipients_unique").on(table.notificationId, table.userId),
]);

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  date: date("date").notNull(),
  description: text("description"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("holidays_gym_date_idx").on(table.gymId, table.date)]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  date: date("date").notNull(),
  description: text("description"),
  eventType: varchar("event_type", { length: 40 }).notNull().default("WORKSHOP"),
  capacity: integer("capacity").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("events_gym_date_idx").on(table.gymId, table.date)]);

/* ------------------------------------------------------------------ */
/* Governance                                                         */
/* ------------------------------------------------------------------ */

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  userId: integer("user_id"),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: integer("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_gym_created_idx").on(table.gymId, table.createdAt)]);

export const settingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  key: varchar("key", { length: 80 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Gym = typeof gyms.$inferSelect;
export type User = typeof users.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Trainer = typeof trainers.$inferSelect;
export type Plan = typeof membershipPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type GymEvent = typeof events.$inferSelect;
export type TrainerMember = typeof trainerMembers.$inferSelect;
export type TrainerContract = typeof trainerContracts.$inferSelect;
