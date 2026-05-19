"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageItem {
  id: string;
  url: string;
  thumbnail_url: string;
  role: "source" | "generated";
  width: number;
  height: number;
  selected_for_draft: boolean;
  r2_key: string;
  provider: string;
  deal_id?: string | null;
  deal?: { id: string; title: string } | null;
}

interface ImagesResponse {
  data: ImageItem[];
  total: number;
  limit: number;
  offset: number;
}

interface RegenerateApiResponse {
  ok: boolean;
  error?: string;
  code?: string;
  details?: {
    debug?: Array<{
      phase: string;
      payload: Record<string, unknown>;
    }>;
  };
  data?: {
    imageId: string;
    status: string;
    taskId?: string;
    newUrl?: string;
    newKey?: string;
    debug?: Array<{
      phase: string;
      payload: Record<string, unknown>;
    }>;
  };
}

interface DeleteApiResponse {
  ok: boolean;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

interface ActionLogItem {
  time: string;
  level: "info" | "success" | "error";
  action: "regenerate" | "delete";
  imageId: string;
  phase: string;
  payload?: unknown;
}

export default function ImagesPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [dealIdFilter, setDealIdFilter] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [regeneratingImageIds, setRegeneratingImageIds] = useState<Set<string>>(new Set());
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(new Set());
  const [actionLogs, setActionLogs] = useState<ActionLogItem[]>([]);
  const { confirm, open, options, close } = useConfirmDialog();

  const params = new URLSearchParams();
  params.set("page", String(page));
  if (roleFilter) params.set("role", roleFilter);
  if (dealIdFilter) params.set("deal_id", dealIdFilter);
  params.set("_t", String(refreshKey));
  const url = `/api/admin/images?${params.toString()}`;

  const { data, loading, error } = useApi<ImagesResponse>(url);

  const handleImageError = (image: ImageItem) => {
    setFailedImages((prev) => new Set(prev).add(image.id));
  };

  const pushActionLog = (
    action: ActionLogItem["action"],
    imageId: string,
    phase: string,
    level: ActionLogItem["level"] = "info",
    payload?: unknown
  ) => {
    const time = new Date().toLocaleTimeString();
    setActionLogs((prev) => [{ time, level, action, imageId, phase, payload }, ...prev].slice(0, 200));
  };

