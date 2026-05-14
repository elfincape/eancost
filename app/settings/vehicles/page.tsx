import { PageShell } from "@/components/page-shell";
import { VehiclesClient } from "./vehicles-client";

export default function VehiclesPage() {
  return (
    <PageShell
      badge="Settings"
      title="고정차량 관리"
      description="엑셀 정산자료에서 고정차만 필터링할 수 있도록 차량번호, 기사명, 센터명을 localStorage 기반 목록으로 관리합니다."
    >
      <VehiclesClient />
    </PageShell>
  );
}
