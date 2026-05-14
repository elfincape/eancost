import type { ReportCenterName, ReportFilters, ReportRow } from "./dashboard";

export type WeeklyReportFilters = {
  weekLabel: string;
  centerName: "all" | ReportCenterName;
};

export type WeeklyReportSummary = {
  weekLabel: string;
  centerName: string;
  totalSettlementCount: number;
  totalVehicleCount: number;
  fixedVehicleCount: number;
  temporaryVehicleCount: number;
  billingTotalAmount: number;
  paymentTotalAmount: number;
  differenceAmount: number;
  amountDifferenceCount: number;
  missingBillingRows: ReportRow[];
  missingPaymentRows: ReportRow[];
  duplicateGroups: { vehicleNumber: string; rows: ReportRow[]; totalBillingAmount: number; totalPaymentAmount: number }[];
  generatedText: string;
};

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function matchesWeeklyFilters(row: ReportRow, filters: WeeklyReportFilters) {
  const weekMatched = !filters.weekLabel || filters.weekLabel === "all" || row.weekLabel === filters.weekLabel;
  const centerMatched = filters.centerName === "all" || row.centerName === filters.centerName;

  return weekMatched && centerMatched;
}

function reportCenterLabel(centerName: WeeklyReportFilters["centerName"]) {
  return centerName === "all" ? "전체 센터" : `${centerName}센터`;
}

export function getWeekOptions(rows: ReportRow[]) {
  return Array.from(new Set(rows.map((row) => row.weekLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function createWeeklyReportSummary(rows: ReportRow[], filters: WeeklyReportFilters): WeeklyReportSummary {
  const filteredRows = rows.filter((row) => matchesWeeklyFilters(row, filters));
  const vehicleNumbers = new Set(filteredRows.map((row) => row.normalizedVehicleNumber).filter(Boolean));
  const fixedVehicles = new Set(filteredRows.filter((row) => row.vehicleType === "fixed").map((row) => row.normalizedVehicleNumber).filter(Boolean));
  const temporaryVehicles = new Set(filteredRows.filter((row) => row.vehicleType === "temporary").map((row) => row.normalizedVehicleNumber).filter(Boolean));
  const billingTotalAmount = filteredRows.reduce((sum, row) => sum + row.billingAmount, 0);
  const paymentTotalAmount = filteredRows.reduce((sum, row) => sum + row.paymentAmount, 0);
  const amountDifferenceRows = filteredRows.filter((row) => row.differenceAmount !== 0);
  const missingBillingRows = filteredRows.filter((row) => row.billingAmount === 0 && row.paymentAmount !== 0);
  const missingPaymentRows = filteredRows.filter((row) => row.paymentAmount === 0 && row.billingAmount !== 0);

  const duplicateGroups = Array.from(
    filteredRows.reduce<Map<string, ReportRow[]>>((map, row) => {
      if (!row.normalizedVehicleNumber) return map;

      const currentRows = map.get(row.normalizedVehicleNumber) ?? [];
      currentRows.push(row);
      map.set(row.normalizedVehicleNumber, currentRows);

      return map;
    }, new Map()),
  )
    .filter(([, duplicateRows]) => duplicateRows.length > 1)
    .map(([vehicleNumber, duplicateRows]) => ({
      vehicleNumber: duplicateRows.find((row) => row.vehicleNumber)?.vehicleNumber ?? vehicleNumber,
      rows: duplicateRows,
      totalBillingAmount: duplicateRows.reduce((sum, row) => sum + row.billingAmount, 0),
      totalPaymentAmount: duplicateRows.reduce((sum, row) => sum + row.paymentAmount, 0),
    }));

  const centerLabel = reportCenterLabel(filters.centerName);
  const weekLabel = filters.weekLabel && filters.weekLabel !== "all" ? filters.weekLabel : "선택 기간 전체";
  const differenceAmount = billingTotalAmount - paymentTotalAmount;
  const generatedText = `${weekLabel} ${centerLabel} 정산 기준, 총 ${fixedVehicles.size}대의 고정차량을 포함한 ${vehicleNumbers.size}대 차량의 정산 ${filteredRows.length}건이 확인되었습니다. 청구금액은 ${formatWon(billingTotalAmount)}, 지급금액은 ${formatWon(paymentTotalAmount)}이며 차이금액은 ${formatWon(differenceAmount)}입니다. 이상 데이터는 금액 차이 ${amountDifferenceRows.length}건, 청구 누락 ${missingBillingRows.length}건, 지급 누락 ${missingPaymentRows.length}건, 중복 차량 ${duplicateGroups.length}건입니다.`;

  return {
    weekLabel,
    centerName: centerLabel,
    totalSettlementCount: filteredRows.length,
    totalVehicleCount: vehicleNumbers.size,
    fixedVehicleCount: fixedVehicles.size,
    temporaryVehicleCount: temporaryVehicles.size,
    billingTotalAmount,
    paymentTotalAmount,
    differenceAmount,
    amountDifferenceCount: amountDifferenceRows.length,
    missingBillingRows,
    missingPaymentRows,
    duplicateGroups,
    generatedText,
  };
}

export function createReportFiltersFromWeekly(filters: WeeklyReportFilters): ReportFilters {
  const monthMatch = filters.weekLabel.match(/^(\d{4}-\d{2})/);

  return {
    settlementMonth: monthMatch?.[1] ?? "",
    centerName: filters.centerName,
    vehicleType: "all",
  };
}
