"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Bot,
  ImageIcon,
  MessageSquare,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

interface StatusData {
  supabase: { connected: boolean; url?: string };
  ai: {
    provider: string;
    openai_key: string;
    extract_model?: string;
    generate_model?: string;
  };
  r2: { configured: boolean; bucket?: string; public_url?: string };
  pending: { closed_clusters: number; pending_drafts: number };
  prompts: { active: number };
  webhooks: { count: number };
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? "default" : "destructive"} className="mb-2">
      {connected ? (
        <CheckCircle2 className="mr-1 h-3 w-3" />
      ) : (
        <AlertCircle className="mr-1 h-3 w-3" />
      )}
      {connected ? "Connected" : "Error"}
    </Badge>
  );
}

export default function StatusPage() {
  const { data: status, loading, error } = useApi<StatusData>("/api/admin/status");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <EmptyState
          icon={AlertCircle}
          title="Unable to load status"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status"
        description="Overview of dashboard health and configuration"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Services */}
        <div className="col-span-full grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Supabase Database</h3>
            </div>
            {loading ? (
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <StatusBadge connected={status?.supabase.connected ?? false} />
                <p className="text-xs text-muted-foreground mt-1">
                  {status?.supabase.url}
                </p>
              </>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">AI Provider</h3>
            </div>
            {loading ? (
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <StatusBadge
                  connected={status?.ai.openai_key === "configured"}
                />
                <div className="space-y-1 text-xs text-muted-foreground mt-1">
                  <div>Provider: {status?.ai.provider}</div>
                  <div>Extract: {status?.ai.extract_model}</div>
                  <div>Generate: {status?.ai.generate_model}</div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Cloudflare R2</h3>
            </div>
            {loading ? (
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <StatusBadge connected={status?.r2.configured ?? false} />
                <div className="space-y-1 text-xs text-muted-foreground mt-1">
                  <div>Bucket: {status?.r2.bucket}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <StatCard
          title="Pending Clusters"
          value={status?.pending.closed_clusters ?? 0}
          description="Closed clusters waiting for extraction"
          icon={MessageSquare}
          loading={loading}
        />

        <StatCard
          title="Pending Drafts"
          value={status?.pending.pending_drafts ?? 0}
          description="Drafts awaiting review or send"
          icon={FileText}
          loading={loading}
        />

        <StatCard
          title="Active Prompts"
          value={status?.prompts.active ?? 0}
          description="Currently active prompt versions"
          icon={Settings}
          loading={loading}
        />
      </div>
    </div>
  );
}
