"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FileText, Pencil, Send, CheckCircle, XCircle } from "lucide-react";

interface Draft {
  id: string;
  title: string;
  deal?: { id: string; title: string } | null;
  status: "pending" | "approved" | "rejected" | "published";
  model: string;
  created_at: string;
}

interface DraftsResponse {
  data: Draft[];
  total: number;
  limit: number;
  offset: number;
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
      return "default";
    default:
      return "outline";
  }
}

export default function DraftsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { confirm, open, options, close } = useConfirmDialog();

  const params = new URLSearchParams();
  params.set("page", String(page));
  if (statusFilter) params.set("status", statusFilter);
  params.set("_t", String(refreshKey));
  const url = `/api/admin/drafts?${params.toString()}`;

  const { data, loading, error } = useApi<DraftsResponse>(url);

  const sendMutation = useMutation<{ id: string }, unknown>("/api/admin/drafts/send");
  const approveMutation = useMutation<{ id: string }, unknown>("/api/admin/drafts/approve");
  const rejectMutation = useMutation<{ id: string }, unknown>("/api/admin/drafts/reject");

  const handleSend = (draft: Draft) => {
    confirm({
      title: "Send Draft",
      description: `Are you sure you want to send "${draft.title}"?`,
      confirmText: "Send",
      onConfirm: async () => {
        await sendMutation.mutate({ id: draft.id });
        setRefreshKey((k) => k + 1);
      },
    });
  };

  const handleApprove = (draft: Draft) => {
    confirm({
      title: "Approve Draft",
      description: `Approve "${draft.title}"?`,
      confirmText: "Approve",
      onConfirm: async () => {
        await approveMutation.mutate({ id: draft.id });
        setRefreshKey((k) => k + 1);
      },
    });
  };

  const handleReject = (draft: Draft) => {
    confirm({
      title: "Reject Draft",
      description: `Reject "${draft.title}"?`,
      confirmText: "Reject",
      variant: "destructive",
      onConfirm: async () => {
        await rejectMutation.mutate({ id: draft.id });
        setRefreshKey((k) => k + 1);
      },
    });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Drafts" description="Manage and review deal drafts" />

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v ?? "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No drafts found"
          description={
            statusFilter
              ? "Try changing your filters."
              : "No drafts have been created yet."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell>
                    <Link
                      href={`/drafts/${draft.id}`}
                      className="font-medium hover:underline"
                    >
                      {draft.title}
                    </Link>
                  </TableCell>
                  <TableCell>{draft.deal?.title ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(draft.status)}>
                      {draft.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{draft.model}</TableCell>
                  <TableCell>
                    {new Date(draft.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/drafts/${draft.id}`}
                        className="inline-flex items-center justify-center rounded-lg size-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Pencil className="size-3" />
                      </Link>
                      {draft.status !== "published" && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleSend(draft)}
                          disabled={sendMutation.loading}
                        >
                          <Send className="size-3" />
                        </Button>
                      )}
                      {draft.status === "pending" && (
                        <>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleApprove(draft)}
                            disabled={approveMutation.loading}
                          >
                            <CheckCircle className="size-3" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleReject(draft)}
                            disabled={rejectMutation.loading}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="border-t p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page <= 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

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
