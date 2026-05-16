import { UserRole } from "@/types";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  operator: 1,
  admin: 2,
};

export const ROLE_PERMISSIONS: Record<
  UserRole,
  { label: string; description: string }
> = {
  viewer: {
    label: "Viewer",
    description: "Read-only access to all data",
  },
  operator: {
    label: "Operator",
    description: "Can run pipeline, edit drafts, send content",
  },
  admin: {
    label: "Admin",
    description: "Full access including prompts, stores, categories, settings",
  },
};

/**
 * Check if a user has at least the required role level
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Actions that require confirmation dialog before execution
 */
export const HIGH_RISK_ACTIONS = [
  "send_draft",
  "edit_draft",
  "generate_cover",
  "run_pipeline",
  "activate_prompt",
  "add_store",
  "add_category",
  "manual_classify",
] as const;

export type HighRiskAction = (typeof HIGH_RISK_ACTIONS)[number];

export function isHighRiskAction(action: string): action is HighRiskAction {
  return HIGH_RISK_ACTIONS.includes(action as HighRiskAction);
}
