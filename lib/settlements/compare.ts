import type { ExcelCellValue, ExcelPreviewRow, ParsedExcelWorkbook } from "@/lib/excel/types";
import { isSummaryRow, isValidVehicleNumber, normalizeVehicleNumber } from "@/lib/vehicles/classify";
import type { ColumnMapping } from "./convert";

export type SettlementCompareSource = "billing" | "payment";

export type NormalizedSettlementRow = {
  id: string;
  source: SettlementCompareSource;
  sheetName: string;
  rowIndex: number;
  vehicleNumber: string;
  normalizedVehicleNumber: string;
  driverName?: string;
  centerName?: string;
  amount: number;
  rawAmount: ExcelCellValue | string;
  rawData: ExcelPreviewRow;
};

export type VehicleComparison = {
  normalizedVehicleNumber: string;
  vehicleNumber: string;
  billingAmount: number;
  paymentAmount: number;
  differenceAmount: number;
  billingRows: NormalizedSettlementRow[];
  paymentRows: NormalizedSettlementRow[];
};

export type DuplicateVehicleGroup = {
  source: SettlementCompareSource;
  vehicleNumber: string;
  normalizedVehicleNumber: string;
  rows: NormalizedSettlementRow[];
  totalAmount: number;
};

export type SettlementComparisonResult = {
  summary: {
    billingVehicleCount: number;
    paymentVehicleCount: number;
    billingTotalAmount: number;
    paymentTotalAmount: number;
    differenceTotalAmount: number;
    missingPaymentCount: number;
    missingBillingCount: number;
    amountDifferenceCount: number;
    duplicateGroupCount: number;
  };
  matched: VehicleComparison[];
  missingInPayment: VehicleComparison[];
  missingInBilling: VehicleComparison[];
  amountDifferences: VehicleComparison[];
  duplicates: DuplicateVehicleGroup[];
};

function getMappedValue(row: ExcelPreviewRow, columnName?: string) {
  if (!columnName) return "";
  return row[columnName] ?? "";
}

export function parseAmount(value: unknown) {
  if (typeof value === "number") return value;

  const normalizedValue = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[원\s]/g, "")
    .trim();

  if (!normalizedValue) return 0;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatVehicleNumber(value: unknown) {
  return String(value ?? "").trim();
}

function groupByVehicle(rows: NormalizedSettlementRow[]) {
  return rows.reduce<Map<string, NormalizedSettlementRow[]>>((map, row) => {
    if (!row.normalizedVehicleNumber) return map;

    const currentRows = map.get(row.normalizedVehicleNumber) ?? [];
    currentRows.push(row);
    map.set(row.normalizedVehicleNumber, currentRows);

    return map;
  }, new Map());
}

function sumAmount(rows: NormalizedSettlementRow[]) {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

function firstVehicleNumber(rows: NormalizedSettlementRow[], fallback: string) {
  return rows.find((row) => row.vehicleNumber)?.vehicleNumber ?? fallback;
}

export function extractComparableRows(
  workbook: ParsedExcelWorkbook,
  source: SettlementCompareSource,
  mapping: ColumnMapping,
  sheetName = "__all__",
): NormalizedSettlementRow[] {
  const amountColumn = source === "billing" ? mapping.billingAmount : mapping.paymentAmount;
  const targetSheets = sheetName === "__all__" ? workbook.sheets : workbook.sheets.filter((sheet) => sheet.sheetName === sheetName);

  return targetSheets.flatMap((sheet) =>
    sheet.rows
      .filter((row) => !isSummaryRow(row))
      .map((row, rowIndex) => {
        const vehicleNumber = formatVehicleNumber(getMappedValue(row, mapping.vehicleNumber));
        const rawAmount = getMappedValue(row, amountColumn);

        return {
          id: `${source}-${sheet.sheetName}-${rowIndex}`,
          source,
          sheetName: sheet.sheetName,
          rowIndex: rowIndex + 1,
          vehicleNumber,
          normalizedVehicleNumber: normalizeVehicleNumber(vehicleNumber),
          driverName: formatVehicleNumber(getMappedValue(row, mapping.driverName)) || undefined,
          centerName: formatVehicleNumber(getMappedValue(row, mapping.centerName)) || undefined,
          amount: parseAmount(rawAmount),
          rawAmount,
          rawData: row,
        } satisfies NormalizedSettlementRow;
      })
      .filter((row) => isValidVehicleNumber(row.vehicleNumber)),
  );
}

export function compareSettlementRows(
  billingRows: NormalizedSettlementRow[],
  paymentRows: NormalizedSettlementRow[],
): SettlementComparisonResult {
  const billingGroups = groupByVehicle(billingRows);
  const paymentGroups = groupByVehicle(paymentRows);
  const vehicleKeys = Array.from(new Set([...billingGroups.keys(), ...paymentGroups.keys()])).sort();

  const matched: VehicleComparison[] = [];
  const missingInPayment: VehicleComparison[] = [];
  const missingInBilling: VehicleComparison[] = [];
  const amountDifferences: VehicleComparison[] = [];

  vehicleKeys.forEach((vehicleKey) => {
    const vehicleBillingRows = billingGroups.get(vehicleKey) ?? [];
    const vehiclePaymentRows = paymentGroups.get(vehicleKey) ?? [];
    const billingAmount = sumAmount(vehicleBillingRows);
    const paymentAmount = sumAmount(vehiclePaymentRows);
    const comparison: VehicleComparison = {
      normalizedVehicleNumber: vehicleKey,
      vehicleNumber: firstVehicleNumber([...vehicleBillingRows, ...vehiclePaymentRows], vehicleKey),
      billingAmount,
      paymentAmount,
      differenceAmount: billingAmount - paymentAmount,
      billingRows: vehicleBillingRows,
      paymentRows: vehiclePaymentRows,
    };

    if (vehicleBillingRows.length === 0) {
      missingInBilling.push(comparison);
    } else if (vehiclePaymentRows.length === 0) {
      missingInPayment.push(comparison);
    } else {
      matched.push(comparison);

      if (comparison.differenceAmount !== 0) {
        amountDifferences.push(comparison);
      }
    }
  });

  const duplicates: DuplicateVehicleGroup[] = [
    ...Array.from(billingGroups.entries()).map(([vehicleKey, rows]) => ({ vehicleKey, rows, source: "billing" as const })),
    ...Array.from(paymentGroups.entries()).map(([vehicleKey, rows]) => ({ vehicleKey, rows, source: "payment" as const })),
  ]
    .filter((group) => group.rows.length > 1)
    .map((group) => ({
      source: group.source,
      vehicleNumber: firstVehicleNumber(group.rows, group.vehicleKey),
      normalizedVehicleNumber: group.vehicleKey,
      rows: group.rows,
      totalAmount: sumAmount(group.rows),
    }));

  const billingTotalAmount = sumAmount(billingRows);
  const paymentTotalAmount = sumAmount(paymentRows);

  return {
    summary: {
      billingVehicleCount: billingGroups.size,
      paymentVehicleCount: paymentGroups.size,
      billingTotalAmount,
      paymentTotalAmount,
      differenceTotalAmount: billingTotalAmount - paymentTotalAmount,
      missingPaymentCount: missingInPayment.length,
      missingBillingCount: missingInBilling.length,
      amountDifferenceCount: amountDifferences.length,
      duplicateGroupCount: duplicates.length,
    },
    matched,
    missingInPayment,
    missingInBilling,
    amountDifferences,
    duplicates,
  };
}
