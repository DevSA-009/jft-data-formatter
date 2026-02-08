// src/app.ts
import { ColumnResizer } from "./columnResizer";
import { DataProcessor } from "./dataProcessor";
import { HTMLGenerator } from "./htmlGenerator";
import { ImageHandler } from "./imageHandler";
import { STORAGE_KEYS } from "./types";
import { getElement, showToast } from "./utils";

export class OrderFormatterApp {
  private dp = new DataProcessor();
  private ih = new ImageHandler();
  private cr = new ColumnResizer();
  private showIndex = false;

  initialize(): void {
    this.loadSavedData();
    this.attachEventListeners();
    showToast("Ready", "info");
  }

  private loadSavedData(): void {
    const data = localStorage.getItem(STORAGE_KEYS.ORDER_DATA);
    const ta = getElement<HTMLTextAreaElement>("inputText");
    if (data && ta) ta.value = data;
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
    attach("printBtnOutput", "click", () => window.print());
    attach("showIndexCheckbox", "change", (e) => {
      this.showIndex = e.target.checked;
      this.regenerateOutput();
    });

    document.addEventListener("paste", (e) => this.ih.handlePaste(e));
    document.addEventListener("keydown", (e) =>
      this.handleKeyboardShortcuts(e),
    );
  }

  private formatOrders(): void {
    const ta = getElement<HTMLTextAreaElement>("inputText");
    const clientAddress = getElement<HTMLInputElement>("clientAddress");
    const clientContact = getElement<HTMLInputElement>("clientContact");
    const clientName = getElement<HTMLInputElement>("clientName");
    const jt = getElement<HTMLSelectElement>("jerseyType");
    const ft = getElement<HTMLSelectElement>("fabricsType");
    const fr = document.querySelector<HTMLInputElement>(
      'input[name="format"]:checked',
    );

    if (!ta || !fr) return;

    this.dp.processText(ta.value);
    if (this.dp.validRows.length === 0) {
      showToast("No data", "error");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.ORDER_DATA, ta.value);
    const analysis = this.dp.analyzeSummary();
    const out = getElement("output");
    if (!out) return;

    const gen = new HTMLGenerator(
      this.dp.validRows,
      this.dp.summaryData,
      this.dp.invalidCount,
      this.showIndex,
    );
    const cName = clientName?.value || "",
      cAddress = clientAddress?.value || "",
      cContact = clientContact?.value || "",
      jType = jt?.value || "POLO",
      fType = ft?.value || "PP";

    out.innerHTML =
      gen.generateTopInfo(
        cName,
        cAddress,
        cContact,
        jType,
        fType,
        analysis,
        this.ih.image,
      ) + gen.generateDetailTable(analysis);

    const ip = getElement("inputPage"),
      op = getElement("outputPage");
    if (ip) ip.style.display = "none";
    if (op) op.style.display = "block";

    showToast("Formatted", "success");
    this.cr.initializeResizing();
    this.actionBtnDisable();
  }

  private regenerateOutput(): void {
    const clientAddress = getElement<HTMLInputElement>("clientAddress");
    const clientContact = getElement<HTMLInputElement>("clientContact");
    const clientName = getElement<HTMLInputElement>("clientName");
    const jt = getElement<HTMLSelectElement>("jerseyType");
    const ft = getElement<HTMLSelectElement>("fabricsType");
    const out = getElement("output");
    if (!out) return;

    const analysis = this.dp.analyzeSummary();
    const gen = new HTMLGenerator(
      this.dp.validRows,
      this.dp.summaryData,
      this.dp.invalidCount,
      this.showIndex,
    );
    const cName = clientName?.value || "",
      cAddress = clientAddress?.value || "",
      cContact = clientContact?.value || "",
      jType = jt?.value || "POLO",
      fType = ft?.value || "PP";

    out.innerHTML =
      gen.generateTopInfo(
        cName,
        cAddress,
        cContact,
        jType,
        fType,
        analysis,
        this.ih.image,
      ) + gen.generateDetailTable(analysis);

    this.cr.initializeResizing();
  }

  private goBackToInput(): void {
    const ip = getElement("inputPage"),
      op = getElement("outputPage");
    if (ip) ip.style.display = "block";
    if (op) op.style.display = "none";
  }

  private copyAsPlainText(): void {
    const clientAddress = getElement<HTMLInputElement>("clientAddress");
    const clientContact = getElement<HTMLInputElement>("clientContact");
    const clientName = getElement<HTMLInputElement>("clientName");
    const jt = getElement<HTMLSelectElement>("jerseyType");
    const ft = getElement<HTMLSelectElement>("fabricsType");
    const text = this.dp.generatePlainText(
      clientName?.value || "",
      clientAddress?.value || "",
      clientContact?.value || "",
      jt?.value || "POLO",
      ft?.value || "PP",
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
    navigator.clipboard
      .writeText(this.dp.exportToJSON())
      .then(() => showToast("JSON copied", "success"))
      .catch(() => showToast("Failed", "error"));
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
      window.print();
    }
  }
}
