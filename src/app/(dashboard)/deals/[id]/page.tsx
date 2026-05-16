"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  ImageIcon,
  Save,
  ArrowLeft,
  AlertTriangle,
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
  updated_at: string;
  stores?: { name: string; name_cn: string; aliases: string[] | null; domains: string[] | null } | null;
  categories?: { category: string; subcategory: string; aliases: string[] | null } | null;
}

interface Draft {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
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
  code: string;
  name: string;
  name_cn: string | null;
}

interface CategoryItem {
  code: string;
  category: string;
  subcategory: string;
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

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [refreshKey, setRefreshKey] = useState(0);
  const [storeCode, setStoreCode] = useState<string>("");
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [classifying, setClassifying] = useState(false);
  const [generating, setGenerating] = useState(false);

  const detailUrl = useMemo(
    () => `/api/admin/deals/${id}?_t=${refreshKey}`,
    [id, refreshKey]
  );

  const {
    data,
    loading,
    error,
  } = useApi<DealDetailResponse>(detailUrl);

  const { data: storesResponse } = useApi<{ data: StoreItem[] }>("/api/admin/stores");
  const { data: categoriesResponse } = useApi<{ data: CategoryItem[] }>(
    "/api/admin/categories"
  );

  const deal = data?.deal;
  const drafts = data?.drafts ?? [];
  const images = data?.images ?? [];

  const stores = storesResponse?.data ?? [];
  const categories = categoriesResponse?.data ?? [];

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

  const title = deal.title_en || deal.title_cn || "Untitled Deal";

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={`ID: ${deal.id}`}>
        <Link
          href="/deals"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Deal Info Card */}
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
                <div className="flex-1">
                  <Select
                    value={storeCode}
                    onValueChange={(v) => setStoreCode(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select store..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name_cn || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select
                    value={categoryCode}
                    onValueChange={(v) => setCategoryCode(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.subcategory
                            ? `${c.category} / ${c.subcategory}`
                            : c.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {/* Side column */}
        <div className="space-y-6">
          {/* Images */}
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
                      {img.selected_for_draft && (
                        <Badge
                          className="absolute top-1 right-1 text-[10px] px-1 py-0"
                          variant="default"
                        >
                          Selected
                        </Badge>
                      )}
                      <Badge
                        className="absolute bottom-1 left-1 text-[10px] px-1 py-0"
                        variant={img.role === "source" ? "secondary" : "default"}
                      >
                        {img.role || "source"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drafts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Related Drafts ({drafts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No drafts"
              description="No drafts have been generated for this deal yet."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate font-medium">
                          {draft.title || "Untitled Draft"}
                        </div>
                        {draft.body && (
                          <div className="truncate text-xs text-muted-foreground mt-1">
                            {draft.body.slice(0, 120)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{draft.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(draft.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
