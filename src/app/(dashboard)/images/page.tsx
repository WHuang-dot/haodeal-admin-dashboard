"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { ImageIcon } from "lucide-react";

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

export default function ImagesPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [dealIdFilter, setDealIdFilter] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Images" description="Manage source and generated images" />

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
                  <p className="text-xs text-muted-foreground">
                    {image.width} × {image.height}
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

      {/* Image Preview Dialog */}
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
    </div>
  );
}
