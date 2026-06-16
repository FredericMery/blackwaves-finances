"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type Season = { id: string; code: string; label: string };

type Payment = {
  id: string;
  paid_at: string;
  supplier: string | null;
  note: string | null;
  amount_ht: number;
  amount_tax: number;
  amount_ttc: number;
  invoice_name: string | null;
  invoice_url: string | null;
  created_at: string;
};

type DeletedPayment = {
  id: string;
  original_payment_id: string;
  paid_at: string;
  supplier: string | null;
  note: string | null;
  amount_ht: number;
  amount_tax: number;
  amount_ttc: number;
  invoice_name: string | null;
  invoice_public_url: string | null;
  created_at: string | null;
  deleted_at: string;
  deleted_reason: string | null;
};

type LineDocument = {
  id: string;
  document_kind: "devis" | "facture" | "document";
  title: string | null;
  note: string | null;
  file_name: string | null;
  file_url: string | null;
  created_at: string;
};

type BudgetLine = {
  id: string;
  line_type: "recette" | "depense";
  category: string;
  designation: string;
  note: string | null;
  amount_planned: number;
  amount_committed: number;
  paid_total: number;
  completion_rate: number;
  remaining_amount: number;
  payments: Payment[];
  documents: LineDocument[];
  created_at: string;
};

type Dashboard = {
  recettes: number;
  depenses: number;
  budgetPlanned: number;
  budgetCommitted: number;
  budgetPaid: number;
  budgetRemaining: number;
};

type YearComparison = {
  seasonCode: string;
  seasonLabel: string;
  recettes: number;
  depenses: number;
  budgetPlanned: number;
  budgetCommitted: number;
  budgetPaid: number;
  budgetRemaining: number;
  resultat: number;
};

type ApiPayload = {
  ok: boolean;
  error?: string;
  seasons: Season[];
  selectedSeason: Season | null;
  lines: BudgetLine[];
  dashboard: Dashboard;
};

type LineForm = {
  lineType: "recette" | "depense";
  category: string;
  designation: string;
  note: string;
  amountPlanned: string;
  amountCommitted: string;
};

type PaymentForm = {
  paidAt: string;
  supplier: string;
  note: string;
  amountHt: string;
  amountTax: string;
  amountTtc: string;
  invoiceFile: File | null;
};

type DocumentForm = {
  documentKind: "devis" | "facture" | "document";
  title: string;
  note: string;
  file: File | null;
};

type Attachment = {
  id: string;
  kind: "devis" | "facture" | "document";
  title: string;
  note: string | null;
  url: string | null;
  fileName: string | null;
  createdAt: string;
  source: "payment" | "document";
};

const MAX_DOCUMENTS_PER_LINE = 10;

const defaultDashboard: Dashboard = {
  recettes: 0,
  depenses: 0,
  budgetPlanned: 0,
  budgetCommitted: 0,
  budgetPaid: 0,
  budgetRemaining: 0,
};

const emptyLineForm: LineForm = {
  lineType: "depense",
  category: "",
  designation: "",
  note: "",
  amountPlanned: "",
  amountCommitted: "",
};

const emptyDocumentForm: DocumentForm = {
  documentKind: "document",
  title: "",
  note: "",
  file: null,
};

const CATEGORIES = [
  "Inscriptions",
  "Subventions",
  "Sponsoring",
  "Événements",
  "Déplacements",
  "Équipements",
  "Coaching",
  "Administration",
  "Communication",
  "Autre",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyPaymentForm(): PaymentForm {
  return {
    paidAt: todayIso(),
    supplier: "",
    note: "",
    amountHt: "",
    amountTax: "",
    amountTtc: "",
    invoiceFile: null,
  };
}

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function eurosPdf(value: number) {
  return euros(value).replace(/[\u202f\u00a0]/g, " ");
}

function percent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 %";
  return `${Math.min(999, value).toFixed(0)} %`;
}

function errorMessage(error: unknown, fallback = "Erreur inattendue.") {
  return error instanceof Error ? error.message : fallback;
}

function shortType(type: "recette" | "depense") {
  return type === "recette" ? "R" : "D";
}

function typeClasses(type: "recette" | "depense") {
  return type === "recette" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
}

function attachmentKindLabel(kind: Attachment["kind"]) {
  if (kind === "devis") return "Devis";
  if (kind === "facture") return "Facture";
  return "Document";
}

function attachmentKindClasses(kind: Attachment["kind"]) {
  if (kind === "devis") return "bg-amber-100 text-amber-800";
  if (kind === "facture") return "bg-cyan-100 text-cyan-800";
  return "bg-slate-200 text-slate-800";
}

