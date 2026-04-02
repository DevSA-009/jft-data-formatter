// src/htmlGenerator.ts
import {
  AnalysisResult,
  OrderKeywords,
  OrderRow,
  SizeKey,
  SummaryData,
  TableBaseHeads,
} from "./types";
import { formatSizeForDisplay, sortSizes } from "./utils";

/** Player label format: `Name (Number)-SLEEVE_SLEEVE-PANT_PANT` */
const formatPlayerLabel = (r: OrderRow, uppercase: boolean): string => {
  const name = uppercase ? (r.NAME || "").toUpperCase() : r.NAME || "";
  const num = uppercase ? (r.NUMBER || "").toUpperCase() : r.NUMBER || "";
  const slv = r.SLEEVE ? `(${r.SLEEVE} SLEEVE)` : "";
  const pnt = r.PANT && r.PANT !== "NO" ? `(${r.PANT} PANT)` : "";
  const suffix = [slv, pnt].filter(Boolean).join("--");
  const base = num ? `${name} (${num})` : name;
  return suffix ? `${base}--${suffix}` : base;
};

export class HTMLGenerator {
  constructor(
    private validRows: OrderRow[],
    private summaryData: Record<string, SummaryData>,
    private invalidCount: number,
    private showIndex: boolean,
    private uppercase: boolean = false,
  ) {}

  /**
   * Generates the top info grid section (shared between formats).
   */
  generateTopInfo(
    cName: string,
    cAddress: string,
    cContact: string,
    jType: string,
    fType: string,
    analysis: AnalysisResult,
    imgSrc: string,
  ): string {
    const dName = cName.trim() || "________";
    const dAddress = cAddress.trim() || "________";
    const dContact = cContact.trim() || "XXXXXXXX";
    return `<div class="top-info-grid">
      <div class="image-side"><img src="${imgSrc}" alt="Design" /></div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Client Name</span><span class="info-value">${dName}</span></div>
        <div class="info-item"><span class="info-label">Jersey Type</span><span class="info-value">${jType}</span></div>
        <div class="info-item"><span class="info-label">Fabrics</span><span class="info-value">${fType}</span></div>
        <div class="info-item"><span class="info-label">Sleeve</span><span class="info-value">${analysis.sleeveInfo}</span></div>
        <div class="info-item"><span class="info-label">RIB</span><span class="info-value">${analysis.ribInfo}</span></div>
        <div class="info-item"><span class="info-label">PANT</span><span class="info-value">${analysis.pantInfo}</span></div>
        <div class="info-item"><span class="info-label">Client Contact:</span><span class="info-value">${dContact}</span></div>
        <div class="info-item"><span class="info-label">Client Address:</span><span class="info-value">${dAddress}</span></div>
      </div>
      <div class="summary-side">${this.generateSummaryTable(analysis)}</div>
    </div>`;
  }

  /**
   * Generates the summary table shown in the top info grid.
   */
  generateSummaryTable(analysis: AnalysisResult): string {
    const { LONG, SHORT, PANT, RIB, TOTAL, SIZE, QTY } = OrderKeywords;

    let total = 0,
      totalLong = 0,
      totalShort = 0,
      totalRIB = 0,
      totalPant = 0;
    let html = `<table class="resizable-table"><thead><tr><th>${SIZE}</th><th>${QTY}</th>`;
    if (analysis.hasLongInSummary) html += `<th>${LONG}</th>`;
    if (analysis.hasShortInSummary) html += `<th>${SHORT}</th>`;
    if (analysis.hasRIBInSummary) html += `<th>${RIB}</th>`;
    if (analysis.hasPantInSummary) html += `<th>${PANT}</th>`;
    html += "</tr></thead><tbody>";

    sortSizes(Object.keys(this.summaryData)).forEach((size) => {
      const s = this.summaryData[size];
      total += s.TOTAL;
      totalLong += s.LONG;
      totalShort += s.SHORT;
      totalRIB += s.RIB;
      totalPant += s.PANT;
      html += `<tr><td>${formatSizeForDisplay(size)}</td><td>${s.TOTAL}</td>`;
      if (analysis.hasLongInSummary) html += `<td>${s.LONG}</td>`;
      if (analysis.hasShortInSummary) html += `<td>${s.SHORT}</td>`;
      if (analysis.hasRIBInSummary) html += `<td>${s.RIB}</td>`;
      if (analysis.hasPantInSummary) html += `<td>${s.PANT}</td>`;
      html += "</tr>";
    });

    html += `<tr class="summary-footer"><td>${TOTAL}</td><td>${total}</td>`;
    if (analysis.hasLongInSummary) html += `<td>${totalLong}</td>`;
    if (analysis.hasShortInSummary) html += `<td>${totalShort}</td>`;
    if (analysis.hasRIBInSummary) html += `<td>${totalRIB}</td>`;
    if (analysis.hasPantInSummary) html += `<td>${totalPant}</td>`;
    html += "</tr>";

    if (this.invalidCount) {
      const cs =
        2 +
        (analysis.hasLongInSummary ? 1 : 0) +
        (analysis.hasShortInSummary ? 1 : 0) +
        (analysis.hasRIBInSummary ? 1 : 0) +
        (analysis.hasPantInSummary ? 1 : 0);
      html += `<tr class="error-row"><td colspan="${cs}">Invalid Rows: ${this.invalidCount}</td></tr>`;
    }

    return html + "</tbody></table>";
  }

