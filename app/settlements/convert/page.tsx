import { PageShell } from "@/components/page-shell";
import { ConvertClient } from "./convert-client";

export default function ConvertPage() {
  return (
    <PageShell
      badge="Convert"
      title="정산자료 변환"
      description="청구 정산자료 또는 지급 차량용역료 엑셀에서 고정차 데이터만 추출하고, 표준 컬럼으로 재구성해 붙여넣기 쉬운 결과를 생성합니다."
    >
      <ConvertClient />
    </PageShell>
  );
}
