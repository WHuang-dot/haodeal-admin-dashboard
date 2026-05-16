"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Webhook as WebhookIcon } from "lucide-react";

interface Webhook {
  id: string;
  name: string;
  note?: string;
  url: string;
  created_at: string;
}

function maskUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//****${u.pathname}`;
  } catch {
    return "****";
  }
}

export default function WebhooksPage() {
  const { data: webhooksResponse, loading, error } =
    useApi<{ data: Webhook[] }>("/api/admin/webhooks");

  const webhooks = webhooksResponse?.data ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Webhooks" description="Registered webhooks" />
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Note</TableHead>
                <TableHead>Webhook URL</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Webhooks" description="Registered webhooks" />
        <EmptyState
          icon={WebhookIcon}
          title="Error loading webhooks"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Webhooks" description="Registered webhooks" />

      {webhooks && webhooks.length === 0 ? (
        <EmptyState
          icon={WebhookIcon}
          title="No webhooks found"
          description="No webhooks are registered yet"
        />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Note</TableHead>
                <TableHead>Webhook URL</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks?.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <div className="font-medium">{webhook.name}</div>
                    {webhook.note && (
                      <div className="text-xs text-muted-foreground">
                        {webhook.note}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {maskUrl(webhook.url)}
                    </code>
                  </TableCell>
                  <TableCell>
                    {new Date(webhook.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
