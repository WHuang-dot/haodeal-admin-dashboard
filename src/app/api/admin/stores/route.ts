import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";

export async function GET() {
  try {
    const { data, error: dbError, count } = await supabaseAdmin
      .from("stores")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(0, 499);

    if (dbError) throw dbError;

    return success({
      data: data ?? [],
      total: count ?? 0,
      limit: 500,
      offset: 0,
    });
  } catch (err) {
    console.error("Stores list error:", err);
    return error("Failed to fetch stores", "DB_ERROR");
  }
}

export async function POST(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const body = await request.json();
      const { store_code, name, name_cn, aliases, domains } = body;

      if (!store_code || !name) {
        return badRequest("store_code and name are required");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("stores")
        .insert({
          store_code,
          name,
          name_cn: name_cn ?? null,
          aliases: aliases ?? [],
          domains: domains ?? [],
          is_active: true,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Store created");
    } catch (err) {
      console.error("Store create error:", err);
      return error("Failed to create store", "DB_ERROR");
    }
  });
}
