import { PageShell } from "@/components/page-shell";
import { SettlementsClient } from "./settlements-client";

export default function SettlementsPage() {
  return (
    <PageShell
      badge="Settlements"
      title="정산자료 목록"
      description="업로드된 엑셀 파싱 결과를 차량번호 기준으로 정리하고, 등록된 고정차량 목록과 매칭해 전체/고정차/임시차 필터로 확인합니다."
    >
      <SettlementsClient />
    </PageShell>
  );
}
