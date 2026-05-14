"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getWorkbookColumns, suggestColumnMapping, type ColumnMapping } from "@/lib/settlements/convert";
import {
  createCenterSummaries,
  createReportRows,
  createVehicleTypeRatio,
  createWeeklyTrend,
  REPORT_CENTERS,
  type ReportFilters,
} from "@/lib/reports/dashboard";
import { loadFixedVehicles, loadLatestWorkbook } from "@/lib/vehicles/storage";
import type { FixedVehicle } from "@/lib/vehicles/types";
import type { ParsedExcelWorkbook } from "@/lib/excel/types";

const ALL_CENTERS = "all";
const ALL_TYPES = "all";
const amountFormatter = new Intl.NumberFormat("ko-KR");

function formatWon(value: number) {
  return `${amountFormatter.format(value)}원`;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <p className="mb-2 font-bold text-slate-900">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {formatWon(Number(item.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export function ReportsClient() {
  const [workbook, setWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [fixedVehicles, setFixedVehicles] = useState<FixedVehicle[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [filters, setFilters] = useState<ReportFilters>({
    settlementMonth: "",
    centerName: ALL_CENTERS,
    vehicleType: ALL_TYPES,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const latestWorkbook = loadLatestWorkbook();
      setWorkbook(latestWorkbook);
      setFixedVehicles(loadFixedVehicles());

      if (latestWorkbook) {
        setMapping(suggestColumnMapping(getWorkbookColumns(latestWorkbook, "__all__")));
      }

      setIsLoaded(true);
    });
  }, []);

  const reportRows = useMemo(() => createReportRows(workbook, fixedVehicles, mapping), [fixedVehicles, mapping, workbook]);
  const centerSummaries = useMemo(() => createCenterSummaries(reportRows, filters), [filters, reportRows]);
  const weeklyTrend = useMemo(() => createWeeklyTrend(reportRows, filters), [filters, reportRows]);
  const vehicleTypeRatio = useMemo(() => createVehicleTypeRatio(reportRows, filters), [filters, reportRows]);
  const sourceColumns = useMemo(() => getWorkbookColumns(workbook, "__all__"), [workbook]);
  const totals = useMemo(
    () => ({
      totalVehicles: centerSummaries.reduce((sum, center) => sum + center.totalVehicleCount, 0),
      billingAmount: centerSummaries.reduce((sum, center) => sum + center.billingTotalAmount, 0),
      paymentAmount: centerSummaries.reduce((sum, center) => sum + center.paymentTotalAmount, 0),
      differenceAmount: centerSummaries.reduce((sum, center) => sum + center.differenceAmount, 0),
    }),
    [centerSummaries],
  );

  if (!isLoaded) {
    return <div className="card min-h-96 animate-pulse bg-slate-100" />;
  }

  if (!workbook) {
    return (
      <section className="card flex min-h-[420px] items-center justify-center text-center">
        <div>
          <p className="text-2xl font-bold text-slate-950">리포트 데이터가 없습니다</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            `/upload`에서 .xlsx 정산자료를 업로드하면 localStorage에 저장된 파싱 데이터를 기반으로 센터별 BI 대시보드가 생성됩니다.
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
            <span className="badge">BI Dashboard</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">센터별 정산 현황</h2>
            <p className="mt-2 text-sm text-slate-600">
              마지막 업로드 파일 `{workbook.fileName}`의 파싱 데이터를 기준으로 집계합니다. 금액 컬럼이 다르면 아래 매핑을 조정하세요.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              기준월
              <input
                type="month"
                value={filters.settlementMonth}
                onChange={(event) => setFilters((current) => ({ ...current, settlementMonth: event.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              센터
              <select
                value={filters.centerName}
                onChange={(event) => setFilters((current) => ({ ...current, centerName: event.target.value as ReportFilters["centerName"] }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              >
                <option value={ALL_CENTERS}>전체 센터</option>
                {REPORT_CENTERS.map((center) => (
                  <option key={center} value={center}>{center}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              차량유형
              <select
                value={filters.vehicleType}
                onChange={(event) => setFilters((current) => ({ ...current, vehicleType: event.target.value as ReportFilters["vehicleType"] }))}
                className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              >
                <option value={ALL_TYPES}>전체</option>
                <option value="fixed">고정차</option>
                <option value="temporary">임시차</option>
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
                {sourceColumns.map((column) => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-500">총 차량 수</p><p className="mt-2 text-3xl font-bold text-slate-950">{totals.totalVehicles}대</p></div>
        <div className="card"><p className="text-sm text-slate-500">청구금액 합계</p><p className="mt-2 text-2xl font-bold text-blue-700">{formatWon(totals.billingAmount)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">지급금액 합계</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatWon(totals.paymentAmount)}</p></div>
        <div className="card"><p className="text-sm text-slate-500">차이금액</p><p className="mt-2 text-2xl font-bold text-red-700">{formatWon(totals.differenceAmount)}</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {centerSummaries.map((center) => (
          <div key={center.centerName} className="card">
            <h3 className="text-xl font-bold text-slate-950">{center.centerName}</h3>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">총 차량 수</span><strong>{center.totalVehicleCount}대</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">고정차 수</span><strong className="text-blue-700">{center.fixedVehicleCount}대</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">임시차 수</span><strong className="text-amber-700">{center.temporaryVehicleCount}대</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">청구금액</span><strong>{formatWon(center.billingTotalAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">지급금액</span><strong>{formatWon(center.paymentTotalAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">차이금액</span><strong className="text-red-700">{formatWon(center.differenceAmount)}</strong></div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-bold text-slate-950">센터별 청구/지급 비교</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centerSummaries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="centerName" />
                <YAxis tickFormatter={(value) => amountFormatter.format(Number(value))} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="billingTotalAmount" name="청구금액" fill="#2563eb" />
                <Bar dataKey="paymentTotalAmount" name="지급금액" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-slate-950">주차별 금액 추이</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" />
                <YAxis tickFormatter={(value) => amountFormatter.format(Number(value))} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="billingAmount" name="청구금액" stroke="#2563eb" strokeWidth={3} />
                <Line type="monotone" dataKey="paymentAmount" name="지급금액" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card xl:col-span-2">
          <h2 className="text-xl font-bold text-slate-950">고정차/임시차 비율</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value) => `${value}대`} />
                <Legend />
                <Pie data={vehicleTypeRatio} dataKey="value" nameKey="name" innerRadius={70} outerRadius={115} label>
                  {vehicleTypeRatio.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
