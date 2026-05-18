"use client";

import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
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
    return deal.stores.name_cn || deal.stores.name || deal.store_code || "—";
  }
  return deal.store_code || "—";
}

function getCategoryLabel(deal: Deal) {
  if (deal.categories) {
    const parts = [deal.categories.category, deal.categories.subcategory].filter(Boolean);
    return parts.join(" / ") || deal.category_code || "—";
  }
  return deal.category_code || "—";
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

  const limit = 20;

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

  const deals = listData?.data ?? [];
  const total = listData?.total ?? 0;

  const stores = storesResponse?.data ?? [];
  const categories = categoriesResponse?.data ?? [];

  const handlePrev = () => setOffset((o) => Math.max(0, o - limit));
  const handleNext = () =>
    setOffset((o) => (o + limit < total ? o + limit : o));

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
        <EmptyState
          icon={AlertCircle}
          title="Failed to load deals"
          description={listError}
        />
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
        <div className="flex items-center gap-2 flex-1">
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
                  {c.subcategory
                    ? `${c.category} / ${c.subcategory}`
                    : c.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <EmptyState
                    icon={ShoppingBag}
                    title="No deals found"
                    description="Try adjusting your filters or search."
                  />
                </TableCell>
              </TableRow>
            ) : (
              deals.map((deal) => (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => router.push(`/deals/${deal.id}`)}
                >
                  <TableCell className="max-w-xs">
                    <div
                      className="truncate font-medium"
                      title={getDealDisplayTitle(deal)}
                    >
                      {getDealDisplayTitle(deal)}
                    </div>
                  </TableCell>
                  <TableCell>{deal.platform}</TableCell>
                  <TableCell>{deal.brand || "—"}</TableCell>
                  <TableCell>
                    {deal.price != null ? deal.price : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getStoreLabel(deal)}</span>
                      {deal.store_match_status === "unmatched" && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Unmatched
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getCategoryLabel(deal)}</span>
                      {deal.category_match_status === "unmatched" && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Unmatched
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{deal.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeal(deal);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      <Link
                        href={`/deals/${deal.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={offset === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={offset + limit >= total}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
    </div>
  );
}
