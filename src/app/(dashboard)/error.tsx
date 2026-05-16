"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-medium">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message || "An unexpected error occurred"}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
