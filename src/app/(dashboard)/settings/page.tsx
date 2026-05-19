"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RuntimeSettings {
  singleton: boolean;
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
  block_keywords?: string[] | null;
}

interface SaveLogEntry {
  time: string;
  level: "info" | "success" | "error";
  message: string;
  data?: unknown;
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function boolText(value: boolean | null | undefined) {
  return value ? "Enabled" : "Disabled";
}

function blockKeywordsToText(value: string[] | null | undefined): string {
  return (value ?? []).join("\n");
}

function textToBlockKeywords(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((v) => v.trim());
}

export default function SettingsPage() {
  const { data, loading, error, refetch } = useApi<RuntimeSettings>(
    "/api/admin/settings/runtime"
  );
  const { confirm, open, options, close } = useConfirmDialog();

  const [draft, setDraft] = useState<RuntimeSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [logs, setLogs] = useState<SaveLogEntry[]>([]);
  const blockKeywordsRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useMemo(
    () => draft ?? data ?? { singleton: true },
    [draft, data]
  );

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(data ?? { singleton: true }),
    [form, data]
  );

  const setField = <K extends keyof RuntimeSettings>(key: K, value: RuntimeSettings[K]) => {
    setDraft((prev) => ({ ...(prev ?? form), [key]: value }));
  };

