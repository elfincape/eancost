import { PageShell } from "@/components/page-shell";
import { ReportsClient } from "./reports-client";

export default function ReportsPage() {
  return (
    <PageShell
      badge="Reports"
      title="센터별 BI 대시보드"
      description="업로드/파싱된 정산자료를 기반으로 안산, 평택, 양산, 김해 센터별 차량 수와 청구/지급/차이 금액을 시각화합니다."
    >
      <ReportsClient />
    </PageShell>
  );
}
