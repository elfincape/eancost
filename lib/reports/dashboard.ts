import type { ExcelPreviewRow, ParsedExcelWorkbook } from "@/lib/excel/types";
import { parseAmount } from "@/lib/settlements/compare";
import { type ColumnMapping } from "@/lib/settlements/convert";
import { classifySettlementRows, normalizeVehicleNumber } from "@/lib/vehicles/classify";
import type { FixedVehicle, VehicleType } from "@/lib/vehicles/types";

export const REPORT_CENTERS = ["안산", "평택", "양산", "김해"] as const;

export type ReportCenterName = (typeof REPORT_CENTERS)[number];

export type ReportFilters = {
  settlementMonth: string;
  centerName: "all" | ReportCenterName;
  vehicleType: "all" | VehicleType;
};

export type ReportRow = {
  id: string;
  centerName: ReportCenterName | "미지정";
  vehicleNumber: string;
  normalizedVehicleNumber: string;
  vehicleType: VehicleType;
  billingAmount: number;
  paymentAmount: number;
  differenceAmount: number;
  operationDate?: string;
  weekLabel: string;
  rawData: ExcelPreviewRow;
};

export type CenterReportSummary = {
  centerName: ReportCenterName;
  totalVehicleCount: number;
  fixedVehicleCount: number;
  temporaryVehicleCount: number;
  billingTotalAmount: number;
  paymentTotalAmount: number;
  differenceAmount: number;
};

export type WeeklyTrendPoint = {
  weekLabel: string;
  billingAmount: number;
  paymentAmount: number;
  differenceAmount: number;
};

function toDisplayCenterName(value?: string): ReportCenterName | "미지정" {
  const center = REPORT_CENTERS.find((item) => item === value);
  return center ?? "미지정";
}

function getValue(row: ExcelPreviewRow, columnName?: string) {
  if (!columnName) return "";
  return row[columnName] ?? "";
}

function toDateText(value: unknown) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return undefined;

  const date = new Date(rawValue);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  const compactDate = rawValue.match(/(\d{4})[.\-/년\s]?(\d{1,2})[.\-/월\s]?(\d{1,2})/);
  if (!compactDate) return rawValue;

  const [, year, month, day] = compactDate;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getWeekLabel(operationDate?: string) {
  if (!operationDate) return "날짜 없음";

  const date = new Date(operationDate);
  if (Number.isNaN(date.getTime())) return "날짜 없음";

  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")} ${weekOfMonth}주차`;
}

function matchesFilters(row: ReportRow, filters: ReportFilters) {
  const monthMatched = !filters.settlementMonth || row.operationDate?.startsWith(filters.settlementMonth);
  const centerMatched = filters.centerName === "all" || row.centerName === filters.centerName;
  const typeMatched = filters.vehicleType === "all" || row.vehicleType === filters.vehicleType;

  return monthMatched && centerMatched && typeMatched;
}

export function createReportRows(workbook: ParsedExcelWorkbook | null, fixedVehicles: FixedVehicle[], mapping: ColumnMapping): ReportRow[] {
  if (!workbook) return [];

  return classifySettlementRows(workbook.sheets, fixedVehicles).map((row) => {
    const billingAmount = parseAmount(getValue(row.data, mapping.billingAmount));
    const paymentAmount = parseAmount(getValue(row.data, mapping.paymentAmount));
    const operationDate = toDateText(getValue(row.data, mapping.operationDate));
    const normalizedVehicleNumber = normalizeVehicleNumber(row.vehicleNumber);

    return {
      id: row.id,
      centerName: toDisplayCenterName(row.centerName),
      vehicleNumber: row.vehicleNumber,
      normalizedVehicleNumber,
      vehicleType: row.vehicleType,
      billingAmount,
      paymentAmount,
      differenceAmount: billingAmount - paymentAmount,
      operationDate,
      weekLabel: getWeekLabel(operationDate),
      rawData: row.data,
    } satisfies ReportRow;
  });
}

export function createCenterSummaries(rows: ReportRow[], filters: ReportFilters): CenterReportSummary[] {
  const filteredRows = rows.filter((row) => matchesFilters(row, filters));

  return REPORT_CENTERS.map((centerName) => {
    const centerRows = filteredRows.filter((row) => row.centerName === centerName);
    const vehicleNumbers = new Set(centerRows.map((row) => row.normalizedVehicleNumber).filter(Boolean));
    const fixedVehicles = new Set(centerRows.filter((row) => row.vehicleType === "fixed").map((row) => row.normalizedVehicleNumber).filter(Boolean));
    const temporaryVehicles = new Set(centerRows.filter((row) => row.vehicleType === "temporary").map((row) => row.normalizedVehicleNumber).filter(Boolean));
    const billingTotalAmount = centerRows.reduce((sum, row) => sum + row.billingAmount, 0);
    const paymentTotalAmount = centerRows.reduce((sum, row) => sum + row.paymentAmount, 0);

    return {
      centerName,
      totalVehicleCount: vehicleNumbers.size,
      fixedVehicleCount: fixedVehicles.size,
      temporaryVehicleCount: temporaryVehicles.size,
      billingTotalAmount,
      paymentTotalAmount,
      differenceAmount: billingTotalAmount - paymentTotalAmount,
    } satisfies CenterReportSummary;
  });
}

export function createWeeklyTrend(rows: ReportRow[], filters: ReportFilters): WeeklyTrendPoint[] {
  const weekMap = rows.filter((row) => matchesFilters(row, filters)).reduce<Map<string, WeeklyTrendPoint>>((map, row) => {
    const current = map.get(row.weekLabel) ?? {
      weekLabel: row.weekLabel,
      billingAmount: 0,
      paymentAmount: 0,
      differenceAmount: 0,
    };

    current.billingAmount += row.billingAmount;
    current.paymentAmount += row.paymentAmount;
    current.differenceAmount = current.billingAmount - current.paymentAmount;
    map.set(row.weekLabel, current);

    return map;
  }, new Map());

  return Array.from(weekMap.values()).sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));
}

export function createVehicleTypeRatio(rows: ReportRow[], filters: ReportFilters) {
  const filteredRows = rows.filter((row) => matchesFilters(row, filters));
  const fixedVehicles = new Set(filteredRows.filter((row) => row.vehicleType === "fixed").map((row) => row.normalizedVehicleNumber).filter(Boolean));
  const temporaryVehicles = new Set(filteredRows.filter((row) => row.vehicleType === "temporary").map((row) => row.normalizedVehicleNumber).filter(Boolean));

  return [
    { name: "고정차", value: fixedVehicles.size, fill: "#2563eb" },
    { name: "임시차", value: temporaryVehicles.size, fill: "#f59e0b" },
  ];
}
