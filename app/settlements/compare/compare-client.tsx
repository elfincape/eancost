"use client";

import * as XLSX from "xlsx";
import { useMemo, useRef, useState } from "react";
import { parseExcelWorkbook } from "@/lib/excel/parse-workbook";
import type { ParsedExcelWorkbook } from "@/lib/excel/types";
import { getWorkbookColumns, STANDARD_SETTLEMENT_COLUMNS, suggestColumnMapping, type ColumnMapping } from "@/lib/settlements/convert";
import {
  compareSettlementRows,
  extractComparableRows,
  type SettlementComparisonResult,
  type SettlementCompareSource,
  type VehicleComparison,
} from "@/lib/settlements/compare";

const ALL_SHEETS = "__all__";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function sourceLabel(source: SettlementCompareSource) {
  return source === "billing" ? "청구" : "지급";
}

function IssueTable({ title, rows }: { title: string; rows: VehicleComparison[] }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <span className="badge">{rows.length}건</span>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        {rows.length === 0 ? (
          <div className="bg-slate-50 p-8 text-center text-sm text-slate-500">표시할 이상 데이터가 없습니다.</div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full whitespace-nowrap text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">차량번호</th>
                  <th className="px-4 py-3 text-right">청구금액</th>
                  <th className="px-4 py-3 text-right">지급금액</th>
                  <th className="px-4 py-3 text-right">차이금액</th>
                  <th className="px-4 py-3 text-right">청구 행</th>
                  <th className="px-4 py-3 text-right">지급 행</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.normalizedVehicleNumber} className={row.differenceAmount !== 0 ? "bg-red-50/40" : undefined}>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.vehicleNumber}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatWon(row.billingAmount)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatWon(row.paymentAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{formatWon(row.differenceAmount)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{row.billingRows.length}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{row.paymentRows.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function CompareClient() {
  const billingInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);
  const [billingWorkbook, setBillingWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [paymentWorkbook, setPaymentWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [billingSheetName, setBillingSheetName] = useState(ALL_SHEETS);
  const [paymentSheetName, setPaymentSheetName] = useState(ALL_SHEETS);
  const [billingMapping, setBillingMapping] = useState<ColumnMapping>({});
  const [paymentMapping, setPaymentMapping] = useState<ColumnMapping>({});
  const [isParsing, setIsParsing] = useState<SettlementCompareSource | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const billingColumns = useMemo(() => getWorkbookColumns(billingWorkbook, billingSheetName), [billingSheetName, billingWorkbook]);
  const paymentColumns = useMemo(() => getWorkbookColumns(paymentWorkbook, paymentSheetName), [paymentSheetName, paymentWorkbook]);

  const billingRows = useMemo(
    () => (billingWorkbook ? extractComparableRows(billingWorkbook, "billing", billingMapping, billingSheetName) : []),
    [billingMapping, billingSheetName, billingWorkbook],
  );
  const paymentRows = useMemo(
    () => (paymentWorkbook ? extractComparableRows(paymentWorkbook, "payment", paymentMapping, paymentSheetName) : []),
    [paymentMapping, paymentSheetName, paymentWorkbook],
  );
  const comparison = useMemo<SettlementComparisonResult | null>(
    () => (billingWorkbook && paymentWorkbook ? compareSettlementRows(billingRows, paymentRows) : null),
    [billingRows, billingWorkbook, paymentRows, paymentWorkbook],
  );

  async function handleFile(file: File | undefined, source: SettlementCompareSource) {
    setMessage(null);
    setErrorMessage(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMessage(".xlsx 파일만 업로드할 수 있습니다.");
      return;
    }

    setIsParsing(source);

    try {
      const workbook = await parseExcelWorkbook(file, source);
      const nextMapping = suggestColumnMapping(getWorkbookColumns(workbook, ALL_SHEETS));

      if (source === "billing") {
        setBillingWorkbook(workbook);
        setBillingSheetName(ALL_SHEETS);
        setBillingMapping(nextMapping);
      } else {
        setPaymentWorkbook(workbook);
        setPaymentSheetName(ALL_SHEETS);
        setPaymentMapping(nextMapping);
      }

      setMessage(`${sourceLabel(source)}자료를 읽었습니다. 컬럼 매핑을 확인하세요.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setIsParsing(null);
    }
  }

  function handleSheetChange(source: SettlementCompareSource, nextSheetName: string) {
    if (source === "billing") {
      setBillingSheetName(nextSheetName);
      if (billingWorkbook) setBillingMapping(suggestColumnMapping(getWorkbookColumns(billingWorkbook, nextSheetName)));
    } else {
      setPaymentSheetName(nextSheetName);
      if (paymentWorkbook) setPaymentMapping(suggestColumnMapping(getWorkbookColumns(paymentWorkbook, nextSheetName)));
    }
  }

  function downloadComparison() {
    setMessage(null);
    setErrorMessage(null);

    if (!comparison) {
      setErrorMessage("다운로드할 비교 결과가 없습니다.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const comparisonRows = [
      ["구분", "차량번호", "청구금액", "지급금액", "차이금액", "청구행수", "지급행수"],
      ...comparison.missingInPayment.map((row) => ["지급 누락", row.vehicleNumber, row.billingAmount, row.paymentAmount, row.differenceAmount, row.billingRows.length, row.paymentRows.length]),
      ...comparison.missingInBilling.map((row) => ["청구 누락", row.vehicleNumber, row.billingAmount, row.paymentAmount, row.differenceAmount, row.billingRows.length, row.paymentRows.length]),
      ...comparison.amountDifferences.map((row) => ["금액 차이", row.vehicleNumber, row.billingAmount, row.paymentAmount, row.differenceAmount, row.billingRows.length, row.paymentRows.length]),
    ];
    const duplicateRows = [
      ["자료구분", "차량번호", "중복행수", "합계금액", "시트/행"],
      ...comparison.duplicates.map((group) => [
        sourceLabel(group.source),
        group.vehicleNumber,
        group.rows.length,
        group.totalAmount,
        group.rows.map((row) => `${row.sheetName}:${row.rowIndex}`).join(", "),
      ]),
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(comparisonRows), "비교결과");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(duplicateRows), "중복데이터");
    XLSX.writeFile(workbook, `eancost-comparison-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage("비교 결과 xlsx 다운로드를 시작했습니다.");
  }

  const renderSourcePanel = (source: SettlementCompareSource) => {
    const workbook = source === "billing" ? billingWorkbook : paymentWorkbook;
    const sheetName = source === "billing" ? billingSheetName : paymentSheetName;
    const columns = source === "billing" ? billingColumns : paymentColumns;
    const mapping = source === "billing" ? billingMapping : paymentMapping;
    const setMapping = source === "billing" ? setBillingMapping : setPaymentMapping;
    const inputRef = source === "billing" ? billingInputRef : paymentInputRef;
    const rows = source === "billing" ? billingRows : paymentRows;
    const amountKey = source === "billing" ? "billingAmount" : "paymentAmount";

    return (
      <section className="card space-y-5">
        <div>
          <span className="badge">{sourceLabel(source)}</span>
          <h2 className="mt-3 text-xl font-bold text-slate-950">{sourceLabel(source)}자료 업로드</h2>
          <p className="mt-2 text-sm text-slate-600">차량번호와 {sourceLabel(source)}금액 컬럼을 매핑합니다.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0], source)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
        >
          <span className="block text-base font-bold text-slate-800">.xlsx 파일 선택</span>
          <span className="mt-2 block text-sm text-slate-500">{workbook?.fileName ?? `${sourceLabel(source)} 엑셀 파일을 업로드하세요.`}</span>
        </button>
        {isParsing === source ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">파일을 읽는 중입니다...</div> : null}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">차량 수</p><p className="mt-1 text-2xl font-bold text-slate-950">{new Set(rows.map((row) => row.normalizedVehicleNumber).filter(Boolean)).size}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">행 수</p><p className="mt-1 text-2xl font-bold text-slate-950">{rows.length}</p></div>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          대상 시트
          <select value={sheetName} onChange={(event) => handleSheetChange(source, event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 font-normal" disabled={!workbook}>
            <option value={ALL_SHEETS}>전체 시트</option>
            {workbook?.sheets.map((sheet) => (
              <option key={sheet.sheetName} value={sheet.sheetName}>{sheet.sheetName} · {sheet.rowCount}행</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          {STANDARD_SETTLEMENT_COLUMNS.filter((column) => ["vehicleNumber", "driverName", "centerName", amountKey].includes(column.key)).map((column) => (
            <label key={column.key} className="grid gap-2 text-sm font-semibold text-slate-700">
              {column.label}
              <select
                value={mapping[column.key] ?? ""}
                onChange={(event) => setMapping((current) => ({ ...current, [column.key]: event.target.value || undefined }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
                disabled={!workbook}
              >
                <option value="">매핑 안 함</option>
                {columns.map((columnName) => <option key={columnName} value={columnName}>{columnName}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {renderSourcePanel("billing")}
        {renderSourcePanel("payment")}
      </div>

      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
      {errorMessage ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-500">청구 합계</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatWon(comparison?.summary.billingTotalAmount ?? 0)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">지급 합계</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatWon(comparison?.summary.paymentTotalAmount ?? 0)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">차이 합계</p><p className="mt-2 text-2xl font-bold text-red-700">{formatWon(comparison?.summary.differenceTotalAmount ?? 0)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">이상 항목</p><p className="mt-2 text-2xl font-bold text-amber-700">{(comparison?.summary.missingPaymentCount ?? 0) + (comparison?.summary.missingBillingCount ?? 0) + (comparison?.summary.amountDifferenceCount ?? 0) + (comparison?.summary.duplicateGroupCount ?? 0)}건</p></div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="badge">Validation</span>
            <h2 className="mt-3 text-xl font-bold text-slate-950">검증 요약</h2>
            <p className="mt-2 text-sm text-slate-600">차량번호 기준 누락, 금액 차이, 중복 데이터를 확인합니다.</p>
          </div>
          <button type="button" onClick={downloadComparison} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
            결과 xlsx 다운로드
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-red-50 p-4"><p className="text-sm text-red-600">지급 누락</p><p className="mt-1 text-2xl font-bold text-red-700">{comparison?.summary.missingPaymentCount ?? 0}</p></div>
          <div className="rounded-xl bg-red-50 p-4"><p className="text-sm text-red-600">청구 누락</p><p className="mt-1 text-2xl font-bold text-red-700">{comparison?.summary.missingBillingCount ?? 0}</p></div>
          <div className="rounded-xl bg-amber-50 p-4"><p className="text-sm text-amber-600">금액 차이</p><p className="mt-1 text-2xl font-bold text-amber-700">{comparison?.summary.amountDifferenceCount ?? 0}</p></div>
          <div className="rounded-xl bg-amber-50 p-4"><p className="text-sm text-amber-600">중복 차량</p><p className="mt-1 text-2xl font-bold text-amber-700">{comparison?.summary.duplicateGroupCount ?? 0}</p></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <IssueTable title="청구에는 있는데 지급에는 없는 차량" rows={comparison?.missingInPayment ?? []} />
        <IssueTable title="지급에는 있는데 청구에는 없는 차량" rows={comparison?.missingInBilling ?? []} />
        <IssueTable title="청구금액과 지급금액 차이" rows={comparison?.amountDifferences ?? []} />
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">동일 차량 중복 행</h2>
            <span className="badge">{comparison?.duplicates.length ?? 0}건</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {!comparison || comparison.duplicates.length === 0 ? (
              <div className="bg-slate-50 p-8 text-center text-sm text-slate-500">중복 차량 데이터가 없습니다.</div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="min-w-full whitespace-nowrap text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">자료</th><th className="px-4 py-3">차량번호</th><th className="px-4 py-3 text-right">행 수</th><th className="px-4 py-3 text-right">합계</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {comparison.duplicates.map((group) => (
                      <tr key={`${group.source}-${group.normalizedVehicleNumber}`} className="bg-amber-50/40">
                        <td className="px-4 py-3 font-bold text-slate-900">{sourceLabel(group.source)}</td>
                        <td className="px-4 py-3 text-slate-700">{group.vehicleNumber}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{group.rows.length}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700">{formatWon(group.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
