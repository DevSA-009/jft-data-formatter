// src/types.ts - Type definitions
import placeHolderImg from "@assets/img_place_holder_1.svg";

export enum OrderKeywords {
  NAME = "NAME",
  NUMBER = "NUMBER",
  SIZE = "SIZE",
  SLEEVE = "SLEEVE",
  LONG = "LONG",
  SHORT = "SHORT",
  PANT = "PANT",
  RIB = "RIB",
  CUFF = "CUFF",
  YES = "YES",
  NO = "NO",
  NONE = "None",
  TOTAL = "TOTAL",
  QTY = "QUANTITY",
  STRUCTURE = "STRUCTURE",
}

export const TableBaseHeads = [
  `${OrderKeywords.NAME}`,
  `${OrderKeywords.NUMBER}`,
  `${OrderKeywords.SIZE}`,
  `${OrderKeywords.SLEEVE}`,
  `${OrderKeywords.RIB}`,
  `${OrderKeywords.PANT}`,
] as const;

export const SummaryTableHeads = [
  `${OrderKeywords.TOTAL}`,
  `${OrderKeywords.LONG}`,
  `${OrderKeywords.SHORT}`,
  `${OrderKeywords.RIB}`,
  `${OrderKeywords.PANT}`,
] as const;

export type TableBaseHeads = {
  NAME: string;
  NUMBER: string;
  SIZE: (typeof SIZE_ORDER)[number];
  SLEEVE: `${OrderKeywords.SHORT}` | `${OrderKeywords.LONG}`;
  RIB: `${OrderKeywords.NO}` | `${OrderKeywords.CUFF}` | `${OrderKeywords.RIB}`;
  PANT:
    | `${OrderKeywords.SHORT}`
    | `${OrderKeywords.LONG}`
    | `${OrderKeywords.NO}`;
};

export interface OrderRow extends TableBaseHeads {
  VALID: boolean;
  REASON?: keyof TableBaseHeads;
}

export interface SummaryData {
  TOTAL: number;
  LONG: number;
  SHORT: number;
  RIB: number;
  PANT: number;
}

export interface AnalysisResult {
  hasItems: Record<keyof TableBaseHeads, boolean>;
  sleeveInfo: string;
  ribInfo: string;
  pantInfo: string;
  hasLongInSummary: boolean;
  hasRIBInSummary: boolean;
  hasShortInSummary: boolean;
  hasPantInSummary: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: keyof TableBaseHeads;
}

export type FormatType = "format1" | "format2";

export type ToastType = "info" | "success" | "error";

export const SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
] as const;

export const STORAGE_KEYS = {
  FORMAT: "order_formatter_last_format",
  ORDER_DATA: "order_formatter_last_data",
} as const;

export const PLACEHOLDER_IMAGE = placeHolderImg;
