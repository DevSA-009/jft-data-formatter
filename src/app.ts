// src/app.ts
import { ColumnResizer } from "./columnResizer";
import { DataProcessor } from "./dataProcessor";
import { HTMLGenerator } from "./htmlGenerator";
import { ImageHandler } from "./imageHandler";
import { JerseyType, OrderKeywords, STORAGE_KEYS } from "./types";
import { getElement, showToast } from "./utils";

export class OrderFormatterApp {
  private dp = new DataProcessor();
  private ih = new ImageHandler();
  private cr = new ColumnResizer();
  private showIndex = false;
  private uppercase = false;

  initialize(): void {
    this.loadSavedData();
    this.attachEventListeners();
    showToast("Ready", "info");
  }

  private loadSavedData(): void {
    const data = localStorage.getItem(STORAGE_KEYS.ORDER_DATA);
    const ta = getElement<HTMLTextAreaElement>("inputText");
    if (data && ta) ta.value = data;

    const savedFormat = localStorage.getItem(STORAGE_KEYS.FORMAT);
    if (savedFormat) {
      const radio = document.querySelector<HTMLInputElement>(
        `input[name="format"][value="${savedFormat}"]`,
      );
      if (radio) radio.checked = true;
    }
  }

  private actionBtnDisable(): void {
    const disable = (id: string, action: boolean) =>
      ((getElement(id) as HTMLButtonElement).disabled = action);
    disable("copyPlainBtn", !!this.dp.invalidCount);
    disable("copyBtnOutput", !!this.dp.invalidCount);
    disable("printBtnOutput", !!this.dp.invalidCount);
  }

  private attachEventListeners(): void {
    const attach = (id: string, event: string, handler: (e?: any) => void) => {
      const el = getElement(id);
      if (el) el.addEventListener(event, handler);
    };

    attach("imageInput", "change", (e) => this.ih.handleUpload(e));
    attach("imageSelectBtn", "click", () => this.ih.openSelector());
    attach("removeImageBtn", "click", () => this.ih.remove());
    attach("formatBtn", "click", () => this.formatOrders());
    attach("backBtn", "click", () => this.goBackToInput());
    attach("copyPlainBtn", "click", () => this.copyAsPlainText());
    attach("copyBtnOutput", "click", () => this.copyAsJSON());
    attach("printBtnOutput", "click", () => this.printOutput());
    attach("showIndexCheckbox", "change", (e) => {
      this.showIndex = e.target.checked;
      this.regenerateOutput();
    });
    attach("uppercaseCheckbox", "change", (e) => {
      this.uppercase = e.target.checked;
      this.regenerateOutput();
    });

    document
      .querySelectorAll<HTMLInputElement>('input[name="format"]')
      .forEach((r) =>
        r.addEventListener("change", () =>
          localStorage.setItem(STORAGE_KEYS.FORMAT, r.value),
        ),
      );

    document.addEventListener("paste", (e) => this.ih.handlePaste(e));
    document.addEventListener("keydown", (e) =>
      this.handleKeyboardShortcuts(e),
    );
  }

  /** Returns `true` when the user has selected the Raw View radio. */
  private isRawView(): boolean {
    const fr = document.querySelector<HTMLInputElement>(
      'input[name="format"]:checked',
    );
    return fr?.value === "raw";
  }

  /**
   * Builds the output HTML string from generator methods.
   * Raw View uses `generateDetailBoxes()`; all other formats use the
   * standard `generateDetailTable()`.
   */
  private buildOutput(
    gen: HTMLGenerator,
    cName: string,
    cAddress: string,
    cContact: string,
    jType: string,
    fType: string,
    analysis: ReturnType<DataProcessor["analyzeSummary"]>,
    raw: boolean,
  ): string {
    const topInfo = gen.generateTopInfo(
      cName,
      cAddress,
      cContact,
      jType,
      fType,
      analysis,
      this.ih.image,
    );
    const details = raw
      ? gen.generateDetailBoxes()
      : gen.generateDetailTable(analysis);
    return topInfo + details;
  }

  private formatOrders(): void {
    const ta = getElement<HTMLTextAreaElement>("inputText");
    if (!ta) return;

    this.dp.processText(ta.value);
    if (this.dp.validRows.length === 0) {
      showToast("No data", "error");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.ORDER_DATA, ta.value);

    const out = getElement("output");
    if (!out) return;

    const analysis = this.dp.analyzeSummary();
    const gen = new HTMLGenerator(
      this.dp.validRows,
      this.dp.summaryData,
      this.dp.invalidCount,
      this.showIndex,
      this.uppercase,
    );

    const cName = getElement<HTMLInputElement>("clientName")?.value || "";
    const cAddress = getElement<HTMLInputElement>("clientAddress")?.value || "";
    const cContact = getElement<HTMLInputElement>("clientContact")?.value || "";
    const jType = getElement<HTMLSelectElement>("jerseyType")?.value || "POLO";
    const fType = getElement<HTMLSelectElement>("fabricsType")?.value || "PP";

    const raw = this.isRawView();
    out.innerHTML = this.buildOutput(
      gen,
      cName,
      cAddress,
      cContact,
      jType,
      fType,
      analysis,
      raw,
    );

    // Toggle raw-view class on output so print CSS can scope @page portrait
    out.classList.toggle("raw-view", raw);

    const ip = getElement("inputPage"),
      op = getElement("outputPage");
    if (ip) ip.style.display = "none";
    if (op) op.style.display = "block";

    showToast("Formatted", "success");
    this.cr.initializeResizing();
    this.actionBtnDisable();
    if (raw) requestAnimationFrame(() => this.adjustRawBoxHeights());
  }

