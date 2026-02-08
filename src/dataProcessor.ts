// src/dataProcessor.ts
import {
  AnalysisResult,
  DataForJson,
  OrderKeywords,
  OrderRow,
  RIBKey,
  SIZE_ORDER,
  SummaryData,
} from "./types";
import {
  formatSizeForDisplay,
  parseLine,
  sortSizes,
  validateRow,
} from "./utils";

export class DataProcessor {
  public validRows: OrderRow[] = [];
  public summaryData: Record<string, SummaryData> = {};
  public invalidCount: number = 0;

  processText(text: string): void {
    this.validRows = [];
    this.summaryData = {};
    this.invalidCount = 0;

    text.split("\n").forEach((line) => {
      if (!line.trim()) return;
      const row = parseLine(line);
      const validation = validateRow(row);

      if (!validation.valid) {
        this.invalidCount++;
        this.validRows.push({
          ...row,
          VALID: false,
          REASON: validation.reason,
        });
        return;
      }

      this.validRows.push({ ...row, VALID: true, REASON: validation.reason });

      if (!this.summaryData[row.SIZE]) {
        this.summaryData[row.SIZE] = {
          TOTAL: 0,
          LONG: 0,
          SHORT: 0,
          RIB: 0,
          PANT: 0,
        };
      }

      const { CUFF, LONG, RIB, SHORT } = OrderKeywords;

      this.summaryData[row.SIZE].TOTAL++;
      if (row.SLEEVE === LONG) this.summaryData[row.SIZE].LONG++;
      if (row.SLEEVE === SHORT) this.summaryData[row.SIZE].SHORT++;
      if (row.RIB === CUFF || row.RIB === RIB) this.summaryData[row.SIZE].RIB++;
      if (row.PANT === LONG || row.PANT === SHORT)
        this.summaryData[row.SIZE].PANT++;
    });
  }

  analyzeSummary(): AnalysisResult {
    const { LONG, SHORT, NO } = OrderKeywords;

    const hasItems = {
      NAME: this.validRows.some((r) => r.NAME),
      NUMBER: this.validRows.some((r) => r.NUMBER),
      SIZE: this.validRows.some((r) => r.SIZE),
      SLEEVE: this.validRows.some((r) => r.SLEEVE),
      RIB: this.validRows.some((r) => r.RIB && r.RIB !== NO),
      PANT: this.validRows.some((r) => r.PANT && r.PANT !== NO),
    };

    const getInfo = (types: Set<string>) => {
      if (types.has(LONG) && types.has(SHORT)) return `${LONG} & ${SHORT}`;
      if (types.has(LONG)) return LONG;
      if (types.has(SHORT)) return SHORT;
      if (types.has(OrderKeywords.CUFF)) return OrderKeywords.CUFF;
      if (types.has(OrderKeywords.RIB)) return OrderKeywords.RIB;
      if (types.has(OrderKeywords.RIB) && OrderKeywords.CUFF)
        return `${OrderKeywords.RIB} & ${OrderKeywords.CUFF}`;
      return OrderKeywords.NONE;
    };

    const sleeveTypes = new Set(
      this.validRows.filter((r) => r.VALID && r.SLEEVE).map((r) => r.SLEEVE),
    );
    const ribTypes = new Set(
      this.validRows
        .filter((r) => r.VALID && r.RIB && r.RIB !== NO)
        .map((r) => r.RIB),
    );
    const pantTypes = new Set(
      this.validRows
        .filter((r) => r.VALID && r.PANT && r.PANT !== NO)
        .map((r) => r.PANT),
    );

    return {
      hasItems,
      sleeveInfo: getInfo(sleeveTypes),
      ribInfo: getInfo(ribTypes),
      pantInfo: getInfo(pantTypes),
      hasLongInSummary: Object.values(this.summaryData).some((s) => s.LONG > 0),
      hasShortInSummary: Object.values(this.summaryData).some(
        (s) => s.SHORT > 0,
      ),
      hasRIBInSummary: Object.values(this.summaryData).some((s) => s.RIB > 0),
      hasPantInSummary: Object.values(this.summaryData).some((s) => s.PANT > 0),
    };
  }

