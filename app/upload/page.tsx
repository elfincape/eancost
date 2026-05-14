import { PageShell } from "@/components/page-shell";
import { UploadClient } from "./upload-client";

export default function UploadPage() {
  return (
    <PageShell
      badge="Upload"
      title="엑셀 업로드 및 미리보기"
      description="청구 정산자료 또는 지급 차량용역료 .xlsx 파일을 업로드하고, 브라우저에서 시트 목록과 원본 데이터를 미리 확인합니다. 아직 DB 저장이나 정산 계산은 수행하지 않습니다."
    >
      <UploadClient />
    </PageShell>
  );
}
