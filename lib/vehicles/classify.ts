import type { ExcelPreviewRow } from "@/lib/excel/types";
import type { ClassifiedSettlementRow, FixedVehicle, VehicleType } from "./types";

const VEHICLE_COLUMN_HINTS = ["차량번호", "차량 번호", "차번", "차량", "vehicle", "car"];
const DRIVER_COLUMN_HINTS = ["기사명", "기사", "운전자", "driver"];
const CENTER_COLUMN_HINTS = ["센터", "센터명", "지점", "center"];
const KOREAN_VEHICLE_NUMBER_PATTERN = /(?:\d{2,3}[가-힣]\d{4}|[가-힣]{2}\d{2}[가-힣]\d{4})/;
const SUMMARY_KEYWORDS = ["합계", "총계", "소계", "누계", "subtotal", "total"];

export function normalizeVehicleNumber(value: unknown) {
  const text = String(value ?? "").toUpperCase();
  const matchedVehicleNumber = text.replace(/[\s\-_.]/g, "").match(KOREAN_VEHICLE_NUMBER_PATTERN);

  return matchedVehicleNumber?.[0] ?? "";
}

export function isValidVehicleNumber(value: unknown) {
  return normalizeVehicleNumber(value) !== "";
}

export function isSummaryRow(row: ExcelPreviewRow) {
  return Object.values(row).some((value) => {
    const text = String(value ?? "").trim().toLowerCase();
    return SUMMARY_KEYWORDS.some((keyword) => text === keyword || text.includes(keyword));
  });
}

function findColumn(columns: string[], hints: string[]) {
  return columns.find((column) => {
    const normalizedColumn = column.toLowerCase().replace(/\s/g, "");
    return hints.some((hint) => normalizedColumn.includes(hint.toLowerCase().replace(/\s/g, "")));
  });
}

function findVehicleNumber(row: ExcelPreviewRow) {
  const columns = Object.keys(row);
  const vehicleColumn = findColumn(columns, VEHICLE_COLUMN_HINTS);

  if (vehicleColumn) {
    const columnValue = String(row[vehicleColumn] ?? "").trim();
    return isValidVehicleNumber(columnValue) ? columnValue : "";
  }

  const fallback = Object.values(row).find((value) => isValidVehicleNumber(value));

  return fallback ? String(fallback).trim() : "";
}

function findOptionalValue(row: ExcelPreviewRow, hints: string[]) {
  const column = findColumn(Object.keys(row), hints);
  return column ? String(row[column] ?? "").trim() : undefined;
}

export function getVehicleType(vehicleNumber: unknown, fixedVehicles: FixedVehicle[]): VehicleType {
  const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);

  if (!normalizedVehicleNumber) {
    return "temporary";
  }

  return fixedVehicles.some((vehicle) => normalizeVehicleNumber(vehicle.vehicleNumber) === normalizedVehicleNumber)
    ? "fixed"
    : "temporary";
}

export function classifySettlementRows(
  sheets: { sheetName: string; rows: ExcelPreviewRow[] }[],
  fixedVehicles: FixedVehicle[],
): ClassifiedSettlementRow[] {
  return sheets.flatMap((sheet) =>
    sheet.rows
      .filter((row) => !isSummaryRow(row))
      .map((row, rowIndex) => {
        const vehicleNumber = findVehicleNumber(row);
        const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);
        const matchedVehicle = fixedVehicles.find(
          (vehicle) => normalizeVehicleNumber(vehicle.vehicleNumber) === normalizedVehicleNumber,
        );

        return {
          id: `${sheet.sheetName}-${rowIndex}`,
          sheetName: sheet.sheetName,
          rowIndex: rowIndex + 1,
          vehicleNumber,
          driverName: matchedVehicle?.driverName || findOptionalValue(row, DRIVER_COLUMN_HINTS),
          centerName: matchedVehicle?.centerName || findOptionalValue(row, CENTER_COLUMN_HINTS),
          vehicleType: matchedVehicle ? "fixed" : "temporary",
          matchedVehicle,
          data: row,
        } satisfies ClassifiedSettlementRow;
      }),
  );
}
