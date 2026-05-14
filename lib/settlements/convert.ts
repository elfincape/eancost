import type { ExcelCellValue, ExcelPreviewRow, ParsedExcelWorkbook } from "@/lib/excel/types";
import { classifySettlementRows } from "@/lib/vehicles/classify";
import type { FixedVehicle } from "@/lib/vehicles/types";

export const STANDARD_SETTLEMENT_COLUMNS = [
  { key: "vehicleNumber", label: "차량번호", required: true, hints: ["차량번호", "차량 번호", "차번", "차량"] },
  { key: "driverName", label: "기사명", required: false, hints: ["기사명", "기사", "운전자"] },
  { key: "centerName", label: "센터", required: false, hints: ["센터", "센터명", "지점"] },
  { key: "operationDate", label: "운행일자", required: false, hints: ["운행일자", "운행 일자", "일자", "날짜", "date"] },
  { key: "billingAmount", label: "청구금액", required: false, hints: ["청구금액", "청구 금액", "청구액", "billing"] },
  { key: "paymentAmount", label: "지급금액", required: false, hints: ["지급금액", "지급 금액", "지급액", "용역료", "payment"] },
  { key: "memo", label: "비고", required: false, hints: ["비고", "메모", "내용", "remark", "memo"] },
] as const;

export type StandardSettlementColumnKey = (typeof STANDARD_SETTLEMENT_COLUMNS)[number]["key"];

export type ColumnMapping = Partial<Record<StandardSettlementColumnKey, string>>;

export type ConvertedSettlementRow = Record<StandardSettlementColumnKey, ExcelCellValue | string>;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\s_\-.]/g, "");
}

export function suggestColumnMapping(columns: string[]): ColumnMapping {
  return STANDARD_SETTLEMENT_COLUMNS.reduce<ColumnMapping>((mapping, standardColumn) => {
    const matchedColumn = columns.find((column) => {
      const normalizedColumn = normalizeText(column);
      return standardColumn.hints.some((hint) => normalizedColumn.includes(normalizeText(hint)));
    });

    if (matchedColumn) {
      mapping[standardColumn.key] = matchedColumn;
    }

    return mapping;
  }, {});
}

export function getWorkbookColumns(workbook: ParsedExcelWorkbook | null, sheetName: string) {
  if (!workbook) return [];

  const sheets = sheetName === "__all__" ? workbook.sheets : workbook.sheets.filter((sheet) => sheet.sheetName === sheetName);
  return Array.from(new Set(sheets.flatMap((sheet) => sheet.columns)));
}

function getMappedValue(row: ExcelPreviewRow, columnName?: string) {
  if (!columnName) return "";
  return row[columnName] ?? "";
}

export function convertFixedSettlementRows(
  workbook: ParsedExcelWorkbook,
  fixedVehicles: FixedVehicle[],
  mapping: ColumnMapping,
  sheetName: string,
): ConvertedSettlementRow[] {
  const targetSheets = sheetName === "__all__" ? workbook.sheets : workbook.sheets.filter((sheet) => sheet.sheetName === sheetName);
  const classifiedRows = classifySettlementRows(targetSheets, fixedVehicles).filter((row) => row.vehicleType === "fixed");

  return classifiedRows.map((row) => ({
    vehicleNumber: getMappedValue(row.data, mapping.vehicleNumber) || row.vehicleNumber,
    driverName: getMappedValue(row.data, mapping.driverName) || row.driverName || "",
    centerName: getMappedValue(row.data, mapping.centerName) || row.centerName || "",
    operationDate: getMappedValue(row.data, mapping.operationDate),
    billingAmount: getMappedValue(row.data, mapping.billingAmount),
    paymentAmount: getMappedValue(row.data, mapping.paymentAmount),
    memo: getMappedValue(row.data, mapping.memo),
  }));
}

export function createTsv(rows: ConvertedSettlementRow[]) {
  const headers = STANDARD_SETTLEMENT_COLUMNS.map((column) => column.label);
  const body = rows.map((row) =>
    STANDARD_SETTLEMENT_COLUMNS.map((column) => String(row[column.key] ?? "").replace(/\t|\r?\n/g, " ")).join("\t"),
  );

  return [headers.join("\t"), ...body].join("\n");
}
