import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const routeLabels: Record<string, string> = {
  "/": "Status",
  "/status": "Status",
  "/pipeline": "Pipeline",
  "/clusters": "Clusters",
  "/deals": "Deals",
  "/drafts": "Drafts",
  "/stores": "Stores",
  "/categories": "Categories",
  "/prompts": "Prompts",
  "/settings": "Settings",
  "/images": "Images",
  "/webhooks": "Webhooks",
  "/audit-logs": "Audit Logs",
  "/logs": "Logs",
};

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <Link href="/" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = routeLabels[href] || segment;
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
