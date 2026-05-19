import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";

type RuntimeSettingsPayload = {
  url_screenshot_enabled?: boolean | null;
  url_screenshot_timeout_ms?: number | null;
  url_screenshot_viewport_width?: number | null;
  url_screenshot_viewport_height?: number | null;
  url_screenshot_concurrency?: number | null;
  url_screenshot_browser_path?: string | null;
  image_transform_enabled?: boolean | null;
  image_transform_apimart_api_key?: string | null;
  image_transform_submit_url?: string | null;
  image_transform_task_url_base?: string | null;
  image_transform_prompt?: string | null;
  image_transform_model?: string | null;
  image_transform_poll_interval_ms?: number | null;
  image_transform_poll_timeout_ms?: number | null;
  image_transform_max_attempts?: number | null;
  enable_comment?: boolean | null;
  deploy_webhook_url?: string | null;
};

const NUMBER_FIELDS: Array<keyof RuntimeSettingsPayload> = [
  "url_screenshot_timeout_ms",
  "url_screenshot_viewport_width",
  "url_screenshot_viewport_height",
  "url_screenshot_concurrency",
  "image_transform_poll_interval_ms",
  "image_transform_poll_timeout_ms",
  "image_transform_max_attempts",
];

const BOOLEAN_FIELDS: Array<keyof RuntimeSettingsPayload> = [
  "url_screenshot_enabled",
  "image_transform_enabled",
  "enable_comment",
];

const STRING_FIELDS: Array<keyof RuntimeSettingsPayload> = [
  "url_screenshot_browser_path",
  "image_transform_apimart_api_key",
  "image_transform_submit_url",
  "image_transform_task_url_base",
  "image_transform_prompt",
  "image_transform_model",
  "deploy_webhook_url",
];

function normalizePayload(raw: Record<string, unknown>): RuntimeSettingsPayload {
  const normalized: RuntimeSettingsPayload = {};

  for (const field of NUMBER_FIELDS) {
    if (!(field in raw)) continue;
    const value = raw[field];
    if (value === null || value === "") {
      normalized[field] = null;
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`INVALID_${String(field).toUpperCase()}`);
    }
    normalized[field] = Math.trunc(value);
  }

  for (const field of BOOLEAN_FIELDS) {
    if (!(field in raw)) continue;
    const value = raw[field];
    if (value === null) {
      normalized[field] = null;
      continue;
    }
    if (typeof value !== "boolean") {
      throw new Error(`INVALID_${String(field).toUpperCase()}`);
    }
    normalized[field] = value;
  }

  for (const field of STRING_FIELDS) {
    if (!(field in raw)) continue;
    const value = raw[field];
    if (value === null) {
      normalized[field] = null;
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(`INVALID_${String(field).toUpperCase()}`);
    }
    normalized[field] = value.trim();
  }

  return normalized;
}

async function triggerDeploy(url: string) {
  const masked = url.length > 32 ? `${url.slice(0, 20)}...${url.slice(-8)}` : "****";

  let res = await fetch(url, { method: "POST" });
  if (res.status === 405) {
    res = await fetch(url, { method: "GET" });
  }

  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    masked_url: masked,
    body_preview: text.slice(0, 200),
  };
}

export async function GET() {
  return withRole("admin", async () => {
    try {
      const { data, error: dbError } = await supabaseAdmin
        .from("app_runtime_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        const { data: initialized, error: initError } = await supabaseAdmin
          .from("app_runtime_settings")
          .upsert(
            {
              singleton: true,
              enable_comment: true,
            },
            { onConflict: "singleton" }
          )
          .select("*")
          .single();

        if (initError) throw initError;
        return success(initialized);
      }

      return success(data);
    } catch (err) {
      console.error("Runtime settings get error:", err);
      return error("Failed to fetch runtime settings", "DB_ERROR");
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const raw = (await request.json()) as Record<string, unknown>;
      const payload = normalizePayload(raw);
      if (Object.keys(payload).length === 0) {
        return badRequest("No valid fields provided");
      }

      const saveData = {
        singleton: true,
        ...payload,
      };

      const { data, error: dbError } = await supabaseAdmin
        .from("app_runtime_settings")
        .upsert(saveData, { onConflict: "singleton" })
        .select("*")
        .single();

      if (dbError) throw dbError;

      const webhookUrl = (data as Record<string, unknown>).deploy_webhook_url;
      if (typeof webhookUrl !== "string" || webhookUrl.trim() === "") {
        return success({
          save: { ok: true },
          deploy: { ok: false, reason: "MISSING_DEPLOY_WEBHOOK_URL" },
          settings: data,
        });
      }

      const deploy = await triggerDeploy(webhookUrl.trim());
      if (!deploy.ok) {
        return error(
          "Settings saved but deploy trigger failed",
          "DEPLOY_ERROR",
          {
            save: { ok: true },
            deploy,
            settings: data,
          },
          502
        );
      }

      return success({
        save: { ok: true },
        deploy,
        settings: data,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save runtime settings";
      if (msg.startsWith("INVALID_")) {
        return badRequest(msg);
      }
      console.error("Runtime settings save error:", msg);
      return error("Failed to save runtime settings", "DB_ERROR");
    }
  });
}