  private regenerateOutput(): void {
    const out = getElement("output");
    if (!out) return;

    const analysis = this.dp.analyzeSummary();
    const gen = new HTMLGenerator(
      this.dp.validRows,
      this.dp.summaryData,
      this.dp.invalidCount,
      this.showIndex,
      this.uppercase,
    );

    const cName = getElement<HTMLInputElement>("clientName")?.value || "";
    const cAddress = getElement<HTMLInputElement>("clientAddress")?.value || "";
    const cContact = getElement<HTMLInputElement>("clientContact")?.value || "";
    const jType = getElement<HTMLSelectElement>("jerseyType")?.value || "POLO";
    const fType = getElement<HTMLSelectElement>("fabricsType")?.value || "PP";

    const raw = this.isRawView();
    out.innerHTML = this.buildOutput(
      gen,
      cName,
      cAddress,
      cContact,
      jType,
      fType,
      analysis,
      raw,
    );
    out.classList.toggle("raw-view", raw);

    this.cr.initializeResizing();
    if (raw) requestAnimationFrame(() => this.adjustRawBoxHeights());
  }

  private goBackToInput(): void {
    const ip = getElement("inputPage"),
      op = getElement("outputPage");
    if (ip) ip.style.display = "block";
    if (op) op.style.display = "none";
  }

  private copyAsPlainText(): void {
    const text = this.dp.generatePlainText(
      getElement<HTMLInputElement>("clientName")?.value || "",
      getElement<HTMLInputElement>("clientAddress")?.value || "",
      getElement<HTMLInputElement>("clientContact")?.value || "",
      getElement<HTMLSelectElement>("jerseyType")?.value || OrderKeywords.POLO,
      getElement<HTMLSelectElement>("fabricsType")?.value || "PP",
      this.uppercase,
    );
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Plain text copied", "success"))
      .catch(() => showToast("Failed", "error"));
  }

  private copyAsJSON(): void {
    if (this.dp.validRows.filter((r) => r.VALID).length === 0) {
      showToast("No valid data", "error");
      return;
    }
    const jt = (getElement<HTMLSelectElement>("jerseyType")?.value ||
      OrderKeywords.POLO) as JerseyType;
    navigator.clipboard
      .writeText(this.dp.exportToJSON(jt, this.uppercase))
      .then(() => showToast("JSON copied", "success"))
      .catch(() => showToast("Failed", "error"));
  }

  /**
   * Handles printing. When Raw View is active, injects a temporary `<style>`
   * that overrides `@page` to A4 portrait, adds `print-raw` to `<body>`,
   * then cleans up after the print dialog closes.
   */
  /**
   * After raw-view renders, equalises box heights row-by-row so all rows
   * together fill the remaining page height below the top-info-grid.
   * Works with the 3-column grid applied by the ≤2480 px media query.
   */
  private adjustRawBoxHeights(): void {
    const out = getElement("output");
    if (!out || !out.classList.contains("raw-view")) return;

    const grid = out.querySelector<HTMLElement>(".raw-details-grid");
    if (!grid) return;

    const boxes = Array.from(
      grid.querySelectorAll<HTMLElement>(".raw-size-box"),
    );
    if (boxes.length === 0) return;

    // Reset any previously-set heights so we can measure natural sizes
    boxes.forEach((b) => (b.style.height = ""));

    const COLS = 3;
    const rows: HTMLElement[][] = [];
    for (let i = 0; i < boxes.length; i += COLS) {
      rows.push(boxes.slice(i, i + COLS));
    }

    // Available height = output container height minus everything above grid
    const outRect = out.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const gapPx = parseFloat(getComputedStyle(grid).rowGap) || 10;

    const availableH =
      outRect.bottom - gridRect.top - gapPx * (rows.length - 1);

    // Natural row heights — tallest box in each row
    const naturalHeights = rows.map((row) =>
      Math.max(...row.map((b) => b.getBoundingClientRect().height)),
    );
    const totalNatural = naturalHeights.reduce((a, b) => a + b, 0);

    // Distribute available height proportionally to natural height
    rows.forEach((row, ri) => {
      const rowH = (naturalHeights[ri] / totalNatural) * availableH;
      row.forEach((b) => (b.style.height = `${Math.floor(rowH)}px`));
    });
  }

  private printOutput(): void {
    const raw = this.isRawView();
    let styleEl: HTMLStyleElement | null = null;

    if (raw) {
      document.body.classList.add("print-raw");
      styleEl = document.createElement("style");
      styleEl.id = "__raw-page-style";
      styleEl.textContent =
        "@media print { @page { size: A4 portrait; margin: 0; padding: 7mm; } }";
      document.head.appendChild(styleEl);
    }

    window.print();

    // Clean up after print dialog
    if (raw) {
      document.body.classList.remove("print-raw");
      styleEl?.remove();
    }
  }

  private handleKeyboardShortcuts(e: KeyboardEvent): void {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    const ip = getElement("inputPage"),
      op = getElement("outputPage");

    if (key === "i") {
      e.preventDefault();
      this.ih.openSelector();
    } else if (key === "f" && ip?.style.display !== "none") {
      e.preventDefault();
      this.formatOrders();
    } else if (key === "c" && op?.style.display !== "none") {
      e.preventDefault();
      this.copyAsJSON();
    } else if (key === "p" && op?.style.display !== "none") {
      e.preventDefault();
      this.printOutput();
    }
  }
}
