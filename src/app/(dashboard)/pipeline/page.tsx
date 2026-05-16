"use client";

import { useState } from "react";
import { useMutation } from "@/hooks/use-mutation";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Zap,
  Archive,
  FileDown,
  FileText,
  Send,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface PipelineResult {
  scanned: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const STEPS = [
  {
    key: "close_stale",
    label: "Close Stale Clusters",
    description:
      "Close all open clusters that haven't received messages in the last 30 minutes.",
    icon: Archive,
    variant: "default" as const,
  },
  {
    key: "extract_batch",
    label: "Extract Batch",
    description:
      "Run extraction on all closed clusters to identify potential deals.",
    icon: FileDown,
    variant: "default" as const,
  },
  {
    key: "generate_batch",
    label: "Generate Batch",
    description:
      "Generate drafts for all extracted deals that don't have drafts yet.",
    icon: FileText,
    variant: "default" as const,
  },
  {
    key: "send_pending",
    label: "Send Pending Drafts",
    description: "Send all drafts that are currently pending approval.",
    icon: Send,
    variant: "default" as const,
  },
  {
    key: "full",
    label: "Run Full Pipeline",
    description:
      "Run the complete pipeline: close stale clusters, extract deals, generate drafts, and send pending drafts.",
    icon: Play,
    variant: "destructive" as const,
  },
];

export default function PipelinePage() {
  const { confirm, open, options, close } = useConfirmDialog();
  const [result, setResult] = useState<PipelineResult | null>(null);

  const { mutate, loading } = useMutation<{ step: string }, PipelineResult>(
    "/api/admin/pipeline",
    {
      onSuccess: (data) => {
        setResult(data);
        toast.success("Pipeline step completed successfully");
      },
      onError: (err) => {
        toast.error(err);
      },
    }
  );

  const handleStep = (step: (typeof STEPS)[number]) => {
    confirm({
      title: step.label,
      description: step.description,
      confirmText: step.key === "full" ? "Run Full Pipeline" : "Run",
      cancelText: "Cancel",
      variant: step.variant,
      onConfirm: async () => {
        await mutate({ step: step.key });
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Run automated pipeline steps to process clusters, extract deals, generate drafts, and send messages."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.key}
              className="flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">
                    {step.label}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
                <Button
                  className="w-full"
                  variant={step.variant}
                  disabled={loading}
                  onClick={() => handleStep(step)}
                >
                  {loading && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {step.key === "full" ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Full Pipeline
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Run
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {result && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Last Run Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{result.scanned}</div>
                  <div className="text-xs text-muted-foreground">Scanned</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.processed}
                  </div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {result.skipped}
                  </div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {result.failed}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <h4 className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors ({result.errors.length})
                  </h4>
                  <ul className="space-y-1 text-sm text-destructive/90">
                    {result.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

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
