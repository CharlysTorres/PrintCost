import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Box, Droplets } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FdmCalculator } from "@/components/calculadora/FdmCalculator";
import { ResinCalculator } from "@/components/calculadora/ResinCalculator";

export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de Precificação — PrintCost" },
      {
        name: "description",
        content:
          "Calcule o custo real e o preço de venda de impressões em filamento e resina.",
      },
      {
        property: "og:title",
        content: "Calculadora de Precificação — PrintCost",
      },
      {
        property: "og:description",
        content:
          "Calcule o custo real e o preço de venda de impressões em filamento e resina.",
      },
    ],
  }),
  component: CalculatorPage,
});

type Tech = "FDM" | "Resina";

function CalculatorPage() {
  const [tech, setTech] = useState<Tech>("FDM");

  return (
    <div>
      <PageHeader
        title="Calculadora de Precificação"
        description="Filamento ou resina: todos os valores são recalculados em tempo real."
      />
      <Tabs
        value={tech}
        onValueChange={(v) => setTech(v as Tech)}
        className="mb-6"
      >
        <TabsList className="h-auto">
          <TabsTrigger value="FDM">
            <Box className="mr-1.5 h-3.5 w-3.5" />
            Filamento (FDM)
          </TabsTrigger>
          <TabsTrigger value="Resina">
            <Droplets className="mr-1.5 h-3.5 w-3.5" />
            Resina (SLA/DLP)
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div hidden={tech !== "FDM"}>
        <FdmCalculator />
      </div>
      <div hidden={tech !== "Resina"}>
        <ResinCalculator />
      </div>
    </div>
  );
}
