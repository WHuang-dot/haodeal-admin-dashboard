"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import type { AuditLogEntry, ListResult } from "@/types";

const LIMIT = 50;

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const offset = (page - 1) * LIMIT;

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(LIMIT));
    params.set("offset", String(offset));
    if (actionFilter) params.set("action", actionFilter);
    if (tableFilter) params.set("table", tableFilter);
    return `/api/admin/audit-logs?${params.toString()}`;
  }, [offset, actionFilter, tableFilter]);

  const { data, loading } = useApi<ListResult<AuditLogEntry>>(url);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const logs = data?.data ?? [];

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const toggleExpand = (id: string) => {
    setExpandedRow((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all administrative changes across the platform."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Log Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="sm:w-48"
            />
            <Input
              placeholder="Filter by table..."
              value={tableFilter}
              onChange={(e) => {
                setTableFilter(e.target.value);
                setPage(1);
              }}
              className="sm:w-48"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead className="w-[120px]">Before / After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_email ?? "System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.target_table}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.target_id}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => toggleExpand(log.id)}
                            >
                              {expandedRow === log.id ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> View
                                </>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="text-sm font-medium">
                                Change Details — {log.action} on {log.target_table}
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="mt-2 max-h-[60vh]">
                              <div className="space-y-4">
                                {log.before && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                      Before
                                    </h4>
                                    <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto">
                                      {JSON.stringify(log.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.after && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                      After
                                    </h4>
                                    <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto">
                                      {JSON.stringify(log.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {!log.before && !log.after && (
                                  <p className="text-sm text-muted-foreground">
                                    No data available.
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + LIMIT, data?.total ?? 0)} of{" "}
                {data?.total ?? 0} entries
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page - 1);
                      }}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={pageNum === page}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page + 1);
                      }}
                      className={
                        page >= totalPages ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
