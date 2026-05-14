"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";
import { getWorkbookColumns, suggestColumnMapping, type ColumnMapping } from "@/lib/settlements/convert";
import { createReportRows, REPORT_CENTERS } from "@/lib/reports/dashboard";
import { createWeeklyReportSummary, getWeekOptions, type WeeklyReportFilters } from "@/lib/reports/weekly";
import { loadFixedVehicles, loadLatestWorkbook } from "@/lib/vehicles/storage";
import type { FixedVehicle } from "@/lib/vehicles/types";
import type { ParsedExcelWorkbook } from "@/lib/excel/types";

const ALL_WEEKS = "all";
const ALL_CENTERS = "all";
const amountFormatter = new Intl.NumberFormat("ko-KR");

function formatWon(value: number) {
  return `${amountFormatter.format(value)}원`;
}

export function WeeklyReportClient() {
  const [workbook, setWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [fixedVehicles, setFixedVehicles] = useState<FixedVehicle[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [filters, setFilters] = useState<WeeklyReportFilters>({ weekLabel: ALL_WEEKS, centerName: ALL_CENTERS });
  const [isLoaded, setIsLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const latestWorkbook = loadLatestWorkbook();
      const latestFixedVehicles = loadFixedVehicles();
      setWorkbook(latestWorkbook);
      setFixedVehicles(latestFixedVehicles);

      if (latestWorkbook) {
        setMapping(suggestColumnMapping(getWorkbookColumns(latestWorkbook, "__all__")));
      }

      setIsLoaded(true);
    });
  }, []);

  const sourceColumns = useMemo(() => getWorkbookColumns(workbook, "__all__"), [workbook]);
  const reportRows = useMemo(() => createReportRows(workbook, fixedVehicles, mapping), [fixedVehicles, mapping, workbook]);
  const weekOptions = useMemo(() => getWeekOptions(reportRows), [reportRows]);
  const summary = useMemo(() => createWeeklyReportSummary(reportRows, filters), [filters, reportRows]);

  async function copyReportText() {
    setMessage(null);
    setErrorMessage(null);

    if (!summary.totalSettlementCount) {
      setErrorMessage("복사할 리포트 데이터가 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(summary.generatedText);
      setMessage("위클리 리포트 문장을 클립보드에 복사했습니다.");
    } catch {
      setErrorMessage("클립보드 복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    }
  }

  function downloadWeeklyReport() {
    setMessage(null);
    setErrorMessage(null);

    if (!summary.totalSettlementCount) {
      setErrorMessage("다운로드할 리포트 데이터가 없습니다.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const overviewRows = [
      ["항목", "값"],
      ["기준 주차", summary.weekLabel],
      ["센터", summary.centerName],
      ["총 운행/정산 건수", summary.totalSettlementCount],
      ["총 차량 수", summary.totalVehicleCount],
      ["고정차 수", summary.fixedVehicleCount],
      ["임시차 수", summary.temporaryVehicleCount],
      ["청구금액", summary.billingTotalAmount],
      ["지급금액", summary.paymentTotalAmount],
      ["차이금액", summary.differenceAmount],
      ["금액 차이 건수", summary.amountDifferenceCount],
      ["청구 누락 건수", summary.missingBillingRows.length],
      ["지급 누락 건수", summary.missingPaymentRows.length],
      ["중복 차량 건수", summary.duplicateGroups.length],
      ["보고 문장", summary.generatedText],
    ];
    const missingRows = [
      ["구분", "차량번호", "센터", "운행일자", "청구금액", "지급금액", "차이금액"],
      ...summary.missingBillingRows.map((row) => ["청구 누락", row.vehicleNumber, row.centerName, row.operationDate ?? "", row.billingAmount, row.paymentAmount, row.differenceAmount]),
      ...summary.missingPaymentRows.map((row) => ["지급 누락", row.vehicleNumber, row.centerName, row.operationDate ?? "", row.billingAmount, row.paymentAmount, row.differenceAmount]),
    ];
    const duplicateRows = [
      ["차량번호", "행 수", "청구금액 합계", "지급금액 합계"],
      ...summary.duplicateGroups.map((group) => [group.vehicleNumber, group.rows.length, group.totalBillingAmount, group.totalPaymentAmount]),
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(overviewRows), "위클리요약");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(missingRows), "누락차량");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(duplicateRows), "중복차량");
    XLSX.writeFile(workbook, `eancost-weekly-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage("위클리 리포트 xlsx 다운로드를 시작했습니다.");
  }

  if (!isLoaded) {
    return <div className="card min-h-96 animate-pulse bg-slate-100" />;
  }

  if (!workbook) {
    return (
      <section className="card flex min-h-[420px] items-center justify-center text-center">
        <div>
          <p className="text-2xl font-bold text-slate-950">위클리 리포트 데이터가 없습니다</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            `/upload`에서 .xlsx 정산자료를 업로드하면 localStorage에 저장된 파싱 데이터를 기반으로 위클리 리포트를 생성합니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="badge">Weekly Report</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">보고 기준 선택</h2>
            <p className="mt-2 text-sm text-slate-600">마지막 업로드 파일 `{workbook.fileName}` 기준으로 보고용 주간 요약을 생성합니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              기준 주차
              <select
                value={filters.weekLabel}
                onChange={(event) => setFilters((current) => ({ ...current, weekLabel: event.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              >
                <option value={ALL_WEEKS}>전체 주차</option>
                {weekOptions.map((week) => <option key={week} value={week}>{week}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              센터
              <select
                value={filters.centerName}
                onChange={(event) => setFilters((current) => ({ ...current, centerName: event.target.value as WeeklyReportFilters["centerName"] }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              >
                <option value={ALL_CENTERS}>전체 센터</option>
                {REPORT_CENTERS.map((center) => <option key={center} value={center}>{center}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["청구금액", "billingAmount"],
            ["지급금액", "paymentAmount"],
            ["운행일자", "operationDate"],
          ].map(([label, key]) => (
            <label key={key} className="grid gap-2 text-sm font-semibold text-slate-700">
              {label} 컬럼
              <select
                value={mapping[key as keyof ColumnMapping] ?? ""}
                onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value || undefined }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              >
                <option value="">매핑 안 함</option>
                {sourceColumns.map((column) => <option key={column} value={column}>{column}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
      {errorMessage ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-500">총 운행/정산 건수</p><p className="mt-2 text-3xl font-bold text-slate-950">{summary.totalSettlementCount}건</p></div>
        <div className="card"><p className="text-sm text-slate-500">청구금액</p><p className="mt-2 text-2xl font-bold text-blue-700">{formatWon(summary.billingTotalAmount)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">지급금액</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatWon(summary.paymentTotalAmount)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">차이금액</p><p className="mt-2 text-2xl font-bold text-red-700">{formatWon(summary.differenceAmount)}</p></div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">자동 생성 리포트 문장</h2>
            <p className="mt-2 text-sm text-slate-600">보고서나 메신저에 바로 붙여넣을 수 있는 문장입니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copyReportText} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">복사</button>
            <button type="button" onClick={downloadWeeklyReport} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">xlsx 다운로드</button>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-base leading-8 text-slate-800">{summary.generatedText}</div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-500">총 차량 수</p><p className="mt-2 text-3xl font-bold text-slate-950">{summary.totalVehicleCount}대</p></div>
        <div className="card"><p className="text-sm text-slate-500">고정차 수</p><p className="mt-2 text-3xl font-bold text-blue-700">{summary.fixedVehicleCount}대</p></div>
        <div className="card"><p className="text-sm text-slate-500">임시차 수</p><p className="mt-2 text-3xl font-bold text-amber-700">{summary.temporaryVehicleCount}대</p></div>
        <div className="card"><p className="text-sm text-slate-500">이상 데이터</p><p className="mt-2 text-3xl font-bold text-red-700">{summary.amountDifferenceCount + summary.missingBillingRows.length + summary.missingPaymentRows.length + summary.duplicateGroups.length}건</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card">
          <h2 className="text-xl font-bold text-slate-950">이상 데이터 요약</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between rounded-xl bg-slate-50 p-4"><span>금액 차이</span><strong>{summary.amountDifferenceCount}건</strong></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-4"><span>청구 누락</span><strong>{summary.missingBillingRows.length}건</strong></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-4"><span>지급 누락</span><strong>{summary.missingPaymentRows.length}건</strong></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-4"><span>중복 차량</span><strong>{summary.duplicateGroups.length}건</strong></div>
          </div>
        </div>

        <div className="card xl:col-span-2">
          <h2 className="text-xl font-bold text-slate-950">누락 차량 목록</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {summary.missingBillingRows.length + summary.missingPaymentRows.length === 0 ? (
              <div className="bg-slate-50 p-8 text-center text-sm text-slate-500">누락 차량 데이터가 없습니다.</div>
            ) : (
              <table className="min-w-full whitespace-nowrap text-left text-sm">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">구분</th><th className="px-4 py-3">차량번호</th><th className="px-4 py-3">센터</th><th className="px-4 py-3 text-right">청구</th><th className="px-4 py-3 text-right">지급</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {[...summary.missingBillingRows.map((row) => ["청구 누락", row] as const), ...summary.missingPaymentRows.map((row) => ["지급 누락", row] as const)].map(([type, row], index) => (
                    <tr key={`${type}-${row.id}-${index}`} className="bg-red-50/30"><td className="px-4 py-3 font-bold text-red-700">{type}</td><td className="px-4 py-3">{row.vehicleNumber}</td><td className="px-4 py-3">{row.centerName}</td><td className="px-4 py-3 text-right">{formatWon(row.billingAmount)}</td><td className="px-4 py-3 text-right">{formatWon(row.paymentAmount)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card xl:col-span-3">
          <h2 className="text-xl font-bold text-slate-950">중복 차량 목록</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {summary.duplicateGroups.length === 0 ? (
              <div className="bg-slate-50 p-8 text-center text-sm text-slate-500">중복 차량 데이터가 없습니다.</div>
            ) : (
              <table className="min-w-full whitespace-nowrap text-left text-sm">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">차량번호</th><th className="px-4 py-3 text-right">행 수</th><th className="px-4 py-3 text-right">청구합계</th><th className="px-4 py-3 text-right">지급합계</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {summary.duplicateGroups.map((group) => (
                    <tr key={group.vehicleNumber} className="bg-amber-50/30"><td className="px-4 py-3 font-bold text-slate-900">{group.vehicleNumber}</td><td className="px-4 py-3 text-right">{group.rows.length}</td><td className="px-4 py-3 text-right">{formatWon(group.totalBillingAmount)}</td><td className="px-4 py-3 text-right">{formatWon(group.totalPaymentAmount)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
