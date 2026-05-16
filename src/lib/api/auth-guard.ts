import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { error } from "@/lib/api/response";

export type UserRole = "viewer" | "operator" | "admin";

const ROLE_ORDER: Record<UserRole, number> = {
  viewer: 0,
  operator: 1,
  admin: 2,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole) {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[requiredRole];
}

function getAllowedEmails(): string[] {
  const env = process.env.ALLOWED_EMAILS;
  if (!env || env.trim() === "") return [];
  return env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isEmailAllowed(email: string | undefined): boolean {
  const allowed = getAllowedEmails();
  if (!email) return false;
  return allowed.includes(email.toLowerCase());
}

export async function getUserRole(): Promise<UserRole> {
  try {
    const user = await currentUser();
    return (user?.publicMetadata?.role as UserRole) || "viewer";
  } catch {
    return "viewer";
  }
}

export async function getUserEmail(): Promise<string | undefined> {
  try {
    const user = await currentUser();
    return user?.primaryEmailAddress?.emailAddress;
  } catch {
    return undefined;
  }
}

export async function checkAccess(): Promise<{
  allowed: boolean;
  userId?: string;
  email?: string;
  role: UserRole;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { allowed: false, role: "viewer" };
    }

    const email = await getUserEmail();
    if (!isEmailAllowed(email)) {
      return { allowed: false, userId, email, role: "viewer" };
    }

    const role = await getUserRole();
    return { allowed: true, userId, email, role };
  } catch {
    return { allowed: false, role: "viewer" };
  }
}

export async function withAuth<T>(
  handler: (userId: string) => Promise<NextResponse<any>>
): Promise<NextResponse<any>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return error("Unauthorized", "UNAUTHORIZED", undefined, 401);
    }

    const email = await getUserEmail();
    if (!isEmailAllowed(email)) {
      return error("Access denied", "FORBIDDEN", undefined, 403);
    }

    return handler(userId);
  } catch (err) {
    console.error("Auth error:", err);
    return error("Authentication failed", "AUTH_ERROR", undefined, 401);
  }
}

export async function withRole<T>(
  requiredRole: UserRole,
  handler: (userId: string, role: UserRole) => Promise<NextResponse<any>>
): Promise<NextResponse<any>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return error("Unauthorized", "UNAUTHORIZED", undefined, 401);
    }

    const email = await getUserEmail();
    if (!isEmailAllowed(email)) {
      return error("Access denied", "FORBIDDEN", undefined, 403);
    }

    const role = await getUserRole();
    if (!hasRole(role, requiredRole)) {
      return error(
        `${requiredRole} access required`,
        "FORBIDDEN",
        undefined,
        403
      );
    }

    return handler(userId, role);
  } catch (err) {
    console.error("Auth error:", err);
    return error("Authentication failed", "AUTH_ERROR", undefined, 401);
  }
}
