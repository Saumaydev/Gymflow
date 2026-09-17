import {
  Activity,
  BadgeIndianRupee,
  BellRing,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  ChartLine,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  Gift,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  QrCode,
  Settings,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; badge?: string };
export type NavGroup = { title: string; items: NavItem[] };

/** Admin information architecture (PRD §17) */
export const adminNav: NavGroup[] = [
  {
    title: "Control",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: ChartLine },
      { label: "Reports", href: "/admin/reports", icon: FileText },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Members", href: "/admin/members", icon: Users },
      { label: "Trainers", href: "/admin/trainers", icon: Dumbbell },
      { label: "Memberships", href: "/admin/memberships", icon: BadgeIndianRupee },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Attendance", href: "/admin/attendance", icon: UserCheck },
      { label: "Communication", href: "/admin/communication", icon: Megaphone },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: Settings }],
  },
];

export const memberNav: NavGroup[] = [
  {
    title: "You",
    items: [
      { label: "Home", href: "/member", icon: LayoutDashboard },
      { label: "Membership", href: "/member/membership", icon: BadgeIndianRupee },
      { label: "Payments", href: "/member/payments", icon: CreditCard },
      { label: "Attendance", href: "/member/attendance", icon: Activity },
    ],
  },
  {
    title: "Gym",
    items: [
      { label: "Trainer", href: "/member/trainer", icon: Dumbbell },
      { label: "Notifications", href: "/member/notifications", icon: BellRing },
      { label: "Holidays & Events", href: "/member/holidays", icon: CalendarX2 },
      { label: "Profile", href: "/member/profile", icon: UserCheck },
    ],
  },
];

export const trainerNav: NavGroup[] = [
  {
    title: "Coaching",
    items: [
      { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
      { label: "My Members", href: "/trainer/members", icon: Users },
      { label: "Attendance", href: "/trainer/attendance", icon: UserCheck },
      { label: "Schedule", href: "/trainer/schedule", icon: CalendarRange },
      { label: "Profile", href: "/trainer/profile", icon: UserCheck },
    ],
  },
];

export const roleNav = {
  ADMIN: adminNav,
  MEMBER: memberNav,
  TRAINER: trainerNav,
} as const;

/** Mobile dock (PRD §84) */
export const mobileDock = {
  ADMIN: [
    { label: "Home", href: "/admin", icon: LayoutDashboard },
    { label: "Members", href: "/admin/members", icon: Users },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Activity", href: "/admin/attendance", icon: Activity },
    { label: "Profile", href: "/admin/settings", icon: Settings },
  ],
  MEMBER: [
    { label: "Home", href: "/member", icon: LayoutDashboard },
    { label: "Membership", href: "/member/membership", icon: BadgeIndianRupee },
    { label: "Payments", href: "/member/payments", icon: CreditCard },
    { label: "Activity", href: "/member/attendance", icon: Activity },
    { label: "Profile", href: "/member/profile", icon: UserCheck },
  ],
  TRAINER: [
    { label: "Home", href: "/trainer", icon: LayoutDashboard },
    { label: "Members", href: "/trainer/members", icon: Users },
    { label: "Attendance", href: "/trainer/attendance", icon: UserCheck },
    { label: "Profile", href: "/trainer/profile", icon: UserCheck },
  ],
} as const;

/** Quick action expansion (PRD §77) */
export const quickActions: Record<"ADMIN" | "TRAINER" | "MEMBER", NavItem[]> = {
  ADMIN: [
    { label: "Add Member", href: "/admin/members/new", icon: UserPlus },
    { label: "Record Payment", href: "/admin/payments?record=1", icon: CreditCard },
    { label: "Mark Attendance", href: "/admin/attendance?mark=1", icon: QrCode },
    { label: "Add Trainer", href: "/admin/trainers?new=1", icon: Dumbbell },
    { label: "Send Notification", href: "/admin/communication?new=1", icon: Megaphone },
    { label: "Add Holiday", href: "/admin/calendar?new=1", icon: CalendarX2 },
  ],
  TRAINER: [
    { label: "My Members", href: "/trainer/members", icon: Users },
    { label: "Attendance", href: "/trainer/attendance", icon: UserCheck },
  ],
  MEMBER: [
    { label: "Notifications", href: "/member/notifications", icon: BellRing },
    { label: "View Membership", href: "/member/membership", icon: Sparkles },
    { label: "Gym Events", href: "/member/holidays", icon: Gift },
    { label: "My Attendance", href: "/member/attendance", icon: Activity },
  ],
};

export const commandActions: Record<"ADMIN" | "TRAINER" | "MEMBER", { label: string; href: string; icon: LucideIcon; hint: string }[]> = {
  ADMIN: [
    { label: "Add Member", href: "/admin/members/new", icon: UserPlus, hint: "Onboarding flow" },
    { label: "Record Payment", href: "/admin/payments?record=1", icon: CreditCard, hint: "Partial payments supported" },
    { label: "Mark Attendance", href: "/admin/attendance?mark=1", icon: QrCode, hint: "QR / manual" },
    { label: "Add Trainer", href: "/admin/trainers?new=1", icon: Dumbbell, hint: "Staff onboarding" },
    { label: "Send Notification", href: "/admin/communication?new=1", icon: Megaphone, hint: "Announcements" },
    { label: "Add Holiday", href: "/admin/calendar?new=1", icon: CalendarX2, hint: "Calendar" },
  ],
  TRAINER: [
    { label: "My Members", href: "/trainer/members", icon: Users, hint: "Assigned roster" },
    { label: "Mark Attendance", href: "/trainer/attendance", icon: UserCheck, hint: "Daily log" },
  ],
  MEMBER: [
    { label: "My Membership", href: "/member/membership", icon: BadgeIndianRupee, hint: "Plan & renewal" },
    { label: "Payment History", href: "/member/payments", icon: CreditCard, hint: "Receipts" },
    { label: "Clipboard", href: "/member/profile", icon: ClipboardList, hint: "Profile" },
  ],
};

export const attentionIcons = { HeartPulse };
