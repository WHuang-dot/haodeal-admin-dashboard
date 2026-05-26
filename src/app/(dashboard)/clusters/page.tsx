"use client";

import { useState, useMemo, useEffect } from "react";
import { useApi } from "@/hooks/use-api";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { getDealDisplayTitle } from "@/lib/deal-title";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface Cluster {
  id: string;
  status: string;
  channel_id: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ClusterDetail {
  cluster: Cluster & { error?: string | null };
  messages: Array<{
    id: string;
    content: string;
    sender: string;
    created_at: string;
  }>;
  deals: Array<{
    id: string;
    title_en: string | null;
    title_cn: string | null;
    platform: string;
    brand: string | null;
    created_at: string;
  }>;
}

interface ClustersResponse {
  data: Cluster[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "extracted", label: "Extracted" },
  { value: "skipped", label: "Skipped" },
  { value: "failed", label: "Failed" },
];

function getStatusVariant(status: string): string {
  switch (status) {
    case "open":
      return "default";
    case "closed":
      return "secondary";
    case "extracted":
      return "default";
    case "skipped":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function formatTimeRange(createdAt: string, updatedAt: string) {
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  const sameDay =
    created.getFullYear() === updated.getFullYear() &&
    created.getMonth() === updated.getMonth() &&
    created.getDate() === updated.getDate();

  if (sameDay) {
    return `${created.toLocaleDateString()} ${created.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${updated.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return `${created.toLocaleDateString()} - ${updated.toLocaleDateString()}`;
}

function canRequeueForExtract(status: string): boolean {
  return status !== "open";
}

function requeueButtonLabel(status: string): string {
  if (status === "closed") return "Queue Extract";
  if (status === "failed") return "Retry Extract";
  return "Re-queue Extract";
}

export default function ClustersPage() {
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelSearch, setChannelSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const { confirm, open, options, close } = useConfirmDialog();

  const limit = 20;

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (channelSearch.trim()) {
      params.set("channel_id", channelSearch.trim());
    }
    params.set("_t", String(refreshKey));
    return `/api/admin/clusters?${params.toString()}`;
  }, [offset, statusFilter, channelSearch, refreshKey]);

  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useApi<ClustersResponse>(listUrl);

  const clusters = listData?.data ?? [];
  const total = listData?.total ?? 0;

  const [detailData, setDetailData] = useState<ClusterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedClusterId) return;
    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/admin/clusters/${selectedClusterId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setDetailData(json.data);
        } else {
          setDetailError(json.error || "Failed to load details");
        }
        setDetailLoading(false);
      })
      .catch(() => {
        setDetailError("Failed to load details");
        setDetailLoading(false);
      });
  }, [selectedClusterId, detailRefreshKey]);

  const handleRequeue = async (cluster: Cluster) => {
    confirm({
      title: requeueButtonLabel(cluster.status),
      description: `Reset cluster #${cluster.id.slice(0, 8)} to closed? The extraction service will pick it up on the next run.${cluster.status === "failed" ? " Any previous error will be cleared." : ""}`,
      confirmText: requeueButtonLabel(cluster.status),
      onConfirm: async () => {
        const res = await fetch(`/api/admin/clusters/${cluster.id}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(json.message || "Cluster re-queued for extraction");
          setRefreshKey((k) => k + 1);
          if (selectedClusterId === cluster.id) {
            setDetailRefreshKey((k) => k + 1);
          }
        } else {
          toast.error(json.error || "Failed to re-queue cluster");
        }
      },
    });
  };

  const handleSkip = async (cluster: Cluster) => {
    confirm({
      title: "Skip Cluster",
      description: `Are you sure you want to skip cluster #${cluster.id.slice(0, 8)}?`,
      confirmText: "Skip",
      variant: "destructive",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/clusters/${cluster.id}/skip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(json.message || "Cluster skipped");
          setRefreshKey((k) => k + 1);
          if (selectedClusterId === cluster.id) {
            setDetailRefreshKey((k) => k + 1);
          }
        } else {
          toast.error(json.error || "Failed to skip cluster");
        }
      },
    });
  };

  const openDetail = (id: string) => {
    setSelectedClusterId(id);
    setDetailOpen(true);
  };

  const handlePrev = () => setOffset((o) => Math.max(0, o - limit));
  const handleNext = () =>
    setOffset((o) => (o + limit < total ? o + limit : o));

  if (listError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Clusters" description="Manage deal clusters" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load clusters"
          description={listError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clusters"
        description="Re-queue clusters for extraction by resetting status to closed."
      >
        <div className="text-sm text-muted-foreground">
          {total} total
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by channel ID..."
            value={channelSearch}
            onChange={(e) => {
              setChannelSearch(e.target.value);
              setOffset(0);
            }}
            className="max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v ?? "all");
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
              <TableHead>Status</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Time Range</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : clusters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <EmptyState
                    icon={MessageSquare}
                    title="No clusters found"
                    description="Try adjusting your filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              clusters.map((cluster) => (
                <TableRow
                  key={cluster.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(cluster.id)}
                >
                  <TableCell>
                    <Badge variant={getStatusVariant(cluster.status) as any}>
                      {cluster.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {cluster.channel_id}
                  </TableCell>
                  <TableCell>{cluster.message_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimeRange(cluster.created_at, cluster.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canRequeueForExtract(cluster.status)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequeue(cluster);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {requeueButtonLabel(cluster.status)}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSkip(cluster);
                        }}
                      >
                        <SkipForward className="h-3.5 w-3.5 mr-1" />
                        Skip
                      </Button>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cluster Details</DialogTitle>
            <DialogDescription>
              {selectedClusterId && `ID: ${selectedClusterId}`}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : detailError ? (
            <EmptyState
              icon={AlertCircle}
              title="Failed to load details"
              description={detailError}
            />
          ) : detailData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        getStatusVariant(detailData.cluster.status) as any
                      }
                    >
                      {detailData.cluster.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Channel</span>
                  <div className="mt-1 font-medium">
                    {detailData.cluster.channel_id}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Messages</span>
                  <div className="mt-1 font-medium">
                    {detailData.cluster.message_count}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Deals</span>
                  <div className="mt-1 font-medium">
                    {detailData.deals.length}
                  </div>
                </div>
              </div>

              {detailData.cluster.error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <div className="font-medium text-destructive mb-1">
                    Last extraction error
                  </div>
                  <p className="text-destructive/90 whitespace-pre-wrap">
                    {detailData.cluster.error}
                  </p>
                </div>
              )}

              {canRequeueForExtract(detailData.cluster.status) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRequeue(detailData.cluster)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {requeueButtonLabel(detailData.cluster.status)}
                  </Button>
                </div>
              )}

              {detailData.messages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Messages</h4>
                  <ScrollArea className="h-48 rounded-md border p-2">
                    <div className="space-y-2">
                      {detailData.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="text-sm p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{msg.sender}</span>
                            <span>
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="line-clamp-3">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {detailData.deals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Related Deals</h4>
                  <div className="space-y-1">
                    {detailData.deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="text-sm p-2 rounded bg-muted/50 flex items-center justify-between"
                      >
                        <span>
                          {getDealDisplayTitle(deal, "Untitled")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {deal.platform}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
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