  const executeRegenerateImage = async (imageId: string) => {
    if (regeneratingImageIds.has(imageId)) return;

    setRegeneratingImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });

    try {
      pushActionLog("regenerate", imageId, "request.start", "info", { imageId });
      const res = await fetch(`/api/admin/images/${imageId}/regenerate`, { method: "POST" });
      const json = (await res.json()) as RegenerateApiResponse;

      pushActionLog("regenerate", imageId, "api.response", res.ok ? "info" : "error", json);

      const debugLogs = json.data?.debug || json.details?.debug || [];
      for (const debugEvent of debugLogs) {
        const phase = debugEvent.phase || "debug.unknown";
        const isErrorPhase = phase.includes("error") || phase.includes("failed");
        pushActionLog(
          "regenerate",
          imageId,
          phase,
          isErrorPhase ? "error" : "info",
          debugEvent.payload
        );
      }

      if (!res.ok || !json.ok) {
        pushActionLog("regenerate", imageId, "regenerate.failed", "error", {
          error: json.error,
          code: json.code,
          details: json.details,
        });
        toast.error(json.error || "Failed to regenerate image");
        return;
      }

      pushActionLog("regenerate", imageId, "regenerate.success", "success", json.data);
      toast.success("Image regenerated");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      pushActionLog("regenerate", imageId, "request.exception", "error", {
        message: err instanceof Error ? err.message : String(err),
      });
      toast.error("Failed to regenerate image");
    } finally {
      setRegeneratingImageIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const executeDeleteImage = async (imageId: string) => {
    if (deletingImageIds.has(imageId)) return;

    setDeletingImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });

    try {
      pushActionLog("delete", imageId, "request.start", "info", { imageId });
      const res = await fetch(`/api/admin/images/${imageId}`, { method: "DELETE" });
      const json = (await res.json()) as DeleteApiResponse;

      pushActionLog("delete", imageId, "api.response", res.ok ? "info" : "error", json);

      if (!res.ok || !json.ok) {
        pushActionLog("delete", imageId, "delete.failed", "error", {
          error: json.error,
          code: json.code,
          details: json.details,
        });
        toast.error(json.error || "Failed to delete image");
        return;
      }

      pushActionLog("delete", imageId, "delete.success", "success", json.data);
      toast.success("Image deleted");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      pushActionLog("delete", imageId, "request.exception", "error", {
        message: err instanceof Error ? err.message : String(err),
      });
      toast.error("Failed to delete image");
    } finally {
      setDeletingImageIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const handleRegenerateImage = (image: ImageItem) => {
    confirm({
      title: "Re-generate Image",
      description: `Re-generate image ${image.id.slice(0, 8)}...? This will overwrite current image URL.`,
      confirmText: "Re-generate",
      onConfirm: async () => executeRegenerateImage(image.id),
    });
  };

  const handleDeleteImage = (image: ImageItem) => {
    confirm({
      title: "Delete Image",
      description: `Delete image ${image.id.slice(0, 8)}...? This will remove both R2 file and DB record.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => executeDeleteImage(image.id),
    });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Images" description="Manage source and generated images" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Image Action Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setActionLogs([])}>
              Clear Logs
            </Button>
          </div>
          <div className="max-h-72 overflow-auto rounded-md border border-border md:max-h-96">
            {actionLogs.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No logs yet.</div>
            ) : (
              actionLogs.map((log, idx) => (
                <div key={`${log.time}-${log.imageId}-${idx}`} className="border-b border-border p-3 text-xs">
                  <div className="mb-1 flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">[{log.time}]</span>
                    <span
                      className={
                        log.level === "error"
                          ? "text-destructive"
                          : log.level === "success"
                          ? "text-emerald-500"
                          : "text-foreground"
                      }
                    >
                      [{log.action}] [{log.phase}]
                    </span>
                    <span className="text-muted-foreground">{log.imageId.slice(0, 8)}...</span>
                  </div>
                  {log.payload !== undefined && (
                    <pre className="whitespace-pre-wrap break-all rounded bg-muted/20 p-2 font-mono">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v ?? "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All roles</SelectItem>
            <SelectItem value="source">Source</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by deal ID"
          value={dealIdFilter}
          onChange={(e) => {
            setDealIdFilter(e.target.value);
            setPage(1);
          }}
          className="w-[200px]"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images found"
          description={
            roleFilter || dealIdFilter
              ? "Try changing your filters."
              : "No images have been uploaded yet."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data.data.map((image) => (
              <div
                key={image.id}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card"
              >
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden bg-muted"
                  onClick={() => {
                    if (!failedImages.has(image.id)) {
                      setPreviewUrl(image.url);
                    }
                  }}
                >
                  {failedImages.has(image.id) ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                      <ImageIcon className="size-8 text-muted-foreground/50" />
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="font-mono text-foreground">ID: {image.id}</p>
                        <p className="font-mono">R2: {image.r2_key}</p>
                        <p>Provider: {image.provider}</p>
                        <p>Role: {image.role}</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={image.thumbnail_url}
                      alt={image.role}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={() => handleImageError(image)}
                    />
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={image.role === "source" ? "secondary" : "default"}>
                      {image.role}
                    </Badge>
                    {image.selected_for_draft && (
                      <Badge variant="outline">Selected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerateImage(image);
                      }}
                      disabled={regeneratingImageIds.has(image.id) || deletingImageIds.has(image.id)}
                    >
                      {regeneratingImageIds.has(image.id) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Re-generate
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image);
                      }}
                      disabled={deletingImageIds.has(image.id) || regeneratingImageIds.has(image.id)}
                    >
                      {deletingImageIds.has(image.id) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Delete
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {image.width} x {image.height}
                  </p>
                  {image.deal && (
                    <p className="truncate text-xs text-muted-foreground">
                      Deal: {image.deal.title}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

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
