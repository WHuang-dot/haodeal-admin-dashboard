"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { getDealDisplayTitle } from "@/lib/deal-title";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  ImageIcon,
  Loader2,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";

interface Deal {
  id: string;
  title_en: string | null;
  title_cn: string | null;
  platform: string;
  brand: string | null;
  price: string | number | null;
  store_code: string | null;
  category_code: string | null;
  status: string;
  store_match_status: string | null;
  category_match_status: string | null;
  created_at: string;
  likes?: number;
  clicks?: number;
  cover_image_url?: string | null;
  cover_thumbnail_url?: string | null;
  stores?: { name: string; name_cn: string } | null;
  categories?: { category: string; subcategory: string } | null;
}

interface DealsResponse {
  data: Deal[];
  total: number;
  limit: number;
  offset: number;
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

function getStoreLabel(deal: Deal) {
  if (deal.stores) {
    return deal.stores.name_cn || deal.stores.name || deal.store_code || "-";
  }
  return deal.store_code || "-";
}

function getCategoryLabel(deal: Deal) {
  if (deal.categories) {
    const parts = [deal.categories.category, deal.categories.subcategory].filter(Boolean);
    return parts.join(" / ") || deal.category_code || "-";
  }
  return deal.category_code || "-";
}

function getPriceLabel(price: string | number | null) {
  if (price === null || price === undefined || price === "") return "-";
  return String(price);
}

export default function DealsPage() {
  const router = useRouter();
  const { confirm, open, options, close } = useConfirmDialog();
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [loadedDeals, setLoadedDeals] = useState<Deal[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const limit = 20;

  const listQueryKey = useMemo(
    () => JSON.stringify({ tab, statusFilter, storeFilter, categoryFilter, search, refreshKey }),
    [tab, statusFilter, storeFilter, categoryFilter, search, refreshKey]
  );

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (tab === "unresolved") {
      params.set("unresolved", "true");
    }
    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (storeFilter && storeFilter !== "all") {
      params.set("store_code", storeFilter);
    }
    if (categoryFilter && categoryFilter !== "all") {
      params.set("category_code", categoryFilter);
    }
    if (search.trim()) {
      params.set("search", search.trim());
    }
    params.set("_t", String(refreshKey));
    return `/api/admin/deals?${params.toString()}`;
  }, [offset, tab, statusFilter, storeFilter, categoryFilter, search, refreshKey]);

  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useApi<DealsResponse>(listUrl);

  const { data: storesResponse } = useApi<{ data: StoreItem[] }>("/api/admin/stores");
  const { data: categoriesResponse } = useApi<{ data: CategoryItem[] }>(
    "/api/admin/categories"
  );

