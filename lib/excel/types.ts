export type SettlementFileType = "billing" | "payment";

export type ExcelCellValue = string | number | boolean | Date | null;

export type ExcelPreviewRow = Record<string, ExcelCellValue>;

export type ParsedExcelSheet = {
  sheetName: string;
  columns: string[];
  rows: ExcelPreviewRow[];
  rawRows: ExcelCellValue[][];
  rowCount: number;
  columnCount: number;
};

export type ParsedExcelWorkbook = {
  fileName: string;
  fileSize: number;
  fileType: SettlementFileType;
  sheets: ParsedExcelSheet[];
};
