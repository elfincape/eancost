import { PageShell } from "@/components/page-shell";
import { WeeklyReportClient } from "./weekly-report-client";

export default function WeeklyReportPage() {
  return (
    <PageShell
      badge="Weekly"
      title="위클리 리포트"
      description="업로드/파싱된 정산자료를 기준 주차와 센터별로 요약하고, 보고용 문장과 파일 다운로드를 제공합니다."
    >
      <WeeklyReportClient />
    </PageShell>
  );
}
