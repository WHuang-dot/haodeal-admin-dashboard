"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { getDealDisplayTitle } from "@/lib/deal-title";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  ImageIcon,
  Save,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  Check,
  Pencil,
  MousePointerClick,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Deal {
  id: string;
  title_en: string | null;
  title_cn: string | null;
  platform: string;
  brand: string | null;
  price: string | number | null;
  sale_price: string | number | null;
  original_price: string | number | null;
  discount: string | null;
  coupon_code: string | null;
  url: string | null;
  store_code: string | null;
  category_code: string | null;
  status: string;
  store_match_status: string | null;
  category_match_status: string | null;
  created_at: string;
  stores?: { name: string; name_cn: string; aliases: string[] | null; domains: string[] | null } | null;
  categories?: { category: string; subcategory: string; aliases: string[] | null } | null;
}

interface Draft {
  id: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "published";
  model: string;
  created_at: string;
  updated_at: string;
  selected_image_ids: string[];
  likes?: number;
  clicks?: number;
}

interface DealImage {
  id: string;
  r2_original_url: string | null;
  r2_thumbnail_url: string | null;
  role: string | null;
  selected_for_draft: boolean;
  width: number | null;
  height: number | null;
}

interface DealDetailResponse {
  deal: Deal;
  drafts: Draft[];
  images: DealImage[];
  updates: Array<Record<string, unknown>>;
}

interface StoreItem {
  store_code: string;
  name: string;
  name_cn: string | null;
}

interface CategoryItem {
  category_code: string;
  category: string;
  subcategory: string;
}

interface RegenerateLogItem {
  id: string;
  ts: number;
  imageId: string;
  message: string;
  level: "info" | "success" | "error";
}