export default function GererAsso2Page() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [lines, setLines] = useState<BudgetLine[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLineForm, setNewLineForm] = useState<LineForm>(emptyLineForm);
  const [editLineForm, setEditLineForm] = useState<LineForm>(emptyLineForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(createEmptyPaymentForm());
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocumentForm);

  const [committedDraftByLine, setCommittedDraftByLine] = useState<Record<string, string>>({});

  const [detailLineId, setDetailLineId] = useState<string | null>(null);
  const [editLineId, setEditLineId] = useState<string | null>(null);
  const [paymentLineId, setPaymentLineId] = useState<string | null>(null);
  const [documentLineId, setDocumentLineId] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<YearComparison[]>([]);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deletedPaymentsByLine, setDeletedPaymentsByLine] = useState<Record<string, DeletedPayment[]>>({});
  const [loadingDeletedPaymentsLineId, setLoadingDeletedPaymentsLineId] = useState<string | null>(null);

  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(String(event.active.id).replace("drag-", ""));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const sourceId = String(active.id).replace("drag-", "");
    const targetId = String(over.id).replace("drop-", "");
    if (sourceId && targetId && sourceId !== targetId) {
      setMergeSourceId(sourceId);
      setMergeTargetId(targetId);
    }
  }

  const detailLine = useMemo(() => lines.find((line) => line.id === detailLineId) || null, [detailLineId, lines]);
  const editLine = useMemo(() => lines.find((line) => line.id === editLineId) || null, [editLineId, lines]);
  const paymentLine = useMemo(() => lines.find((line) => line.id === paymentLineId) || null, [paymentLineId, lines]);
  const documentLine = useMemo(() => lines.find((line) => line.id === documentLineId) || null, [documentLineId, lines]);
  const deletedPaymentsForDetailLine = useMemo(
    () => (detailLine ? deletedPaymentsByLine[detailLine.id] || [] : []),
    [deletedPaymentsByLine, detailLine]
  );

  async function loadData(seasonCode?: string) {
    setLoading(true);
    setError(null);
    try {
      const query = seasonCode ? `?season=${encodeURIComponent(seasonCode)}` : "";
      const res = await fetch(`/api/bureau/asso2-finance${query}`, { cache: "no-store" });
      const json = (await res.json()) as ApiPayload;
      if (!res.ok || !json.ok) throw new Error(json.error || "Impossible de charger le module financier.");

      setSeasons(json.seasons || []);
      setLines(json.lines || []);
      setDashboard(json.dashboard || defaultDashboard);
      setSelectedSeason(json.selectedSeason?.code || "");

      const drafts: Record<string, string> = {};
      for (const line of json.lines || []) drafts[line.id] = String(line.amount_committed || 0);
      setCommittedDraftByLine(drafts);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!detailLineId) return;
    if (deletedPaymentsByLine[detailLineId]) return;
    void loadDeletedPayments(detailLineId);
  }, [detailLineId, deletedPaymentsByLine]);

  async function handleSeasonChange(value: string) {
    setSelectedSeason(value);
    await loadData(value);
  }

  async function loadDeletedPayments(lineId: string) {
    setLoadingDeletedPaymentsLineId(lineId);
    try {
      const res = await fetch(
        `/api/bureau/asso2-finance/payments/deleted?lineId=${encodeURIComponent(lineId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Lecture archive paiements impossible.");
      }

      setDeletedPaymentsByLine((prev) => ({
        ...prev,
        [lineId]: Array.isArray(json.items) ? json.items : [],
      }));
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoadingDeletedPaymentsLineId((prev) => (prev === lineId ? null : prev));
    }
  }

  async function handleCreateLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeason) return setError("Aucune saison sélectionnée.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bureau/asso2-finance/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonCode: selectedSeason,
          lineType: newLineForm.lineType,
          category: newLineForm.category,
          designation: newLineForm.designation,
          note: newLineForm.note,
          amountPlanned: Number(newLineForm.amountPlanned || 0),
          amountCommitted: Number(newLineForm.amountCommitted || 0),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Création de la ligne impossible.");
      setNewLineForm(emptyLineForm);
      setShowCreateForm(false);
      await loadData(selectedSeason);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(line: BudgetLine) {
    setEditLineId(line.id);
    setEditLineForm({
      lineType: line.line_type,
      category: line.category,
      designation: line.designation,
      note: line.note || "",
      amountPlanned: String(line.amount_planned || 0),
      amountCommitted: String(line.amount_committed || 0),
    });
  }

  async function handleEditLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editLine) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bureau/asso2-finance/lines/${editLine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editLineForm.category,
          designation: editLineForm.designation,
          note: editLineForm.note,
          amountPlanned: Number(editLineForm.amountPlanned || 0),
          amountCommitted: Number(editLineForm.amountCommitted || 0),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Mise à jour impossible.");
      setEditLineId(null);
      await loadData(selectedSeason);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveCommittedAmount(lineId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bureau/asso2-finance/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCommitted: Number(committedDraftByLine[lineId] || 0) }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Mise à jour du montant engagé impossible.");
      await loadData(selectedSeason);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openPaymentModal(line: BudgetLine) {
    setPaymentLineId(line.id);
    setPaymentForm(createEmptyPaymentForm());
  }

  async function handleAddPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentLine) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("lineId", paymentLine.id);
      fd.set("paidAt", paymentForm.paidAt);
      fd.set("supplier", paymentForm.supplier);
      fd.set("note", paymentForm.note);
      fd.set("amountHt", String(Number(paymentForm.amountHt || 0)));
      fd.set("amountTax", String(Number(paymentForm.amountTax || 0)));
      fd.set("amountTtc", String(Number(paymentForm.amountTtc || 0)));
      if (paymentForm.invoiceFile) fd.set("invoiceFile", paymentForm.invoiceFile);

      const res = await fetch("/api/bureau/asso2-finance/payments", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Ajout du paiement impossible.");
      setPaymentLineId(null);
      await loadData(selectedSeason);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!detailLine) return;

    const confirmed = window.confirm(
      "Supprimer ce paiement ? Il sera archivé dans les paiements supprimés et retiré de la vue budget."
    );
    if (!confirmed) return;

    setDeletingPaymentId(paymentId);
    setError(null);

    try {
      const res = await fetch(`/api/bureau/asso2-finance/payments/${paymentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Suppression du paiement impossible.");
      }

      await loadData(selectedSeason);
      await loadDeletedPayments(detailLine.id);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setDeletingPaymentId(null);
    }
  }

  function openDocumentModal(line: BudgetLine) {
    setDocumentLineId(line.id);
    setDocumentForm({ ...emptyDocumentForm, title: line.designation });
  }

  async function handleAddDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentLine) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("lineId", documentLine.id);
      fd.set("documentKind", documentForm.documentKind);
      fd.set("title", documentForm.title);
      fd.set("note", documentForm.note);
      if (documentForm.file) fd.set("file", documentForm.file);

      const res = await fetch("/api/bureau/asso2-finance/documents", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Ajout du document impossible.");
      setDocumentLineId(null);
      setDocumentForm(emptyDocumentForm);
      await loadData(selectedSeason);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function exportToPdf() {
    if (!selectedSeason || lines.length === 0) {
      setError("Aucune donnée à exporter pour cette saison.");
      return;
    }

    try {
      setError(null);
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const seasonLabel = seasons.find((season) => season.code === selectedSeason)?.label || selectedSeason;
      const exportedAt = new Date().toLocaleString("fr-FR");

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("BLACKWAVES - Gestion Financiere Asso 2", 12, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Saison: ${seasonLabel}`, 12, 19);
      doc.text(`Export: ${exportedAt}`, 12, 24);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Recettes: ${eurosPdf(dashboard.recettes)}`, 12, 38);
      doc.text(`Depenses: ${eurosPdf(dashboard.depenses)}`, 70, 38);
      doc.text(`Budget prevu: ${eurosPdf(dashboard.budgetPlanned)}`, 125, 38);
      doc.text(`Budget engage: ${eurosPdf(dashboard.budgetCommitted)}`, 190, 38);
      doc.text(`Reste: ${eurosPdf(dashboard.budgetRemaining)}`, 252, 38, { align: "right" });

      autoTable(doc, {
        startY: 44,
        head: [["Type", "Categorie", "Designation", "Prevu", "Engage", "Paye", "Reste", "Avancement"]],
        body: lines.map((line) => [
          line.line_type === "recette" ? "Recette" : "Depense",
          line.category,
          line.designation,
          eurosPdf(line.amount_planned),
          eurosPdf(line.amount_committed),
          eurosPdf(line.paid_total),
          eurosPdf(line.remaining_amount),
          percent(line.completion_rate),
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 2.2,
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [248, 250, 252],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
        },
        didDrawPage: (data: { pageNumber: number }) => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, 285, pageHeight - 6, { align: "right" });
          if (data.pageNumber === 1) {
            doc.text("Document interne - Bureau Blackwaves", 12, pageHeight - 6);
          }
        },
      });

      const slug = selectedSeason.replace(/[^a-zA-Z0-9_-]/g, "-");
      doc.save(`blackwaves-asso2-${slug}.pdf`);
    } catch (err: unknown) {
      setError(errorMessage(err, "Export PDF impossible."));
    }
  }

  function exportToXls() {
    if (!selectedSeason || lines.length === 0) {
      setError("Aucune donnée à exporter pour cette saison.");
      return;
    }

    try {
      setError(null);
      const seasonLabel = seasons.find((season) => season.code === selectedSeason)?.label || selectedSeason;
      const rows = lines
        .map(
          (line) => `
            <tr>
              <td>${line.line_type === "recette" ? "Recette" : "Depense"}</td>
              <td>${escapeHtml(line.category)}</td>
              <td>${escapeHtml(line.designation)}</td>
              <td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${line.amount_planned.toFixed(2)}</td>
              <td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${line.amount_committed.toFixed(2)}</td>
              <td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${line.paid_total.toFixed(2)}</td>
              <td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${line.remaining_amount.toFixed(2)}</td>
              <td>${Math.round(line.completion_rate)}%</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body { font-family: Arial, sans-serif; }
              .kpis { margin: 0 0 12px 0; font-size: 12px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; }
              th { background: #0f172a; color: #f8fafc; text-align: left; }
            </style>
          </head>
          <body>
            <h2>BLACKWAVES - Gestion Financiere Asso 2</h2>
            <p><strong>Saison:</strong> ${escapeHtml(seasonLabel)}</p>
            <p class="kpis">
              <strong>Recettes:</strong> ${euros(dashboard.recettes)} |
              <strong>Depenses:</strong> ${euros(dashboard.depenses)} |
              <strong>Budget prevu:</strong> ${euros(dashboard.budgetPlanned)} |
              <strong>Budget engage:</strong> ${euros(dashboard.budgetCommitted)} |
              <strong>Reste:</strong> ${euros(dashboard.budgetRemaining)}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Categorie</th>
                  <th>Designation</th>
                  <th>Prevu</th>
                  <th>Engage</th>
                  <th>Paye</th>
                  <th>Reste</th>
                  <th>Avancement</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = selectedSeason.replace(/[^a-zA-Z0-9_-]/g, "-");
      a.download = `blackwaves-asso2-${slug}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(errorMessage(err, "Export XLS impossible."));
    }
  }

  async function openComparison() {
    if (seasons.length === 0) {
      setComparisonError("Aucune saison disponible.");
      setShowComparisonModal(true);
      return;
    }

    setShowComparisonModal(true);
    setComparisonLoading(true);
    setComparisonError(null);
    try {
      const comparisons = await Promise.all(
        seasons.map(async (season) => {
          const res = await fetch(`/api/bureau/asso2-finance?season=${encodeURIComponent(season.code)}`, { cache: "no-store" });
          const json = (await res.json()) as ApiPayload;
          if (!res.ok || !json.ok) throw new Error(json.error || `Chargement impossible pour ${season.label}.`);

          return {
            seasonCode: season.code,
            seasonLabel: season.label,
            recettes: Number(json.dashboard?.recettes || 0),
            depenses: Number(json.dashboard?.depenses || 0),
            budgetPlanned: Number(json.dashboard?.budgetPlanned || 0),
            budgetCommitted: Number(json.dashboard?.budgetCommitted || 0),
            budgetPaid: Number(json.dashboard?.budgetPaid || 0),
            budgetRemaining: Number(json.dashboard?.budgetRemaining || 0),
            resultat: Number(json.dashboard?.recettes || 0) - Number(json.dashboard?.depenses || 0),
          } as YearComparison;
        })
      );

      comparisons.sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
      setComparisonData(comparisons);
    } catch (err: unknown) {
      setComparisonError(errorMessage(err, "Impossible de comparer les saisons."));
      setComparisonData([]);
    } finally {
      setComparisonLoading(false);
    }
  }

  const linesWithAttachmentCounts = useMemo(() => lines.map((line) => ({ ...line, attachmentCount: buildAttachments(line).length })), [lines]);

  const expenseTotals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          if (line.line_type !== "depense") return acc;
          acc.planned += Number(line.amount_planned || 0);
          acc.committed += Number(line.amount_committed || 0);
          acc.paid += Number(line.paid_total || 0);
          return acc;
        },
        { planned: 0, committed: 0, paid: 0 }
      ),
    [lines]
  );

  const detailAttachments = detailLine ? buildAttachments(detailLine) : [];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_36%,#e2e8f0_100%)] pb-16 text-slate-900">
      <div className="mx-auto max-w-[1320px] px-4 pt-8 md:px-6">
        <header className="border-b border-slate-300/70 pb-5 md:pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">Espace bureau</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">Gérer l'asso 2 - Pilotage financier</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">Vue consolidée de la saison: prévisionnel, devis signés, paiements, justificatifs et documents de suivi.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/bureau" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                Retour bureau
              </Link>
              <Link href="/bureau/liste-athletes" className="rounded-full bg-cyan-700 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-800">
                Liste des athlètes
              </Link>
            </div>
          </div>
        </header>

        {error && <div className="mt-4 border-l-2 border-rose-500 bg-rose-50/70 px-4 py-2 text-sm text-rose-800">{error}</div>}

        <section className="mt-7 grid gap-8 md:grid-cols-[300px_1fr]">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Saison</label>
            <select className="w-full border-b border-slate-400/70 bg-transparent px-1 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600" value={selectedSeason} onChange={(e) => handleSeasonChange(e.target.value)} disabled={loading}>
              {seasons.map((season) => (
                <option key={season.id} value={season.code}>
                  {season.label}
                </option>
              ))}
            </select>
            <div className="mt-4 text-xs text-slate-500">Le récapitulatif budget ci-contre est calculé sur les lignes de dépense. Les recettes sont isolées dans leur propre indicateur.</div>
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Recettes encaissées" value={euros(dashboard.recettes)} tone="emerald" />
            <KpiCard label="Dépenses payées" value={euros(dashboard.depenses)} tone="rose" />
            <KpiCard label="Budget prévisionnel" value={euros(dashboard.budgetPlanned)} tone="sky" />
            <KpiCard label="Budget engagé" value={euros(dashboard.budgetCommitted)} tone="amber" />
            <KpiCard label="Sommes payées" value={euros(dashboard.budgetPaid)} tone="indigo" />
            <KpiCard label="Reste à dépenser" value={euros(dashboard.budgetRemaining)} tone="slate" />
          </div>
        </section>

        <section className="mt-8 border-t border-slate-300/70 pt-5">
          <button type="button" onClick={() => setShowCreateForm((prev) => !prev)} className="flex w-full items-center gap-3 border-b border-dashed border-slate-300/80 px-1 py-3 text-left text-sm font-semibold text-slate-800 hover:text-cyan-700">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-700 text-lg text-white">+</span>
            <span>Ajouter une ligne budgétaire</span>
          </button>

          {showCreateForm && (
            <form onSubmit={handleCreateLine} className="mt-4 grid gap-3 md:grid-cols-12">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                <select value={newLineForm.lineType} onChange={(e) => setNewLineForm((prev) => ({ ...prev, lineType: e.target.value as "recette" | "depense" }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm">
                  <option value="depense">Dépense</option>
                  <option value="recette">Recette</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Catégorie</label>
                <input list="asso2-categories" value={newLineForm.category} onChange={(e) => setNewLineForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required />
                <datalist id="asso2-categories">
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Désignation</label>
                <input value={newLineForm.designation} onChange={(e) => setNewLineForm((prev) => ({ ...prev, designation: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Prévu</label>
                <input type="number" min="0" step="0.01" value={newLineForm.amountPlanned} onChange={(e) => setNewLineForm((prev) => ({ ...prev, amountPlanned: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Engagé</label>
                <input type="number" min="0" step="0.01" value={newLineForm.amountCommitted} onChange={(e) => setNewLineForm((prev) => ({ ...prev, amountCommitted: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" />
              </div>
              <div className="md:col-span-9">
                <label className="mb-1 block text-xs font-medium text-slate-600">Informations complémentaires</label>
                <input value={newLineForm.note} onChange={(e) => setNewLineForm((prev) => ({ ...prev, note: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" />
              </div>
              <div className="md:col-span-3 flex items-end justify-end">
                <button type="submit" disabled={saving || loading} className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">
                  Ajouter
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="mt-8 border-t border-slate-300/70 pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lignes budgétaires</h2>
              <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">R</span> Recette</span>
                <span className="inline-flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-[11px] font-bold text-rose-700">D</span> Dépense</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={exportToPdf} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900">
                Exporter PDF
              </button>
              <button type="button" onClick={exportToXls} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900">
                Exporter XLS
              </button>
              <button type="button" onClick={openComparison} className="rounded-full border border-cyan-300/80 bg-cyan-50/70 px-3 py-1.5 text-[11px] font-semibold text-cyan-800 hover:border-cyan-400 hover:bg-cyan-100/70">
                Comparer les années
              </button>
              <span className="text-xs text-slate-500">{lines.length} ligne(s) | Dépenses prévues {euros(expenseTotals.planned)}</span>
            </div>
          </div>

          {loading ? (
            <p className="px-1 py-3 text-sm text-slate-600">Chargement...</p>
          ) : lines.length === 0 ? (
            <p className="px-1 py-3 text-sm text-slate-600">Aucune ligne sur cette saison.</p>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <table className="min-w-[1300px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-300/80 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="w-8 px-2 py-2 text-center">#</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Catégorie</th>
                      <th className="px-3 py-2">Désignation</th>
                      <th className="px-3 py-2 text-right">Prévu</th>
                      <th className="px-3 py-2">Engagé</th>
                      <th className="px-3 py-2 text-right">Payé</th>
                      <th className="px-3 py-2">Avancement</th>
                      <th className="px-3 py-2 text-center">Docs</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linesWithAttachmentCounts.map((line, index) => (
                      <DraggableRow
                        key={line.id}
                        line={line}
                        rowIndex={index + 1}
                        committedDraft={committedDraftByLine[line.id] || ""}
                        saving={saving}
                        onRowClick={() => setDetailLineId(line.id)}
                        onCommittedChange={(value) =>
                          setCommittedDraftByLine((prev) => ({ ...prev, [line.id]: value }))
                        }
                        onSaveCommitted={() => saveCommittedAmount(line.id)}
                        onEditLine={() => openEditModal(line)}
                        onDocumentLine={() => openDocumentModal(line)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <DragOverlay dropAnimation={null}>
                {dragActiveId ? (
                  <div className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-xl opacity-90">
                    {lines.find((l) => l.id === dragActiveId)?.designation || "Ligne"}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </section>
      </div>

      {detailLine && (
        <Modal title={detailLine.designation} subtitle={`${detailLine.category} • ${detailLine.line_type === "recette" ? "Recette" : "Dépense"}`} onClose={() => setDetailLineId(null)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoBlock label="Montant prévu" value={euros(detailLine.amount_planned)} />
              <InfoBlock label="Montant engagé" value={euros(detailLine.amount_committed)} />
              <InfoBlock label="Montant payé" value={euros(detailLine.paid_total)} />
              <InfoBlock label="Reste" value={euros(detailLine.remaining_amount)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800" onClick={() => openPaymentModal(detailLine)}>
                Ajouter un paiement
              </button>
              <button type="button" className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800" onClick={() => openDocumentModal(detailLine)}>
                Ajouter un document
              </button>
              <button type="button" className="rounded-full bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300" onClick={() => openEditModal(detailLine)}>
                Modifier la fiche
              </button>
            </div>
          </div>

          {detailLine.note && <div className="mt-4 border-l-2 border-slate-300 pl-3 text-sm text-slate-600">{detailLine.note}</div>}

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Paiements</h3>
              <span className="text-xs text-slate-500">{detailLine.payments.length} mouvement(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Fournisseur</th>
                    <th className="px-3 py-2 text-right">HT</th>
                    <th className="px-3 py-2 text-right">Taxe</th>
                    <th className="px-3 py-2 text-right">TTC</th>
                    <th className="px-3 py-2">Facture</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLine.payments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-3 text-sm text-slate-500">Aucun paiement saisi.</td>
                    </tr>
                  )}
                  {detailLine.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{payment.paid_at}</td>
                      <td className="px-3 py-2">{payment.supplier || "-"}</td>
                      <td className="px-3 py-2 text-right">{euros(payment.amount_ht)}</td>
                      <td className="px-3 py-2 text-right">{euros(payment.amount_tax)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{euros(payment.amount_ttc)}</td>
                      <td className="px-3 py-2">{payment.invoice_url ? <a href={payment.invoice_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cyan-700 hover:text-cyan-900">Ouvrir</a> : <span className="text-xs text-slate-400">-</span>}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{payment.note || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={deletingPaymentId === payment.id}
                        >
                          {deletingPaymentId === payment.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
              <summary className="cursor-pointer select-none text-xs font-semibold text-slate-600">
                Archive paiements supprimés ({deletedPaymentsForDetailLine.length})
              </summary>
              <div className="mt-2 overflow-x-auto">
                {loadingDeletedPaymentsLineId === detailLine.id ? (
                  <p className="py-2 text-xs text-slate-500">Chargement des archives...</p>
                ) : deletedPaymentsForDetailLine.length === 0 ? (
                  <p className="py-2 text-xs text-slate-500">Aucun paiement supprimé sur cette fiche.</p>
                ) : (
                  <table className="min-w-[720px] w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">Supprimé le</th>
                        <th className="px-2 py-2">Date paiement</th>
                        <th className="px-2 py-2">Fournisseur</th>
                        <th className="px-2 py-2 text-right">TTC</th>
                        <th className="px-2 py-2">Motif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedPaymentsForDetailLine.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-100">
                          <td className="px-2 py-2">{payment.deleted_at?.slice(0, 10) || "-"}</td>
                          <td className="px-2 py-2">{payment.paid_at || "-"}</td>
                          <td className="px-2 py-2">{payment.supplier || "-"}</td>
                          <td className="px-2 py-2 text-right font-medium">{euros(payment.amount_ttc)}</td>
                          <td className="px-2 py-2">{payment.deleted_reason || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>
          </section>

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Documents et justificatifs</h3>
              <span className="text-xs text-slate-500">{detailAttachments.length}/{MAX_DOCUMENTS_PER_LINE}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detailAttachments.length === 0 && <p className="text-sm text-slate-500">Aucun document sur cette fiche.</p>}
              {detailAttachments.map((attachment) => (
                <div key={`${attachment.source}-${attachment.id}`} className="border-b border-slate-200 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${attachmentKindClasses(attachment.kind)}`}>{attachmentKindLabel(attachment.kind)}</span>
                    <span className="text-[11px] text-slate-500">{attachment.createdAt.slice(0, 10)}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{attachment.title}</div>
                  {attachment.note && <div className="mt-1 text-xs text-slate-600">{attachment.note}</div>}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-slate-500">{attachment.fileName || "document"}</span>
                    {attachment.url ? <a href={attachment.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cyan-700 hover:text-cyan-900">Ouvrir</a> : <span className="text-xs text-slate-400">Indisponible</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Modal>
      )}

      {editLine && (
        <Modal title="Modifier la ligne" subtitle={editLine.designation} onClose={() => setEditLineId(null)}>
          <form onSubmit={handleEditLine} className="grid gap-3 md:grid-cols-2">
            <Field label="Catégorie"><input value={editLineForm.category} onChange={(e) => setEditLineForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Désignation"><input value={editLineForm.designation} onChange={(e) => setEditLineForm((prev) => ({ ...prev, designation: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Montant prévu"><input type="number" min="0" step="0.01" value={editLineForm.amountPlanned} onChange={(e) => setEditLineForm((prev) => ({ ...prev, amountPlanned: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Montant engagé"><input type="number" min="0" step="0.01" value={editLineForm.amountCommitted} onChange={(e) => setEditLineForm((prev) => ({ ...prev, amountCommitted: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" /></Field>
            <div className="md:col-span-2"><Field label="Informations complémentaires"><textarea value={editLineForm.note} onChange={(e) => setEditLineForm((prev) => ({ ...prev, note: e.target.value }))} className="h-24 w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" /></Field></div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300" onClick={() => setEditLineId(null)}>Annuler</button>
              <button type="submit" disabled={saving} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {paymentLine && (
        <Modal title="Ajouter un paiement" subtitle={paymentLine.designation} onClose={() => setPaymentLineId(null)}>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddPayment}>
            <Field label="Date du paiement"><input type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm((prev) => ({ ...prev, paidAt: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Fournisseur"><input value={paymentForm.supplier} onChange={(e) => setPaymentForm((prev) => ({ ...prev, supplier: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" /></Field>
            <Field label="Montant HT"><input type="number" min="0" step="0.01" value={paymentForm.amountHt} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amountHt: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Montant taxe"><input type="number" min="0" step="0.01" value={paymentForm.amountTax} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amountTax: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Montant TTC"><input type="number" min="0" step="0.01" value={paymentForm.amountTtc} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amountTtc: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <Field label="Facture (optionnel)"><input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setPaymentForm((prev) => ({ ...prev, invoiceFile: e.target.files?.[0] || null }))} className="w-full text-sm" /></Field>
            <div className="md:col-span-2"><Field label="Note"><textarea value={paymentForm.note} onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))} className="h-24 w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" /></Field></div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300" onClick={() => setPaymentLineId(null)}>Annuler</button>
              <button type="submit" disabled={saving} className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">Enregistrer le paiement</button>
            </div>
          </form>
        </Modal>
      )}

      {documentLine && (
        <Modal title="Ajouter un document" subtitle={`${documentLine.designation} • ${buildAttachments(documentLine).length}/${MAX_DOCUMENTS_PER_LINE} document(s)`} onClose={() => setDocumentLineId(null)}>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddDocument}>
            <Field label="Type de document"><select value={documentForm.documentKind} onChange={(e) => setDocumentForm((prev) => ({ ...prev, documentKind: e.target.value as "devis" | "facture" | "document" }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"><option value="devis">Devis</option><option value="facture">Facture</option><option value="document">Document</option></select></Field>
            <Field label="Titre"><input value={documentForm.title} onChange={(e) => setDocumentForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" required /></Field>
            <div className="md:col-span-2"><Field label="Fichier"><input type="file" accept="image/*,application/pdf" onChange={(e) => setDocumentForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} className="w-full text-sm" required /></Field></div>
            <div className="md:col-span-2"><Field label="Note"><textarea value={documentForm.note} onChange={(e) => setDocumentForm((prev) => ({ ...prev, note: e.target.value }))} className="h-24 w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm" /></Field></div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300" onClick={() => setDocumentLineId(null)}>Annuler</button>
              <button type="submit" disabled={saving || buildAttachments(documentLine).length >= MAX_DOCUMENTS_PER_LINE} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">Ajouter le document</button>
            </div>
          </form>
        </Modal>
      )}

      {showComparisonModal && (
        <Modal title="Comparer les années" subtitle="Vue transversale des saisons" onClose={() => setShowComparisonModal(false)}>
          {comparisonLoading ? (
            <p className="text-sm text-slate-600">Chargement des comparatifs...</p>
          ) : comparisonError ? (
            <p className="text-sm text-rose-700">{comparisonError}</p>
          ) : comparisonData.length === 0 ? (
            <p className="text-sm text-slate-600">Aucune donnée disponible.</p>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <div className="min-w-[760px] space-y-3">
                  {comparisonData.map((year) => (
                    <SeasonComparisonRow key={year.seasonCode} data={year} maxValue={Math.max(...comparisonData.map((item) => Math.max(item.recettes, item.depenses, 1)))} />
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border-t border-slate-200 pt-4">
                <table className="min-w-[760px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Saison</th>
                      <th className="px-3 py-2 text-right">Recettes</th>
                      <th className="px-3 py-2 text-right">Dépenses</th>
                      <th className="px-3 py-2 text-right">Résultat</th>
                      <th className="px-3 py-2 text-right">Budget prévu</th>
                      <th className="px-3 py-2 text-right">Engagé</th>
                      <th className="px-3 py-2 text-right">Payé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((year) => (
                      <tr key={`${year.seasonCode}-table`} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{year.seasonLabel}</td>
                        <td className="px-3 py-2 text-right">{euros(year.recettes)}</td>
                        <td className="px-3 py-2 text-right">{euros(year.depenses)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${year.resultat >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{euros(year.resultat)}</td>
                        <td className="px-3 py-2 text-right">{euros(year.budgetPlanned)}</td>
                        <td className="px-3 py-2 text-right">{euros(year.budgetCommitted)}</td>
                        <td className="px-3 py-2 text-right">{euros(year.budgetPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}

      {mergeSourceId && mergeTargetId && (() => {
        const src1 = lines.find((l) => l.id === mergeSourceId);
        const src2 = lines.find((l) => l.id === mergeTargetId);
        if (!src1 || !src2) return null;
        return (
          <MergeModal
            key={`${mergeSourceId}-${mergeTargetId}`}
            sourceLine1={src1}
            sourceLine2={src2}
            onClose={() => { setMergeSourceId(null); setMergeTargetId(null); }}
            onSuccess={async () => {
              setMergeSourceId(null);
              setMergeTargetId(null);
              await loadData(selectedSeason);
            }}
          />
        );
      })()}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildAttachments(line: BudgetLine): Attachment[] {
  const paymentAttachments: Attachment[] = line.payments.filter((payment) => Boolean(payment.invoice_url)).map((payment) => ({
    id: payment.id,
    kind: "facture",
    title: payment.invoice_name || payment.supplier || "Facture de paiement",
    note: payment.note,
    url: payment.invoice_url,
    fileName: payment.invoice_name,
    createdAt: payment.created_at,
    source: "payment",
  }));

  const lineAttachments: Attachment[] = line.documents.map((document) => ({
    id: document.id,
    kind: document.document_kind,
    title: document.title || document.file_name || "Document",
    note: document.note,
    url: document.file_url,
    fileName: document.file_name,
    createdAt: document.created_at,
    source: "document",
  }));

  return [...lineAttachments, ...paymentAttachments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function DraggableRow({
  line,
  rowIndex,
  committedDraft,
  saving,
  onRowClick,
  onCommittedChange,
  onSaveCommitted,
  onEditLine,
  onDocumentLine,
}: {
  line: BudgetLine & { attachmentCount: number };
  rowIndex: number;
  committedDraft: string;
  saving: boolean;
  onRowClick: () => void;
  onCommittedChange: (value: string) => void;
  onSaveCommitted: () => void;
  onEditLine: () => void;
  onDocumentLine: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `drag-${line.id}`,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop-${line.id}` });

  const isOverBudget = line.amount_planned === 0 && line.paid_total > 0;
  const completionPct = isOverBudget ? 100 : Math.min(100, Math.max(0, line.completion_rate));

  return (
    <tr
      ref={setDropRef}
      className={`cursor-pointer border-b border-slate-200/80 transition ${isDragging ? "opacity-40" : ""} ${isOver ? "bg-cyan-50/80 outline outline-2 -outline-offset-2 outline-cyan-400" : "hover:bg-white/60"}`}
      onClick={onRowClick}
    >
      <td className="px-2 py-2 text-center text-[11px] font-mono text-slate-400 select-none">{rowIndex}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${typeClasses(line.line_type)}`}>{shortType(line.line_type)}</span>
      </td>
      <td className="px-3 py-2 text-[13px] font-medium text-slate-800">{line.category}</td>
      <td className="px-3 py-2 text-[13px] text-slate-900">
        <div className="flex items-center gap-2">
          <span>{line.designation}</span>
          {line.note && <NoteTooltip note={line.note} />}
          {isOverBudget && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Hors budget</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right text-[13px] font-semibold text-slate-900">{euros(line.amount_planned)}</td>
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={committedDraft}
          onChange={(e) => onCommittedChange(e.target.value)}
          className="w-24 border-b border-slate-300 bg-transparent px-1 py-1 text-[13px] text-slate-800 outline-none"
        />
      </td>
      <td className="px-3 py-2 text-right text-[13px] font-semibold text-slate-900">{euros(line.paid_total)}</td>
      <td className="px-3 py-2">
        <div className="min-w-[150px]">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
            {isOverBudget ? (
              <>
                <span className="font-semibold text-rose-600">+{euros(line.paid_total)}</span>
                <span className="text-rose-600">hors budget</span>
              </>
            ) : (
              <>
                <span>{percent(line.completion_rate)}</span>
                <span>{euros(line.remaining_amount)}</span>
              </>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div
              className={`h-1.5 rounded-full ${isOverBudget ? "bg-rose-500" : "bg-cyan-600"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-center text-[12px] text-slate-600">{line.attachmentCount}/{MAX_DOCUMENTS_PER_LINE}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <IconButton label="Enregistrer" onClick={onSaveCommitted} disabled={saving}>
            <SaveIcon />
          </IconButton>
          <IconButton label="Modifier" onClick={onEditLine}>
            <EditIcon />
          </IconButton>
          <IconButton label="Ajouter un document" onClick={onDocumentLine} disabled={line.attachmentCount >= MAX_DOCUMENTS_PER_LINE}>
            <DocumentIcon />
          </IconButton>
          <span
            ref={setDragRef}
            {...attributes}
            {...listeners}
            title="Glisser sur une autre ligne pour fusionner"
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing"
          >
            <DragHandleIcon />
          </span>
        </div>
      </td>
    </tr>
  );
}

type MergeCandidate = {
  key: string;
  type: "payment" | "document";
  id: string;
  fromLine: 1 | 2;
  label: string;
  sublabel: string;
  amount?: number;
};

function MergeModal({
  sourceLine1,
  sourceLine2,
  onClose,
  onSuccess,
}: {
  sourceLine1: BudgetLine;
  sourceLine2: BudgetLine;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const allCandidates = useMemo<MergeCandidate[]>(
    () => [
      ...sourceLine1.payments.map((p) => ({
        key: `payment-${p.id}`,
        type: "payment" as const,
        id: p.id,
        fromLine: 1 as const,
        label: p.supplier || "Paiement",
        sublabel: p.paid_at,
        amount: p.amount_ttc,
      })),
      ...sourceLine1.documents.map((d) => ({
        key: `doc-${d.id}`,
        type: "document" as const,
        id: d.id,
        fromLine: 1 as const,
        label: d.title || d.file_name || "Document",
        sublabel: d.document_kind || "document",
      })),
      ...sourceLine2.payments.map((p) => ({
        key: `payment-${p.id}`,
        type: "payment" as const,
        id: p.id,
        fromLine: 2 as const,
        label: p.supplier || "Paiement",
        sublabel: p.paid_at,
        amount: p.amount_ttc,
      })),
      ...sourceLine2.documents.map((d) => ({
        key: `doc-${d.id}`,
        type: "document" as const,
        id: d.id,
        fromLine: 2 as const,
        label: d.title || d.file_name || "Document",
        sublabel: d.document_kind || "document",
      })),
    ],
    [sourceLine1, sourceLine2]
  );

  const [inTarget, setInTarget] = useState<Set<string>>(
    () => new Set(allCandidates.map((c) => c.key))
  );

  const [targetForm, setTargetForm] = useState({
    lineType: sourceLine1.line_type as "recette" | "depense",
    category: sourceLine1.category,
    designation: `${sourceLine1.designation} / ${sourceLine2.designation}`.slice(0, 200),
    note: "",
    amountPlanned: String(sourceLine1.amount_planned + sourceLine2.amount_planned),
    amountCommitted: String(sourceLine1.amount_committed + sourceLine2.amount_committed),
  });

  function toggleItem(key: string) {
    setInTarget((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMergeError(null);
    try {
      const targetPaymentIds: string[] = [];
      const targetDocumentIds: string[] = [];
      for (const key of inTarget) {
        if (key.startsWith("payment-")) targetPaymentIds.push(key.slice("payment-".length));
        else if (key.startsWith("doc-")) targetDocumentIds.push(key.slice("doc-".length));
      }
      const res = await fetch("/api/bureau/asso2-finance/merge-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLineId1: sourceLine1.id,
          sourceLineId2: sourceLine2.id,
          targetLine: {
            lineType: targetForm.lineType,
            category: targetForm.category,
            designation: targetForm.designation,
            note: targetForm.note,
            amountPlanned: Number(targetForm.amountPlanned || 0),
            amountCommitted: Number(targetForm.amountCommitted || 0),
          },
          targetPaymentIds,
          targetDocumentIds,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fusion impossible.");
      await onSuccess();
    } catch (err: unknown) {
      setMergeError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSaving(false);
    }
  }

  const line1Items = allCandidates.filter((c) => c.fromLine === 1);
  const line2Items = allCandidates.filter((c) => c.fromLine === 2);

  return (
    <Modal
      title="Fusionner deux lignes budgétaires"
      subtitle={`${sourceLine1.designation}  ↔  ${sourceLine2.designation}`}
      onClose={onClose}
    >
      <form onSubmit={handleSave} className="space-y-6">
        {mergeError && (
          <div className="border-l-2 border-rose-500 bg-rose-50/70 px-4 py-2 text-sm text-rose-800">{mergeError}</div>
        )}

        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Nouvelle ligne cible</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Type">
              <select
                value={targetForm.lineType}
                onChange={(e) => setTargetForm((p) => ({ ...p, lineType: e.target.value as "recette" | "depense" }))}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"
              >
                <option value="depense">Dépense</option>
                <option value="recette">Recette</option>
              </select>
            </Field>
            <Field label="Catégorie">
              <input
                value={targetForm.category}
                onChange={(e) => setTargetForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"
                required
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Désignation">
                <input
                  value={targetForm.designation}
                  onChange={(e) => setTargetForm((p) => ({ ...p, designation: e.target.value }))}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"
                  required
                />
              </Field>
            </div>
            <Field label="Montant prévu">
              <input
                type="number" min="0" step="0.01"
                value={targetForm.amountPlanned}
                onChange={(e) => setTargetForm((p) => ({ ...p, amountPlanned: e.target.value }))}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"
                required
              />
            </Field>
            <Field label="Montant engagé">
              <input
                type="number" min="0" step="0.01"
                value={targetForm.amountCommitted}
                onChange={(e) => setTargetForm((p) => ({ ...p, amountCommitted: e.target.value }))}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Note">
                <input
                  value={targetForm.note}
                  onChange={(e) => setTargetForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-sm"
                />
              </Field>
            </div>
          </div>
        </section>

        <section>
          <h4 className="mb-1 text-sm font-semibold text-slate-900">Éléments à intégrer dans la ligne cible</h4>
          <p className="mb-3 text-xs text-slate-500">
            Cochez les éléments à déplacer dans la nouvelle ligne. Les éléments décochés restent archivés avec leur ligne d'origine.
          </p>
          {allCandidates.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun élément (paiements/documents) sur ces deux lignes.</p>
          ) : (
            <div className="space-y-1">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeClasses(sourceLine1.line_type)}`}>{shortType(sourceLine1.line_type)}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ligne 1 — {sourceLine1.designation}</span>
              </div>
              {line1Items.length === 0
                ? <p className="pl-2 text-xs text-slate-400">Aucun élément.</p>
                : line1Items.map((c) => (
                    <MergeCandidateRow key={c.key} candidate={c} checked={inTarget.has(c.key)} onToggle={() => toggleItem(c.key)} />
                  ))}

              <div className="mb-1 mt-4 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeClasses(sourceLine2.line_type)}`}>{shortType(sourceLine2.line_type)}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ligne 2 — {sourceLine2.designation}</span>
              </div>
              {line2Items.length === 0
                ? <p className="pl-2 text-xs text-slate-400">Aucun élément.</p>
                : line2Items.map((c) => (
                    <MergeCandidateRow key={c.key} candidate={c} checked={inTarget.has(c.key)} onToggle={() => toggleItem(c.key)} />
                  ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">
            {saving ? "Fusion en cours…" : "Sauvegarder la fusion"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MergeCandidateRow({
  candidate,
  checked,
  onToggle,
}: {
  candidate: MergeCandidate;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition ${checked ? "bg-cyan-50/70" : "bg-slate-50/50 opacity-60"}`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-cyan-700" />
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${candidate.type === "payment" ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800"}`}
      >
        {candidate.type === "payment" ? "Paiement" : "Document"}
      </span>
      <span className="flex-1 text-[13px] text-slate-900">{candidate.label}</span>
      <span className="text-[11px] text-slate-500">{candidate.sublabel}</span>
      {candidate.amount != null && (
        <span className="text-[13px] font-semibold text-slate-700">{euros(candidate.amount)}</span>
      )}
    </label>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "sky" | "amber" | "indigo" | "slate" }) {
  const toneStyles: Record<typeof tone, string> = {
    emerald: "text-emerald-800",
    rose: "text-rose-800",
    sky: "text-sky-800",
    amber: "text-amber-800",
    indigo: "text-indigo-800",
    slate: "text-slate-800",
  };

  return (
    <div className="border-l-2 border-slate-300 pl-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
    </div>
  );
}

function SeasonComparisonRow({ data, maxValue }: { data: YearComparison; maxValue: number }) {
  const recettesRatio = Math.min(100, Math.round((data.recettes / Math.max(1, maxValue)) * 100));
  const depensesRatio = Math.min(100, Math.round((data.depenses / Math.max(1, maxValue)) * 100));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{data.seasonLabel}</h4>
        <span className={`text-xs font-semibold ${data.resultat >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Résultat {euros(data.resultat)}</span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>Recettes</span>
            <span>{euros(data.recettes)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${recettesRatio}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>Dépenses</span>
            <span>{euros(data.depenses)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-rose-500" style={{ width: `${depensesRatio}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function NoteTooltip({ note }: { note: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">i</span>
      <span className="pointer-events-none absolute left-6 top-1/2 z-20 hidden w-64 -translate-y-1/2 rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-100 shadow-lg group-hover:block">{note}</span>
    </span>
  );
}

function IconButton({ label, children, onClick, disabled = false }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/30">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Fermer</button>
        </div>
        <div className="max-h-[calc(92vh-80px)] overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v6h8V4" />
      <path d="M9 17h6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20l4.5-1 9-9-3.5-3.5-9 9z" />
      <path d="M13.5 6.5L17 10" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3h7l4 4v14H8z" />
      <path d="M15 3v5h5" />
      <path d="M12 12v6" />
      <path d="M9 15h6" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}
