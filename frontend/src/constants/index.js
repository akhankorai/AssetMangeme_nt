import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  ClipboardList,
  Cog,
  FileBarChart2,
  Fuel,
  HandCoins,
  ShieldCheck,
  Users,
  Wrench,
  DoorOpen,
  FileCheck,
} from "lucide-react";

export const navigation = [
  { label: "User Portal", icon: CheckCheck },
  { label: "Approvals", icon: FileCheck },
  { label: "Dashboard", icon: Boxes },
  { label: "Assets", icon: ClipboardList },
  { label: "Daily Inspection", icon: ShieldCheck },
  { label: "Schedule", icon: CalendarDays },
  { label: "Schedule Monthly Maintenance Task", icon: CalendarRange },
  { label: "Gate Pass", icon: DoorOpen },
  { label: "Fuel Demand", icon: Fuel },
  { label: "Expense", icon: HandCoins },
  { label: "Tasks", icon: CheckCheck },
  { label: "Team", icon: Users },
  { label: "Settings", icon: Cog },
  { label: "Reports", icon: FileBarChart2 },
];

export const globalNavigation = [
  { label: "Approvals", icon: FileCheck },
];

export const viewDescriptions = {
  "User Portal": "Submit fuel demands and maintenance bills for admin approval.",
  Admin: "Global administration controls for profile, user management, and session actions.",
  Dashboard: "Monitor asset status, live maintenance pressure, and the busiest locations from the database.",
  Assets: "Browse every asset and drill into the selected record.",
  "Daily Inspection": "Review tasks due today that need inspection decisions before execution.",
  Expense: "Track asset-related costs and review spend patterns across the fleet.",
  "Fuel Demand": "Create fuel allocations, debit liters from inventory, and monitor vehicle mileage trends.",
  Schedule: "Focus on assigned and maintenance assets that need operational follow-up.",
  Approvals: "Review and approve maintenance parts demands, work authorizations, and print requisition forms.",
  "Schedule Monthly Maintenance Task": "Plan month-long maintenance duty rosters, reserve inventory, and preview purchase needs.",
  Settings: "Configure workspace preferences and operational defaults.",
  Tasks: "Prioritize assets that are already assigned or currently in maintenance.",
  Team: "Manage employee categories and the team roster from the database.",
  "Gate Pass": "Track outward and inward movement of assets going outside the gate for external maintenance.",
  Reports: "Review status distribution and the heaviest asset concentrations.",
};

export const reportOptions = [
  {
    key: "monthly-schedule-inventory-demand",
    label: "Monthly Schedule Inventory Demand",
    description: "Compares current stock with monthly scheduled demand and highlights purchase shortfalls by required date.",
  },
  {
    key: "inventory-items",
    label: "Inventory Items",
    description: "Stock quantities, unit rates, and remaining inventory value.",
  },
  {
    key: "team",
    label: "Team",
    description: "Roster activity and category coverage for the selected period.",
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "Assigned work, service progress, and due-date visibility.",
  },
  {
    key: "fuel-consumption",
    label: "Fuel Consumption",
    description: "Vehicle-wise fuel history, liters consumed, and average mileage trends.",
  },
  {
    key: "expenses",
    label: "Expenses",
    description: "Maintenance spend by item, task, and asset tag.",
  },
  {
    key: "assets",
    label: "Assets",
    description: "Asset registrations, statuses, locations, and purchase history.",
  },
];

export const ROLE_ACTIONS = ["view", "create", "edit", "delete", "approve", "export"];
export const ROLE_SUBTYPES = [
  "dashboard",
  "assets",
  "schedule",
  "schedule_workflow",
  "fuel_demand",
  "fuel_workflow",
  "expense",
  "tasks",
  "team",
  "reports",
  "settings",
  "approvals",
];
export const ROLE_SUBTYPE_ACTIONS = {
  schedule_workflow: ["create_task", "inspect_task", "perform_task"],
  fuel_workflow: ["create_request", "inspect_fuel", "allocate_fuel", "deny_fuel"],
  approvals: ["read", "approve", "reject"],
};

export const DEFAULT_REGULAR_INSPECTION_LIST = [
  { id: "reg-1", category: "Engine", check_item: "Engine Oil Level", standard: "Normal" },
  { id: "reg-2", category: "Cooling", check_item: "Coolant Level", standard: "Normal" },
  { id: "reg-3", category: "Brake", check_item: "Brake Response", standard: "Proper" },
  { id: "reg-4", category: "Tyre", check_item: "Tyre Pressure", standard: "35 PSI" },
  { id: "reg-5", category: "Tyre", check_item: "Tyre Condition", standard: "Good grip" },
  { id: "reg-6", category: "Electrical", check_item: "Head Lights", standard: "Working" },
  { id: "reg-7", category: "Electrical", check_item: "Indicators", standard: "Working" },
  { id: "reg-8", category: "Safety", check_item: "Horn", standard: "Working" },
  { id: "reg-9", category: "Body", check_item: "Leakage Check", standard: "No leakage" },
  { id: "reg-10", category: "Cabin", check_item: "Wipers", standard: "Working" },
];

export const scheduleStages = [
  { key: "planned", label: "Planned" },
  { key: "inspection", label: "Inspection" },
  { key: "awaiting_parts", label: "Awaiting Parts" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];
