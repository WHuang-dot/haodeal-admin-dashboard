import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";

export async function GET() {
  try {
    const { data, error: dbError, count } = await supabaseAdmin
      .from("categories")
      .select("*", { count: "exact" })
      .order("category_code", { ascending: true })
      .range(0, 499);

    if (dbError) throw dbError;

    return success({
      data: data ?? [],
      total: count ?? 0,
      limit: 500,
      offset: 0,
    });
  } catch (err) {
    console.error("Categories list error:", err);
    return error("Failed to fetch categories", "DB_ERROR");
  }
}

export async function POST(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const body = await request.json();
      const { category_code, category, subcategory, aliases } = body;

      if (!category_code || !category) {
        return badRequest("category_code and category are required");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("categories")
        .insert({
          category_code,
          category,
          subcategory: subcategory ?? "",
          aliases: aliases ?? [],
          is_active: true,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Category created");
    } catch (err) {
      console.error("Category create error:", err);
      return error("Failed to create category", "DB_ERROR");
    }
  });
}
