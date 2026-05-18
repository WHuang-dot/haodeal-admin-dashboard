import { supabaseAdmin } from "@/lib/supabase/client";

type RuntimeSettingsRow = {
  image_transform_enabled: boolean | null;
  image_transform_apimart_api_key: string | null;
  image_transform_submit_url: string | null;
  image_transform_task_url_base: string | null;
  image_transform_prompt: string | null;
  image_transform_model: string | null;
  image_transform_poll_interval_ms: number | null;
  image_transform_poll_timeout_ms: number | null;
  image_transform_max_attempts: number | null;
};

type SubmitResponse = {
  code?: number;
  id?: string;
  task_id?: string;
  data?:
    | {
        id?: string;
        task_id?: string;
      }
    | Array<{
        id?: string;
        task_id?: string;
        status?: string;
      }>;
};

type TaskResponse = {
  code?: number;
  data?: {
    status?: string;
    result?: {
      images?: Array<{
        url?: string[];
      }>;
    };
  };
};

export type ImageTransformConfig = {
  apiKey: string;
  submitUrl: string;
  taskUrlBase: string;
  prompt: string;
  model: string;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  maxAttempts: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTaskStatus(status: string | undefined) {
  return (status || "").toLowerCase();
}

export async function getImageTransformConfig(): Promise<ImageTransformConfig> {
  const { data, error } = await supabaseAdmin
    .from("app_runtime_settings")
    .select(
      "image_transform_enabled, image_transform_apimart_api_key, image_transform_submit_url, image_transform_task_url_base, image_transform_prompt, image_transform_model, image_transform_poll_interval_ms, image_transform_poll_timeout_ms, image_transform_max_attempts"
    )
    .eq("singleton", true)
    .single<RuntimeSettingsRow>();

  if (error || !data) {
    throw new Error("APP_RUNTIME_SETTINGS_NOT_FOUND");
  }

  if (!data.image_transform_enabled) {
    throw new Error("IMAGE_TRANSFORM_DISABLED");
  }

  const apiKey = data.image_transform_apimart_api_key?.trim();
  const submitUrl = data.image_transform_submit_url?.trim();
  const taskUrlBase = data.image_transform_task_url_base?.trim();
  const prompt = data.image_transform_prompt?.trim();
  const model = data.image_transform_model?.trim();
  const pollIntervalMs = data.image_transform_poll_interval_ms ?? 3000;
  const pollTimeoutMs = data.image_transform_poll_timeout_ms ?? 120000;
  const maxAttempts = data.image_transform_max_attempts ?? 40;

  if (!apiKey) throw new Error("MISSING_IMAGE_TRANSFORM_API_KEY");
  if (!submitUrl) throw new Error("MISSING_IMAGE_TRANSFORM_SUBMIT_URL");
  if (!taskUrlBase) throw new Error("MISSING_IMAGE_TRANSFORM_TASK_URL_BASE");
  if (!prompt) throw new Error("MISSING_IMAGE_TRANSFORM_PROMPT");
  if (!model) throw new Error("MISSING_IMAGE_TRANSFORM_MODEL");
  if (pollIntervalMs <= 0) throw new Error("INVALID_POLL_INTERVAL");
  if (pollTimeoutMs <= 0) throw new Error("INVALID_POLL_TIMEOUT");
  if (maxAttempts <= 0) throw new Error("INVALID_MAX_ATTEMPTS");

  return {
    apiKey,
    submitUrl,
    taskUrlBase,
    prompt,
    model,
    pollIntervalMs,
    pollTimeoutMs,
    maxAttempts,
  };
}

export async function submitImageTransformTask(
  config: ImageTransformConfig,
  imageUrl: string
): Promise<string> {
  const payload = {
    model: config.model,
    prompt: config.prompt,
    n: 1,
    size: "1:1",
    resolution: "1k",
    image_urls: [imageUrl],
  };

  const res = await fetch(config.submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`SUBMIT_REQUEST_FAILED_${res.status}`);
  }

  const json = (await res.json()) as SubmitResponse;
  const dataObj =
    Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : json?.data;
  const taskId =
    dataObj?.id ||
    dataObj?.task_id ||
    json?.id ||
    json?.task_id;
  if (!taskId) {
    const topLevelKeys = Object.keys(json || {}).join(",");
    const dataKeys =
      json && json.data && typeof json.data === "object"
        ? Object.keys(json.data).join(",")
        : "";
    throw new Error(
      `SUBMIT_TASK_ID_MISSING(top=${topLevelKeys};data=${dataKeys})`
    );
  }

  return taskId;
}

export async function pollImageTransformTask(
  config: ImageTransformConfig,
  taskId: string
): Promise<string> {
  const start = Date.now();
  const base = config.taskUrlBase.replace(/\/+$/, "");
  const attemptsByTimeout =
    Math.ceil(config.pollTimeoutMs / config.pollIntervalMs) + 2;
  const effectiveMaxAttempts = Math.max(config.maxAttempts, attemptsByTimeout);

  for (let attempt = 1; attempt <= effectiveMaxAttempts; attempt += 1) {
    if (Date.now() - start > config.pollTimeoutMs) {
      throw new Error("TASK_POLL_TIMEOUT");
    }

    const taskUrl = `${base}/${taskId}?language=en`;
    const res = await fetch(taskUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`TASK_REQUEST_FAILED_${res.status}`);
    }

    const json = (await res.json()) as TaskResponse;
    const status = normalizeTaskStatus(json?.data?.status);

    if (status === "completed") {
      const newUrl = json?.data?.result?.images?.[0]?.url?.[0];
      if (!newUrl) {
        throw new Error("TASK_COMPLETED_NO_IMAGE_URL");
      }
      return newUrl;
    }

    if (status === "failed" || status === "cancelled") {
      throw new Error(`TASK_${status.toUpperCase()}`);
    }

    await sleep(config.pollIntervalMs);
  }

  throw new Error("TASK_POLL_TIMEOUT");
}

export function appendSecReSuffix(key: string | null | undefined): string {
  const raw = (key || "").trim();
  if (!raw) return `generated-${Date.now()}-sec-RE.png`;

  if (raw.endsWith("-sec-RE.png")) return raw;
  if (raw.endsWith(".png")) return raw.replace(/\.png$/i, "-sec-RE.png");
  if (raw.endsWith(".jpg")) return raw.replace(/\.jpg$/i, "-sec-RE.jpg");
  if (raw.endsWith(".jpeg")) return raw.replace(/\.jpeg$/i, "-sec-RE.jpeg");
  if (raw.endsWith(".webp")) return raw.replace(/\.webp$/i, "-sec-RE.webp");

  return `${raw}-sec-RE`;
}