  const appendLog = (level: SaveLogEntry["level"], message: string, data?: unknown) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, level, message, data }, ...prev].slice(0, 200));
  };

  const resizeBlockKeywords = () => {
    const el = blockKeywordsRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeBlockKeywords();
  }, [form.block_keywords]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        url_screenshot_timeout_ms: toNullableNumber(String(form.url_screenshot_timeout_ms ?? "")),
        url_screenshot_viewport_width: toNullableNumber(String(form.url_screenshot_viewport_width ?? "")),
        url_screenshot_viewport_height: toNullableNumber(String(form.url_screenshot_viewport_height ?? "")),
        url_screenshot_concurrency: toNullableNumber(String(form.url_screenshot_concurrency ?? "")),
        image_transform_poll_interval_ms: toNullableNumber(String(form.image_transform_poll_interval_ms ?? "")),
        image_transform_poll_timeout_ms: toNullableNumber(String(form.image_transform_poll_timeout_ms ?? "")),
        image_transform_max_attempts: toNullableNumber(String(form.image_transform_max_attempts ?? "")),
        block_keywords: form.block_keywords ?? [],
      };
      appendLog("info", "save.start", payload);

      const res = await fetch("/api/admin/settings/runtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      appendLog("info", "save.http_response", {
        status: res.status,
        statusText: res.statusText,
      });
      const json = await res.json();
      appendLog("info", "save.response_json", json);

      if (json.ok) {
        setDraft(null);
        appendLog("success", "save.success", json.data);
        appendLog("info", "save.refetch.start");
        await refetch();
        appendLog("success", "save.refetch.done");
        toast.success("Settings saved");
      } else {
        appendLog("error", "save.failed", json);
        toast.error(json.error || "Failed to save settings");
      }
    } catch (err) {
      appendLog("error", "save.catch_error", {
        message: err instanceof Error ? err.message : String(err),
      });
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    confirm({
      title: "Save Settings",
      description: "This will save settings to Supabase. Continue?",
      confirmText: "Save",
      variant: "default",
      onConfirm: saveSettings,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        <PageHeader title="Settings" description="Runtime settings and deploy controls" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 md:space-y-5">
        <PageHeader title="Settings" description="Runtime settings and deploy controls" />
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:space-y-5 md:pb-24">
      <PageHeader title="Settings" description="Runtime settings controls">
        <Badge variant="outline">{boolText(form.enable_comment)}</Badge>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>URL Screenshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 md:gap-4 md:p-5">
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.url_screenshot_enabled}
              onChange={(e) => setField("url_screenshot_enabled", e.target.checked)}
            />
            Enabled
          </Label>
          <Input value={form.url_screenshot_timeout_ms ?? ""} onChange={(e) => setField("url_screenshot_timeout_ms", toNullableNumber(e.target.value))} placeholder="timeout ms" />
          <Input value={form.url_screenshot_viewport_width ?? ""} onChange={(e) => setField("url_screenshot_viewport_width", toNullableNumber(e.target.value))} placeholder="viewport width" />
          <Input value={form.url_screenshot_viewport_height ?? ""} onChange={(e) => setField("url_screenshot_viewport_height", toNullableNumber(e.target.value))} placeholder="viewport height" />
          <Input value={form.url_screenshot_concurrency ?? ""} onChange={(e) => setField("url_screenshot_concurrency", toNullableNumber(e.target.value))} placeholder="concurrency" />
          <Input value={form.url_screenshot_browser_path ?? ""} onChange={(e) => setField("url_screenshot_browser_path", e.target.value)} placeholder="browser path" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image Transform</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 md:gap-4 md:p-5">
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.image_transform_enabled}
              onChange={(e) => setField("image_transform_enabled", e.target.checked)}
            />
            Enabled
          </Label>
          <div className="sm:col-span-2">
            <Label>API Key</Label>
            <div className="mt-1 flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={form.image_transform_apimart_api_key ?? ""}
                onChange={(e) => setField("image_transform_apimart_api_key", e.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => setShowApiKey((v) => !v)}>
                {showApiKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
          <Input value={form.image_transform_submit_url ?? ""} onChange={(e) => setField("image_transform_submit_url", e.target.value)} placeholder="submit url" />
          <Input value={form.image_transform_task_url_base ?? ""} onChange={(e) => setField("image_transform_task_url_base", e.target.value)} placeholder="task url base" />
          <Input value={form.image_transform_model ?? ""} onChange={(e) => setField("image_transform_model", e.target.value)} placeholder="model" />
          <Input value={form.image_transform_poll_interval_ms ?? ""} onChange={(e) => setField("image_transform_poll_interval_ms", toNullableNumber(e.target.value))} placeholder="poll interval ms" />
          <Input value={form.image_transform_poll_timeout_ms ?? ""} onChange={(e) => setField("image_transform_poll_timeout_ms", toNullableNumber(e.target.value))} placeholder="poll timeout ms" />
          <Input value={form.image_transform_max_attempts ?? ""} onChange={(e) => setField("image_transform_max_attempts", toNullableNumber(e.target.value))} placeholder="max attempts" />
          <div className="sm:col-span-2">
            <Label>Prompt</Label>
            <Textarea
              value={form.image_transform_prompt ?? ""}
              onChange={(e) => setField("image_transform_prompt", e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moderation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 md:space-y-4 md:p-5">
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.enable_comment}
              onChange={(e) => setField("enable_comment", e.target.checked)}
            />
            Enable Comment
          </Label>
          <div>
            <Label>Block Keywords (one per line)</Label>
            <Textarea
              ref={blockKeywordsRef}
              value={blockKeywordsToText(form.block_keywords)}
              onChange={(e) => {
                setField("block_keywords", textToBlockKeywords(e.target.value));
                requestAnimationFrame(resizeBlockKeywords);
              }}
              placeholder={"spam\nscam\nfake"}
              rows={2}
              className="font-mono min-h-[92px] overflow-hidden"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings Save Logs (Admin)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          <div className="mb-3 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setLogs([])}>
              Clear Logs
            </Button>
          </div>
          <div className="max-h-64 overflow-auto rounded-md border border-border md:max-h-80">
            {logs.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No logs yet.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={`${log.time}-${idx}`} className="border-b border-border p-3 text-xs">
                  <div className="mb-1 font-mono">
                    [{log.time}] [{log.level}] {log.message}
                  </div>
                  {log.data !== undefined && (
                    <pre className="whitespace-pre-wrap break-all rounded bg-muted/20 p-2 font-mono">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-6 right-6">
        <Button onClick={handleSaveClick} disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={close}
        title={options?.title ?? ""}
        description={options?.description ?? ""}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
        onConfirm={options?.onConfirm ?? (() => {})}
      />
    </div>
  );
}
