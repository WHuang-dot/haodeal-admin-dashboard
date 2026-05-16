"use client";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Brain,
  Send,
  HeartPulse,
  Shield,
} from "lucide-react";

const tabs = [
  { value: "pipeline", label: "Pipeline", icon: Activity },
  { value: "ai-errors", label: "AI Errors", icon: Brain },
  { value: "send-errors", label: "Send Errors", icon: Send },
  { value: "health", label: "Health", icon: HeartPulse },
];

export default function LogsPage() {
  const hasAxiom = Boolean(process.env.NEXT_PUBLIC_AXIOM_API_TOKEN);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description="Centralized logging for pipeline, AI, and system health."
      />

      {hasAxiom && (
        <Badge variant="outline" className="w-fit">
          Axiom integration available
        </Badge>
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pipeline" className="w-full">
            <TabsList className="mb-4">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <EmptyState
                  icon={Shield}
                  title={tab.label}
                  description="Log integration coming soon"
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
