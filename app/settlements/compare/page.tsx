import { PageShell } from "@/components/page-shell";
import { CompareClient } from "./compare-client";

export default function ComparePage() {
  return (
    <PageShell
      badge="Compare"
      title="청구/지급 비교 검증"
      description="청구 정산자료와 지급 차량용역료 자료를 차량번호 기준으로 비교해 누락 차량, 금액 차이, 중복 데이터를 검증합니다."
    >
      <CompareClient />
    </PageShell>
  );
}