  generatePlainText(
    clientName: string,
    clientAddress: string,
    clientContact: string,
    jerseyType: string,
    fabricsType: string,
  ): string {
    const analysis = this.analyzeSummary();
    let text = `Client Name: ${clientName || "_______________"}\nClient Contact: ${clientContact || "_______________"}\nClient Address: ${clientAddress || "_______________"}\nJersey Type: ${jerseyType}\nFabrics: ${fabricsType}\n`;
    text += `Sleeve: ${analysis.sleeveInfo}\nPANT: ${analysis.pantInfo}\n\nSUMMARY:\n========\n`;

    let totalBody = 0,
      totalLong = 0,
      totalShort = 0,
      totalRIB = 0,
      totalPant = 0;

    sortSizes(Object.keys(this.summaryData)).forEach((size) => {
      const s = this.summaryData[size];
      totalBody += s.TOTAL;
      totalLong += s.LONG;
      totalShort += s.SHORT;
      totalRIB += s.RIB;
      totalPant += s.PANT;

      const longSleeveRIB =
        this.validRows
          .filter((r) => r.SLEEVE === "LONG" && r.RIB !== "NO")
          .pop()?.RIB || OrderKeywords.NO;
      const shortSleeveRIB =
        this.validRows
          .filter((r) => r.SLEEVE === "SHORT" && r.RIB !== "NO")
          .pop()?.RIB || OrderKeywords.NO;

      text += `${formatSizeForDisplay(size)}: ${s.TOTAL} pcs`;
      if (analysis.hasLongInSummary && analysis.hasShortInSummary)
        text += ` (LONG = ${s.LONG} [RIB = ${longSleeveRIB}], SHORT = ${s.SHORT}) [RIB = ${shortSleeveRIB}]`;
      else if (analysis.hasLongInSummary)
        text += ` (LONG = ${s.LONG} [RIB = ${longSleeveRIB}])`;
      else if (analysis.hasShortInSummary)
        text += ` (SHORT = ${s.SHORT} [RIB = ${shortSleeveRIB}])`;
      if (analysis.hasPantInSummary) text += ` | PANT = ${s.PANT}`;
      text += "\n";
    });

    text += `\nTOTAL: ${totalBody} pcs`;
    if (analysis.hasLongInSummary && analysis.hasShortInSummary)
      text += ` (LONG = ${totalLong}, SHORT = ${totalShort})`;
    else if (analysis.hasLongInSummary) text += ` (LONG = ${totalLong})`;
    else if (analysis.hasShortInSummary) text += ` (SHORT = ${totalShort})`;
    if (analysis.hasPantInSummary) text += ` | PANT = ${totalPant}`;
    text += "\n\nDETAILS:\n========\n\n";

    sortSizes([
      ...new Set(this.validRows.filter((r) => r.VALID).map((r) => r.SIZE)),
    ]).forEach((size) => {
      text += `${formatSizeForDisplay(size)}:\n`;
      this.validRows
        .filter((r) => r.SIZE === size && r.VALID)
        .forEach((r, idx) => {
          text += `  ${idx + 1}. `;
          if (analysis.hasItems.NAME && r.NAME) text += `${r.NAME} `;
          if (analysis.hasItems.NUMBER && r.NUMBER) text += `[${r.NUMBER}]`;
          text += "\n";
        });
      text += "\n";
    });

    if (this.invalidCount > 0) text += `\nINVALID ROWS: ${this.invalidCount}\n`;
    return text;
  }

  exportToJSON(): string {
    // Create all sizes with empty structure first
    const groupedData = SIZE_ORDER.reduce((acc, size) => {
      acc[size] = {
        SUMMARY: {
          SLEEVE: {
            LONG: { COUNT: 0, RIB: "NO" as RIBKey },
            SHORT: { COUNT: 0, RIB: "NO" as RIBKey },
          },
          PANT: {
            LONG: 0,
            SHORT: 0,
          },
        },
        DATA: [],
      };
      return acc;
    }, {} as DataForJson);

    const filtered = this.validRows.filter((r) => r.VALID);

    filtered.forEach((item) => {
      const { NAME, NUMBER, PANT, RIB, SIZE, SLEEVE } = item;

      // Now it's guaranteed to exist
      const summary = groupedData[SIZE].SUMMARY;
      const data = groupedData[SIZE].DATA;

      // Update sleeve count
      summary.SLEEVE[SLEEVE].COUNT++;

      // If there's a rib, update it (last one wins)
      if (RIB !== "NO") {
        summary.SLEEVE[SLEEVE].RIB = RIB;
      }

      // Update pant count
      if (PANT !== "NO") {
        summary.PANT[PANT]++;
      }

      // Add player data
      data.push({ NAME, NUMBER });
    });

    return JSON.stringify(groupedData, null, 0);
  }
}