  /**
   * Generates the standard detail table (used when format1 is selected).
   */
  generateDetailTable(analysis: AnalysisResult): string {
    const { SIZE, LONG, SHORT, NO, SLEEVE, NAME, NUMBER, YES } = OrderKeywords;

    let serial = 1;

    const finalTableHeads = TableBaseHeads.filter(
      (head) => analysis.hasItems[head],
    );

    let html =
      '<div class="section-header"><h2>Detail List</h2></div><table class="resizable-table"><thead><tr>';

    if (this.showIndex) html += "<th>SN</th>";
    finalTableHeads.forEach((head) => (html += `<th>${head}</th>`));

    html += "</tr></thead><tbody>";

    sortSizes([
      ...new Set(this.validRows.filter((r) => r.VALID).map((r) => r.SIZE)),
    ]).forEach((size) => {
      this.validRows
        .filter((r) => r.SIZE === size && r.VALID)
        .forEach((r) => {
          const isLong = r.SLEEVE === LONG;
          const rowClass = isLong ? "long-sleeve" : "";

          html += `<tr class="${rowClass}">`;

          if (this.showIndex) html += `<td>${serial++}</td>`;

          finalTableHeads.forEach((head) => {
            let mainValue = r[head];
            let fallbackValue = "-";

            if (this.uppercase && (head === NAME || head === NUMBER)) {
              mainValue = mainValue.toUpperCase();
            }

            if (head === SIZE) {
              mainValue = formatSizeForDisplay(mainValue);
            }

            if (head === SLEEVE) {
              fallbackValue = "SHORT";
            }

            if (
              head !== NAME &&
              head !== NUMBER &&
              head !== SLEEVE &&
              head !== SIZE &&
              mainValue === NO
            ) {
              mainValue = "";
            }
            if (
              head !== NAME &&
              head !== NUMBER &&
              head !== SLEEVE &&
              head !== SIZE &&
              mainValue === head
            ) {
              mainValue = YES;
            }

            if (mainValue.length > 12) {
              mainValue = `${mainValue.slice(0, 12)}...`;
            }

            html += `<td>${mainValue || fallbackValue}</td>`;
          });
          html += "</tr>";
        });
    });

    this.validRows
      .filter((r) => !r.VALID)
      .forEach((r) => {
        const reasonHead = r.REASON;

        if (
          (reasonHead as TableBaseHeads | `${OrderKeywords.STRUCTURE}`) ===
          "STRUCTURE"
        ) {
          html += `<tr class="error-row">Invalid Structure</tr>`;
          return;
        }

        html += `<tr class="warn-row">`;

        if (this.showIndex) html += `<td>${serial++}</td>`;

        finalTableHeads.forEach((head) => {
          let mainValue = r[head];
          let fallbackValue = "-";

          if (this.uppercase && (head === NAME || head === NUMBER)) {
            mainValue = mainValue.toUpperCase();
          }

          if (head === SIZE && reasonHead !== SIZE) {
            mainValue = formatSizeForDisplay(mainValue);
          }

          if (head === SLEEVE) {
            fallbackValue = SHORT;
          }

          if (
            head !== NAME &&
            head !== NUMBER &&
            head !== SLEEVE &&
            head !== SIZE &&
            mainValue === NO
          ) {
            mainValue = "";
          }
          if (
            head !== NAME &&
            head !== NUMBER &&
            head !== SLEEVE &&
            head !== SIZE &&
            mainValue === head
          ) {
            mainValue = YES;
          }

          html += `<td class="${head === reasonHead ? "invalid-cell" : ""}">${mainValue || fallbackValue}</td>`;
        });

        html += "</tr>";
      });

    return html + "</tbody></table>";
  }

  /**
   * Generates Raw View detail boxes — one bordered box per size.
   * All players of a size fit in a single box. `data-count` attribute
   * is used by CSS `container` queries to shrink font dynamically.
   * Sizes with zero players are skipped entirely.
   */
  generateDetailBoxes(): string {
    const sizes = sortSizes([
      ...new Set(this.validRows.filter((r) => r.VALID).map((r) => r.SIZE)),
    ]) as SizeKey[];

    if (sizes.length === 0) return "";

    let html =
      '<div class="section-header"><h2>Details List</h2></div><div class="raw-details-grid">';

    sizes.forEach((size) => {
      const players = this.validRows.filter((r) => r.SIZE === size && r.VALID);
      const count = players.length;

      html += `<div class="raw-size-box" data-count="${count}">`;
      html += `<div class="raw-size-label">${formatSizeForDisplay(size)}</div>`;
      html += `<ul class="raw-player-list">`;
      players.forEach((r) => {
        html += `<li>${formatPlayerLabel(r, this.uppercase)}</li>`;
      });
      html += `</ul></div>`;
    });

    html += "</div>";
    return html;
  }
}