  const pageDeals = useMemo(() => listData?.data ?? [], [listData]);
  const total = listData?.total ?? 0;
  const stores = storesResponse?.data ?? [];
  const categories = categoriesResponse?.data ?? [];
  const hasMore = loadedDeals.length < total;
  const isInitialLoading = listLoading && offset === 0 && loadedDeals.length === 0;
  const isLoadingMore = listLoading && offset > 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
    setLoadedDeals([]);
  }, [listQueryKey]);

  useEffect(() => {
    if (!listData) return;
    if (offset === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadedDeals(pageDeals);
      return;
    }
    setLoadedDeals((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      for (const row of pageDeals) map.set(row.id, row);
      return Array.from(map.values());
    });
  }, [listData, offset, pageDeals]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (listLoading || !hasMore) return;
        setOffset((o) => o + limit);
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, limit, listLoading]);

  const handleTabChange = (value: string) => {
    setTab(value);
    setOffset(0);
  };

  const handleDeleteDeal = (deal: Deal) => {
    confirm({
      title: "Delete Deal",
      description: `Delete "${getDealDisplayTitle(deal)}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/deals/${deal.id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (!json.ok) {
            throw new Error(json.error || "Failed to delete deal");
          }
          toast.success("Deal deleted");
          setRefreshKey((k) => k + 1);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete deal");
          console.error("Delete deal failed:", err);
        }
      },
    });
  };

  if (listError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Deals" description="Manage extracted deals" />
        <EmptyState icon={AlertCircle} title="Failed to load deals" description={listError} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Deals" description="Manage extracted deals">
        <div className="text-sm text-muted-foreground">{total} total</div>
      </PageHeader>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title or brand..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="max-w-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v ?? "all");
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={storeFilter}
            onValueChange={(v) => {
              setStoreFilter(v ?? "all");
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name_cn || s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v ?? "all");
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.subcategory ? `${c.category} / ${c.subcategory}` : c.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isInitialLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[2/1] w-full" />
              <CardContent className="space-y-1.5 p-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loadedDeals.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No deals found"
          description="Try adjusting your filters or search."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {loadedDeals.map((deal) => (
            <Card
              key={deal.id}
              className="overflow-hidden transition-colors hover:border-primary/40"
            >
              <div
                className="relative aspect-[2/1] cursor-zoom-in bg-muted"
                onClick={() => {
                  const preview = deal.cover_image_url || deal.cover_thumbnail_url;
                  if (preview) {
                    setPreviewUrl(preview);
                    setPreviewFullscreen(false);
                  }
                }}
              >
                {deal.cover_thumbnail_url || deal.cover_image_url ? (
                  <img
                    src={deal.cover_thumbnail_url || deal.cover_image_url || ""}
                    alt={getDealDisplayTitle(deal)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/deals/${deal.id}`)}
                className="block w-full text-left"
              >
                <CardContent className="space-y-1 p-2">
                  <div
                    className="line-clamp-2 min-h-6 text-[11px] font-semibold leading-3.5"
                    title={getDealDisplayTitle(deal)}
                  >
                    {getDealDisplayTitle(deal)}
                  </div>

                  <div className="space-y-0 text-[9px] leading-3.5 text-muted-foreground">
                    <p className="truncate">Platform: {deal.platform || "-"}</p>
                    <p className="truncate">Brand: {deal.brand || "-"}</p>
                    <p>Price: {getPriceLabel(deal.price)}</p>
                    <p className="truncate">Store: {getStoreLabel(deal)}</p>
                    <p className="truncate">Category: {getCategoryLabel(deal)}</p>
                  </div>

                  <div className="flex flex-wrap gap-0.5">
                    {deal.store_match_status === "unmatched" && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Store Unmatched
                      </Badge>
                    )}
                    {deal.category_match_status === "unmatched" && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Category Unmatched
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[9px]">
                    <Badge variant="outline">{deal.status || "-"}</Badge>
                    <span className="text-muted-foreground">
                      Likes {deal.likes ?? 0} | Clicks {deal.clicks ?? 0}
                    </span>
                  </div>
                </CardContent>
              </button>

              <div className="flex items-center justify-end gap-1 border-t px-2 py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDeal(deal);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <Link
                  href={`/deals/${deal.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Showing {loadedDeals.length} of {total}
        </div>
        <div ref={loadMoreRef} className="flex min-h-10 items-center justify-center">
          {isLoadingMore ? (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading more deals...
            </div>
          ) : hasMore ? (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronLeft className="h-3.5 w-3.5 rotate-[-90deg]" />
              Scroll down to load more
            </div>
          ) : loadedDeals.length > 0 ? (
            <div className="text-xs text-muted-foreground">All deals loaded</div>
          ) : null}
        </div>
      </div>

      {open && options && (
        <ConfirmDialog
          open={open}
          onOpenChange={close}
          title={options.title}
          description={options.description}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={options.onConfirm}
        />
      )}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPreviewUrl(null);
            setPreviewFullscreen(false);
          }
        }}
      >
        <DialogContent className="inset-0 top-0 left-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-4 sm:max-w-none sm:p-6">
          <DialogHeader>
            <DialogTitle>Deal Image Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <button
              type="button"
              onClick={() => setPreviewFullscreen((v) => !v)}
              className="flex h-[calc(100vh-6rem)] w-full items-center justify-center overflow-auto rounded-lg bg-black/20"
              title={previewFullscreen ? "Click to restore original size view" : "Click to fullscreen fit"}
            >
              <img
                src={previewUrl}
                alt="Deal preview"
                className={
                  previewFullscreen
                    ? "h-full w-full object-contain"
                    : "h-auto w-auto max-h-none max-w-none object-contain"
                }
              />
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
