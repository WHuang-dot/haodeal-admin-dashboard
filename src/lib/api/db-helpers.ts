import { supabaseAdmin } from "@/lib/supabase/client";

interface ListOptions {
  table: string;
  select?: string;
  filters?: Record<string, string | string[] | null | undefined>;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function fetchList<T>(options: ListOptions) {
  const {
    table,
    select = "*",
    filters = {},
    sort = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
  } = options;

  let query = supabaseAdmin.from(table).select(select, { count: "exact" });

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (typeof value === "string") {
      if (value.startsWith("%") || value.endsWith("%")) {
        query = query.ilike(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  // Apply sorting and pagination
  query = query.order(sort, { ascending: order === "asc" });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data ?? []) as T[],
    total: count ?? 0,
    limit,
    offset,
  };
}

export async function fetchById<T>(
  table: string,
  id: string,
  select = "*"
): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(select)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as T;
}

export async function updateById<T>(
  table: string,
  id: string,
  updates: Record<string, unknown>
): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}
