import BureauBudgetShell from "@/components/BureauBudgetShell";

export default function BureauLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BureauBudgetShell>{children}</BureauBudgetShell>;
}