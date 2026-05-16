import { NextResponse } from "next/server";
import { checkAccess } from "@/lib/api/auth-guard";

export async function GET() {
  const result = await checkAccess();

  if (!result.allowed) {
    return NextResponse.json(
      { ok: false, error: "Access denied", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      userId: result.userId,
      email: result.email,
      role: result.role,
    },
  });
}