function formatField(label: string, value: string | number | null) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary";
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "published":
      return "outline";
    default:
      return "outline";
  }
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [refreshKey, setRefreshKey] = useState(0);
  const [storeCode, setStoreCode] = useState<string>("");
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [classifying, setClassifying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regeneratingImageIds, setRegeneratingImageIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(
    new Set()
  );
  const [regenerateLogs, setRegenerateLogs] = useState<RegenerateLogItem[]>([]);
  const [regenerateStartedAt, setRegenerateStartedAt] = useState<Record<string, number>>(
    {}
  );
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState("");
  const [savingField, setSavingField] = useState(false);
  const { confirm, open, options, close } = useConfirmDialog();

  const detailUrl = useMemo(
    () => `/api/admin/deals/${id}?_t=${refreshKey}`,
    [id, refreshKey]
  );

  const { data, loading, error } = useApi<DealDetailResponse>(detailUrl);

  const { data: storesResponse } = useApi<{ data: StoreItem[] }>("/api/admin/stores");
  const { data: categoriesResponse } = useApi<{ data: CategoryItem[] }>(
    "/api/admin/categories"
  );

  const deal = data?.deal;
  const drafts = data?.drafts ?? [];
  const images = data?.images ?? [];

  const stores = storesResponse?.data ?? [];
  const categories = categoriesResponse?.data ?? [];

  const pushRegenLog = (
    imageId: string,
    message: string,
    level: "info" | "success" | "error" = "info"
  ) => {
    setRegenerateLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: Date.now(),
        imageId,
        message,
        level,
      },
      ...prev,
    ].slice(0, 60));
  };

  const handleClassify = async () => {
    if (!storeCode && !categoryCode) {
      toast.error("Please select a store or category");
      return;
    }
    setClassifying(true);
    try {
      const body: Record<string, string> = {};
      if (storeCode) body.store_code = storeCode;
      if (categoryCode) body.category_code = categoryCode;

      const res = await fetch(`/api/admin/deals/${id}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message || "Classification updated");
        setStoreCode("");
        setCategoryCode("");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(json.error || "Failed to update classification");
      }
    } catch {
      toast.error("Failed to update classification");
    } finally {
      setClassifying(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/deals/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message || "Draft generation queued");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(json.error || "Failed to generate draft");
      }
    } catch {
      toast.error("Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  };

  const expandDraft = (draft: Draft) => {
    if (expandedDraftId === draft.id) {
      setExpandedDraftId(null);
      setEditingDraftId(null);
    } else {
      setExpandedDraftId(draft.id);
      setEditingDraftId(null);
    }
  };

  const startEditDraft = (draft: Draft) => {
    setEditingDraftId(draft.id);
    setEditTitle(draft.title);
    setEditBody(draft.body);
  };

  const cancelEditDraft = () => {
    setEditingDraftId(null);
  };

  const saveDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/admin/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, body: editBody }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Draft saved");
        setEditingDraftId(null);
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(json.error || "Failed to save draft");
      }
    } catch {
      toast.error("Failed to save draft");
    }
  };

  const copyDraftBody = async (body: string, draftId: string) => {
    await navigator.clipboard.writeText(body);
    setCopied(draftId);
    setTimeout(() => setCopied(null), 2000);
  };

  const changeDraftStatus = (draft: Draft, newStatus: string) => {
    confirm({
      title: `Change to ${newStatus}`,
      description: `Update "${draft.title}" status to ${newStatus}?`,
      confirmText: "Update",
      variant: newStatus === "rejected" ? "destructive" : "default",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/drafts/${draft.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          const json = await res.json();
          if (json.ok) {
            toast.success(`Status updated to ${newStatus}`);
            setRefreshKey((k) => k + 1);
          } else {
            toast.error(json.error || "Failed to update status");
          }
        } catch {
          toast.error("Failed to update status");
        }
      },
    });
  };

  const sendDraft = (draft: Draft) => {
    confirm({
      title: "Send Draft",
      description: `Send "${draft.title}"?`,
      confirmText: "Send",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/drafts/${draft.id}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const json = await res.json();
          if (json.ok) {
            toast.success("Draft sent");
            setRefreshKey((k) => k + 1);
          } else {
            toast.error(json.error || "Failed to send draft");
          }
        } catch {
          toast.error("Failed to send draft");
        }
      },
    });
  };

  const toggleImageForDraft = async (draft: Draft, imageId: string) => {
    const currentIds = draft.selected_image_ids ?? [];
    const isSelected = currentIds.includes(imageId);
    const newIds = isSelected
      ? currentIds.filter((iid) => iid !== imageId)
      : [...currentIds, imageId];

    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_ids: newIds }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(isSelected ? "Image removed" : "Image selected");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(json.error || "Failed to update image selection");
      }
    } catch {
      toast.error("Failed to update image selection");
    }
  };

  const executeRegenerateImage = async (imageId: string) => {
    if (regeneratingImageIds.has(imageId)) return;

    setRegenerateStartedAt((prev) => ({ ...prev, [imageId]: Date.now() }));
    pushRegenLog(imageId, "开始重生成：准备提交到 apimart");
    setRegeneratingImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });

    try {
      pushRegenLog(imageId, "任务已提交，等待处理（通常 30-120 秒）");
      const res = await fetch(`/api/admin/images/${imageId}/regenerate`, {
        method: "POST",
      });
      const json = await res.json();
      const debugEvents = (json?.data?.debug ||
        json?.details?.debug ||
        []) as Array<{ phase: string; payload: Record<string, unknown> }>;

      if (Array.isArray(debugEvents) && debugEvents.length > 0) {
        debugEvents.forEach((evt) => {
          pushRegenLog(
            imageId,
            `[${evt.phase}] ${JSON.stringify(evt.payload)}`,
            "info"
          );
        });
      } else {
        pushRegenLog(imageId, `[api.response] ${JSON.stringify(json)}`, "info");
      }

      if (json.ok) {
        const taskId = json?.data?.taskId as string | undefined;
        if (taskId) {
          pushRegenLog(
            imageId,
            `任务完成（task: ${taskId}），正在刷新图片...`,
            "success"
          );
        } else {
          pushRegenLog(imageId, "任务完成，正在刷新图片...", "success");
        }
        toast.success("Image regenerated");
        setRefreshKey((k) => k + 1);
      } else {
        pushRegenLog(
          imageId,
          `任务失败：${json.error || "Failed to regenerate image"}`,
          "error"
        );
        toast.error(json.error || "Failed to regenerate image");
      }
    } catch {
      pushRegenLog(imageId, "请求失败：网络异常或服务错误", "error");
      toast.error("Failed to regenerate image");
    } finally {
      setRegeneratingImageIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
      setRegenerateStartedAt((prev) => {
        const next = { ...prev };
        delete next[imageId];
        return next;
      });
    }
  };

  const handleRegenerateImage = (image: DealImage) => {
    confirm({
      title: "Re-generate Image",
      description: `Re-generate image ${image.id.slice(0, 8)}...? This will overwrite current image URL.`,
      confirmText: "Re-generate",
      variant: "default",
      onConfirm: async () => {
        await executeRegenerateImage(image.id);
      },
    });
  };

  const handleDeleteImage = (image: DealImage) => {
    if (deletingImageIds.has(image.id)) return;
    confirm({
      title: "Delete Image",
      description: `Delete image ${image.id.slice(0, 8)}...? This will remove both R2 file and DB record.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        setDeletingImageIds((prev) => {
          const next = new Set(prev);
          next.add(image.id);
          return next;
        });
        try {
          const res = await fetch(`/api/admin/images/${image.id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (!json.ok) {
            throw new Error(json.error || "Failed to delete image");
          }
          toast.success("Image deleted");
          setRefreshKey((k) => k + 1);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete image");
        } finally {
          setDeletingImageIds((prev) => {
            const next = new Set(prev);
            next.delete(image.id);
            return next;
          });
        }
      },
    });
  };

  const handleDeleteDeal = () => {
    confirm({
      title: "Delete Deal",
      description: `Delete "${title}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/deals/${id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (!json.ok) {
            throw new Error(json.error || "Failed to delete deal");
          }
          toast.success("Deal deleted");
          router.push("/deals");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete deal");
        }
      },
    });
  };

  useEffect(() => {
    if (regeneratingImageIds.size === 0) return;
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [regeneratingImageIds.size]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Deal Detail" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="space-y-6">
        <PageHeader title="Deal Detail" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load deal"
          description={error || "Deal not found"}
          action={
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Deals
            </Link>
          }
        />
      </div>
    );
  }

  const title = getDealDisplayTitle(deal);
  const dealTableFields = Object.entries(deal as Record<string, unknown>)
    .filter(([key]) => key !== "stores" && key !== "categories")
    .sort(([a], [b]) => a.localeCompare(b));

  const IMMUTABLE_FIELDS = new Set(["id", "created_at", "updated_at"]);

  const stringifyFieldValue = (value: unknown) => {
    if (value === null) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const startEditField = (key: string, value: unknown) => {
    setEditingFieldKey(key);
    setEditingFieldValue(stringifyFieldValue(value));
  };

  const cancelEditField = () => {
    setEditingFieldKey(null);
    setEditingFieldValue("");
  };

  const parseFieldValueByOriginal = (raw: string, originalValue: unknown) => {
    const trimmed = raw.trim();
    if (trimmed === "null") return null;

    if (originalValue === null) {
      if (trimmed === "") return null;
      return raw;
    }

    if (typeof originalValue === "number") {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) throw new Error("Must be a valid number");
      return n;
    }

    if (typeof originalValue === "boolean") {
      if (trimmed === "true") return true;
      if (trimmed === "false") return false;
      throw new Error("Must be true or false");
    }

    if (typeof originalValue === "object") {
      return JSON.parse(raw) as unknown;
    }

    return raw;
  };

  const confirmEditField = async (key: string, originalValue: unknown) => {
    if (IMMUTABLE_FIELDS.has(key)) {
      toast.error(`${key} cannot be edited`);
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = parseFieldValueByOriginal(editingFieldValue, originalValue);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid field value");
      return;
    }

    setSavingField(true);
    try {
      const res = await fetch(`/api/admin/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: parsedValue }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Failed to update deal");
      }
      toast.success(`${key} updated`);
      cancelEditField();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update deal");
    } finally {
      setSavingField(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={`ID: ${deal.id}`}>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteDeal}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Deal
          </Button>
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </PageHeader>

      {/* Deal Info + Classification */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Deal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {formatField("Platform", deal.platform)}
              {formatField("Brand", deal.brand)}
              {formatField("Price", deal.price)}
              {formatField("Sale Price", deal.sale_price)}
              {formatField("Original Price", deal.original_price)}
              {formatField("Discount", deal.discount)}
              {formatField("Coupon", deal.coupon_code)}
              {formatField("Status", deal.status)}
              {deal.url && (
                <div className="flex flex-col col-span-full sm:col-span-1">
                  <span className="text-xs text-muted-foreground">URL</span>
                  <a
                    href={deal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline truncate"
                  >
                    {deal.url}
                  </a>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Classification</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Store</span>
                    {deal.store_match_status === "matched" ? (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Matched
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unmatched
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    {deal.stores?.name_cn || deal.stores?.name || deal.store_code || "—"}
                  </div>
                  {deal.stores?.aliases && deal.stores.aliases.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Aliases: {deal.stores.aliases.join(", ")}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Category</span>
                    {deal.category_match_status === "matched" ? (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Matched
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unmatched
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    {deal.categories
                      ? `${deal.categories.category}${deal.categories.subcategory ? ` / ${deal.categories.subcategory}` : ""}`
                      : deal.category_code || "—"}
                  </div>
                  {deal.categories?.aliases && deal.categories.aliases.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Aliases: {deal.categories.aliases.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Manual Classification</h4>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <select
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="" className="text-muted-foreground">Select store...</option>
                    {stores.map((s) => (
                      <option key={s.store_code} value={s.store_code}>
                        {s.name_cn || s.name || s.store_code}
                      </option>
                    ))}
                  </select>
                  {stores.length === 0 && (
                    <p className="text-xs text-destructive">No stores loaded.</p>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <select
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="" className="text-muted-foreground">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.category_code} value={c.category_code}>
                        {c.subcategory ? `${c.category} / ${c.subcategory}` : c.category}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-destructive">No categories loaded.</p>
                  )}
                </div>
                <Button
                  onClick={handleClassify}
                  disabled={classifying || (!storeCode && !categoryCode)}
                >
                  {classifying && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {!classifying && <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                variant="secondary"
              >
                {generating && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                {!generating && <FileText className="h-4 w-4 mr-2" />}
                Generate Draft
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Images summary on the side */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="No images"
                description="No images found for this deal."
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-md border bg-muted overflow-hidden group cursor-pointer"
                    onClick={() => window.open(img.r2_original_url || "", "_blank")}
                  >
                    {img.r2_thumbnail_url ? (
                      <img
                        src={img.r2_thumbnail_url}
                        alt={img.role || "Deal image"}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    <Badge
                      className="absolute bottom-1 left-1 text-[10px] px-1 py-0"
                      variant={img.role === "source" ? "secondary" : "default"}
                    >
                      {img.role || "source"}
                    </Badge>
                    <div className="absolute top-1 right-1 flex gap-1">
                      <Button
                        size="xs"
                        variant="secondary"
                        className="h-7 px-2 text-[10px]"
                        disabled={regeneratingImageIds.has(img.id) || deletingImageIds.has(img.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateImage(img);
                        }}
                      >
                        {regeneratingImageIds.has(img.id) ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Running
                          </>
                        ) : (
                          "Re-generate"
                        )}
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        className="h-7 px-2 text-[10px]"
                        disabled={deletingImageIds.has(img.id) || regeneratingImageIds.has(img.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {deletingImageIds.has(img.id) ? "Deleting" : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deals Table Fields (All, Click To Edit)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {dealTableFields.map(([key, value]) => (
              <div key={key} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{key}</div>
                  {!IMMUTABLE_FIELDS.has(key) && editingFieldKey !== key && (
                    <Button size="xs" variant="outline" onClick={() => startEditField(key, value)}>
                      Edit
                    </Button>
                  )}
                </div>
                <div className="mt-1 break-all font-mono text-xs text-foreground">
                  {editingFieldKey === key ? (
                    <div className="space-y-2">
                      {typeof value === "object" ? (
                        <Textarea
                          value={editingFieldValue}
                          onChange={(e) => setEditingFieldValue(e.target.value)}
                          rows={5}
                          className="font-mono text-xs"
                        />
                      ) : (
                        <Input
                          value={editingFieldValue}
                          onChange={(e) => setEditingFieldValue(e.target.value)}
                          className="font-mono text-xs"
                        />
                      )}
                      <div className="flex justify-end gap-2">
                        <Button size="xs" variant="ghost" onClick={cancelEditField} disabled={savingField}>
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => confirmEditField(key, value)}
                          disabled={savingField}
                        >
                          {savingField ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="mr-1 h-3 w-3" />
                          )}
                          Confirm
                        </Button>
                      </div>
                    </div>
                  ) : value === null ? (
                    "null"
                  ) : typeof value === "object" ? (
                    JSON.stringify(value)
                  ) : (
                    String(value)
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drafts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Re-generate Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {regeneratingImageIds.size > 0 && (
            <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
              {Array.from(regeneratingImageIds).map((imgId) => {
                const started = regenerateStartedAt[imgId];
                const seconds = started ? Math.max(0, Math.floor((nowTs - started) / 1000)) : 0;
                return (
                  <div key={imgId} className="flex items-center justify-between">
                    <span>图片 {imgId.slice(0, 8)}... 正在处理中</span>
                    <span>{seconds}s</span>
                  </div>
                );
              })}
            </div>
          )}

          {regenerateLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有重生成日志。点击图片上的 Re-generate 后会在这里显示进度和响应详情。
            </p>
          ) : (
            <div className="max-h-56 overflow-auto rounded-md border">
              {regenerateLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
                >
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.ts).toLocaleTimeString()}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {log.imageId.slice(0, 8)}...
                  </span>
                  <span
                    className={
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "success"
                        ? "text-green-400"
                        : "text-foreground"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Drafts ({drafts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No drafts yet"
              description="Generate a draft to start editing and sending."
              action={
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Draft
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => {
                const isExpanded = expandedDraftId === draft.id;
                const isEditing = editingDraftId === draft.id;
                const selectedCount = draft.selected_image_ids?.length ?? 0;

                return (
                  <div
                    key={draft.id}
                    className="rounded-lg border bg-card overflow-hidden"
                  >
                    {/* Draft Header Row */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => expandDraft(draft)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {draft.title || "Untitled Draft"}
                          </span>
                          <Badge variant={getStatusVariant(draft.status)}>
                            {draft.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            👍 {draft.likes ?? 0}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            👆 {draft.clicks ?? 0}
                          </Badge>
                          {selectedCount > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {selectedCount} img
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {draft.body.slice(0, 120)}
                          {draft.body.length > 120 ? "..." : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {draft.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                changeDraftStatus(draft, "approved");
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                changeDraftStatus(draft, "rejected");
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {draft.status !== "published" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendDraft(draft);
                            }}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isEditing) {
                              cancelEditDraft();
                            } else if (isExpanded) {
                              startEditDraft(draft);
                            } else {
                              expandDraft(draft);
                              startEditDraft(draft);
                            }
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t px-4 py-4 space-y-4">
                        {/* Draft Body */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">Title</label>
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">Body</label>
                              <Textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={8}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => saveDraft(draft.id)}>
                                <Save className="h-3.5 w-3.5 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEditDraft}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium">Content</h5>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => copyDraftBody(draft.body, draft.id)}
                              >
                                {copied === draft.id ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                {copied === draft.id ? "Copied" : "Copy"}
                              </Button>
                            </div>
                            <Textarea value={draft.body} readOnly rows={8} />
                          </div>
                        )}

                        {/* Image Selection */}
                        <div>
                          <h5 className="text-sm font-medium mb-2">
                            Select Images ({selectedCount} selected)
                          </h5>
                          {images.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No images available for this deal.
                            </p>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                              {images.map((img) => {
                                const isSelected = draft.selected_image_ids?.includes(img.id);
                                return (
                                  <div
                                    key={img.id}
                                    className={`relative aspect-square rounded-md border overflow-hidden cursor-pointer transition-all ${
                                      isSelected
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-border opacity-70 hover:opacity-100"
                                    }`}
                                    onClick={() => toggleImageForDraft(draft, img.id)}
                                  >
                                    {img.r2_thumbnail_url ? (
                                      <img
                                        src={img.r2_thumbnail_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-4 w-4" />
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                      </div>
                                    )}
                                    <Badge
                                      className="absolute bottom-0.5 left-0.5 text-[9px] px-1 py-0"
                                      variant={img.role === "source" ? "secondary" : "default"}
                                    >
                                      {img.role || "source"}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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


