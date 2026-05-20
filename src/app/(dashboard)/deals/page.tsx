"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { getDealDisplayTitle } from "@/lib/deal-title";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  Eye,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Sparkles,
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

type SortOption = "newest" | "likes" | "clicks" | "price";

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
  if (typeof price === "number") return `$${price}`;
  const trimmed = String(price).trim();
  return trimmed.startsWith("$") ? trimmed : trimmed;
}

function parsePriceNumber(price: string | number | null) {
  if (price === null || price === undefined || price === "") return -1;
  if (typeof price === "number") return price;
  const normalized = String(price).replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : -1;
}

function sortDeals(deals: Deal[], sortBy: SortOption) {
  const copy = [...deals];
  if (sortBy === "likes") {
    return copy.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  }
  if (sortBy === "clicks") {
    return copy.sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0));
  }
  if (sortBy === "price") {
    return copy.sort((a, b) => parsePriceNumber(b.price) - parsePriceNumber(a.price));
  }
  return copy.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function DealCardSkeleton() {
  return (
    <Card className="market-card overflow-hidden border border-white/10 bg-white/[0.02]">
      <Skeleton className="aspect-[1/1] w-full rounded-none bg-white/[0.06]" />
      <CardContent className="space-y-2 p-3">
        <Skeleton className="h-4 w-5/6 bg-white/[0.08]" />
        <Skeleton className="h-5 w-2/5 bg-white/[0.12]" />
        <Skeleton className="h-3 w-full bg-white/[0.08]" />
        <Skeleton className="h-3 w-4/5 bg-white/[0.08]" />
      </CardContent>
    </Card>
  );
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
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [loadedDeals, setLoadedDeals] = useState<Deal[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [imageSrcOverride, setImageSrcOverride] = useState<Record<string, string>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const limit = 20;

  const listQueryKey = useMemo(
    () =>
      JSON.stringify({
        tab,
        statusFilter,
        storeFilter,
        categoryFilter,
        search,
        refreshKey,
      }),
    [tab, statusFilter, storeFilter, categoryFilter, search, refreshKey]
  );

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (tab === "unresolved") params.set("unresolved", "true");
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (storeFilter !== "all") params.set("store_code", storeFilter);
    if (categoryFilter !== "all") params.set("category_code", categoryFilter);
    if (search.trim()) params.set("search", search.trim());
    params.set("_t", String(refreshKey));
    return `/api/admin/deals?${params.toString()}`;
  }, [offset, tab, statusFilter, storeFilter, categoryFilter, search, refreshKey]);

  const { data: listData, loading: listLoading, error: listError } =
    useApi<DealsResponse>(listUrl);

  const { data: storesResponse } = useApi<{ data: StoreItem[] }>("/api/admin/stores");
  const { data: categoriesResponse } = useApi<{ data: CategoryItem[] }>(
    "/api/admin/categories"
  );

  const pageDeals = useMemo(() => listData?.data ?? [], [listData]);
  const stores = storesResponse?.data ?? [];
  const categories = categoriesResponse?.data ?? [];
  const total = listData?.total ?? 0;
  const hasMore = loadedDeals.length < total;
  const isInitialLoading = listLoading && offset === 0 && loadedDeals.length === 0;
  const isLoadingMore = listLoading && offset > 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
    setFailedImageIds(new Set());
    setImageSrcOverride({});
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
        setOffset((prev) => prev + limit);
      },
      { rootMargin: "360px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, limit, listLoading]);

  const displayDeals = useMemo(() => sortDeals(loadedDeals, sortBy), [loadedDeals, sortBy]);

  const getCardImageSrc = (deal: Deal) => {
    if (imageSrcOverride[deal.id]) return imageSrcOverride[deal.id];
    return deal.cover_thumbnail_url || deal.cover_image_url || null;
  };

  const handleDeleteDeal = (deal: Deal) => {
    confirm({
      title: "Delete Deal",
      description: `Delete "${getDealDisplayTitle(deal)}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/deals/${deal.id}`, { method: "DELETE" });
          const json = await res.json();
          if (!json.ok) throw new Error(json.error || "Failed to delete deal");
          toast.success("Deal deleted");
          setRefreshKey((k) => k + 1);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete deal");
        }
      },
    });
  };

  return (
    <div className="market-shell relative space-y-6">
      <div className="market-bg pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto w-full max-w-[1560px] space-y-6 px-2 md:px-4">
        <PageHeader title="Deals" description="Discover premium opportunities with elegant signal-first ranking">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-sky-300/80" />
            {total} total
          </div>
        </PageHeader>

        <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="market-panel rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md xl:sticky xl:top-4 xl:h-fit">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
                  Search
                </p>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search keyword or deal ID..."
                    className="h-10 rounded-xl border-white/12 bg-black/25 pl-10 text-sm shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
                  Scope
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={tab === "all" ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 rounded-full border-white/12 bg-black/20 text-xs"
                    onClick={() => setTab("all")}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant={tab === "unresolved" ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 rounded-full border-white/12 bg-black/20 text-xs"
                    onClick={() => setTab("unresolved")}
                  >
                    Unresolved
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
                  Filters
                </p>
                <div className="space-y-2">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-white/12 bg-black/20 text-xs">
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

                  <Select value={storeFilter} onValueChange={(v) => setStoreFilter(v ?? "all")}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-white/12 bg-black/20 text-xs">
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

                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-white/12 bg-black/20 text-xs">
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
            </div>
          </aside>

          <div className="space-y-4">
            <section className="market-panel rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-white/55">Product stream</div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-9 w-[170px] rounded-xl border-white/12 bg-black/25 text-xs tracking-wide uppercase">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="likes">Most Liked</SelectItem>
                    <SelectItem value="clicks">Most Clicked</SelectItem>
                    <SelectItem value="price">Highest Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            {isInitialLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: limit }).map((_, idx) => (
              <DealCardSkeleton key={idx} />
            ))}
          </div>
        ) : displayDeals.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No deals found"
            description="Try adjusting search or filters."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {displayDeals.map((deal) => {
              const storeLabel = getStoreLabel(deal);
              const categoryLabel = getCategoryLabel(deal);
              const imageSrc = getCardImageSrc(deal);
              const hasImage = Boolean(imageSrc) && !failedImageIds.has(deal.id);
              return (
                <Card
                  key={deal.id}
                  className="market-card group overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_45px_rgba(30,136,229,0.18)]"
                >
                  <div
                    className="relative aspect-[1/1] cursor-zoom-in overflow-hidden bg-gradient-to-br from-slate-800/80 via-slate-700/50 to-slate-900/85"
                    onClick={() => {
                      const preview = imageSrc || deal.cover_image_url || deal.cover_thumbnail_url;
                      if (preview) {
                        setPreviewUrl(preview);
                        setPreviewFullscreen(false);
                      }
                    }}
                  >
                    {hasImage ? (
                      <img
                        src={imageSrc || ""}
                        alt={getDealDisplayTitle(deal)}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                          const thumbnail = deal.cover_thumbnail_url;
                          const original = deal.cover_image_url;
                          const current = imageSrc;
                          if (
                            thumbnail &&
                            original &&
                            thumbnail !== original &&
                            current === thumbnail
                          ) {
                            setImageSrcOverride((prev) => ({
                              ...prev,
                              [deal.id]: original,
                            }));
                            return;
                          }

                          setFailedImageIds((prev) => {
                            const next = new Set(prev);
                            next.add(deal.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="rounded-full border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                          <ImageIcon className="h-5 w-5 text-white/60" />
                        </div>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                    <div className="absolute top-2 right-2 opacity-0 transition duration-200 group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/80 backdrop-blur-md hover:bg-black/65"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/deals/${deal.id}`)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => handleDeleteDeal(deal)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-white/20 bg-black/30 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm"
                      >
                        {deal.status || "unknown"}
                      </Badge>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/deals/${deal.id}`)}
                    className="block w-full text-left"
                  >
                    <CardContent className="space-y-2.5 p-3.5">
                      <div className="space-y-0.5">
                        <h3
                          className="line-clamp-2 text-[15px] leading-5 font-semibold tracking-tight text-foreground"
                          title={getDealDisplayTitle(deal)}
                        >
                          {getDealDisplayTitle(deal)}
                        </h3>
                        <p className="text-lg leading-none font-bold text-white/95">
                          {getPriceLabel(deal.price)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[12px]">
                        <div className="truncate text-white/45">Platform</div>
                        <div className="truncate text-white/80">{deal.platform || "-"}</div>
                        <div className="truncate text-white/45">Brand</div>
                        <div className="truncate text-white/80">{deal.brand || "-"}</div>
                        <div className="truncate text-white/45">Store</div>
                        <div className="truncate text-white/80">{storeLabel}</div>
                        <div className="truncate text-white/45">Category</div>
                        <div className="truncate text-white/80">{categoryLabel}</div>
                      </div>

                      <div className="flex flex-wrap gap-0.5">
                        {deal.store_match_status === "unmatched" && (
                          <span className="inline-flex items-center rounded-full border border-white/16 bg-white/8 px-2 py-0.5 text-[11px] text-white/70">
                            Store pending
                          </span>
                        )}
                        {deal.category_match_status === "unmatched" && (
                          <span className="inline-flex items-center rounded-full border border-white/16 bg-white/8 px-2 py-0.5 text-[11px] text-white/70">
                            Category pending
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[12px] text-white/70">
                        <span>Likes {(deal.likes ?? 0).toLocaleString()}</span>
                        <span>Clicks {(deal.clicks ?? 0).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </button>
                </Card>
              );
            })}
          </div>
        )}

        <div className="market-panel rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 text-xs text-white/55">
            Showing {displayDeals.length} of {total}
          </div>
          <div ref={loadMoreRef} className="flex min-h-10 items-center justify-center">
            {isLoadingMore ? (
              <div className="inline-flex items-center gap-2 text-xs text-white/65">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading more deals...
              </div>
            ) : hasMore ? (
              <div className="inline-flex items-center gap-1 text-xs text-white/50">
                <ChevronDown className="h-3.5 w-3.5" />
                Scroll to load more
              </div>
            ) : displayDeals.length > 0 ? (
              <div className="text-xs text-white/45">All deals loaded</div>
            ) : null}
          </div>
        </div>

        {listError && (
          <Card className="border border-red-400/30 bg-red-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-100">Failed to load deals</CardTitle>
              <CardDescription className="text-red-200/85">{listError}</CardDescription>
            </CardHeader>
          </Card>
        )}
          </div>
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
        <DialogContent className="inset-0 top-0 left-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-[#0a0d11]/92 p-4 sm:max-w-none sm:p-6">
          <DialogHeader>
            <DialogTitle>Deal Image Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <button
              type="button"
              onClick={() => setPreviewFullscreen((v) => !v)}
              className="flex h-[calc(100vh-6rem)] w-full items-center justify-center overflow-auto rounded-xl border border-white/10 bg-black/35"
              title={
                previewFullscreen
                  ? "Click to restore original size view"
                  : "Click to fullscreen fit"
              }
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
