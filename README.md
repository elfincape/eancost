# Eancost

Eancost는 센터별 차량 정산자료를 업로드하고, 청구 정산자료와 지급 차량용역료 자료를 비교하기 위한 Next.js 기반 웹앱입니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / RLS
- Vercel 배포 기준
- GitHub 저장소 기준 운영

## 주요 업무 흐름

1. 센터(안산, 평택, 양산, 김해)와 차량/기사 마스터를 관리합니다.
2. 청구 정산자료 또는 지급 차량용역료 .xlsx 파일을 업로드합니다.
3. 브라우저에서 시트 목록, 행 수, 컬럼 수, 원본 데이터 미리보기를 확인합니다.
4. 이후 단계에서 고정차/임시차 구분, 변환, 비교, 저장 기능을 순차적으로 연결합니다.

## 로컬 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

> `.env.local`은 로컬 개발자만 생성해야 하며 절대 커밋하지 않습니다.

## 환경변수 설정 방법

`.env.example`을 참고해 로컬에는 `.env.local`, Vercel에는 Project Settings의 Environment Variables에 값을 등록합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xiwggyahiwdixsywyanm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ulqaTH_D01j2HR7-zYYvqg_wX6Q203S
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### Vercel에 등록해야 할 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용 기능이 필요할 때만 등록)
- `NEXT_PUBLIC_APP_URL` (예: `https://your-domain.vercel.app`)

## 현재 구현 단계

현재 코드는 단계형 개발 계획 중 **8단계: 데이터 저장 구조 도입**까지 구현되어 있습니다. `/upload` 화면에서 .xlsx 파일을 선택하면 SheetJS 기반 파서가 브라우저에서 시트 목록과 미리보기 테이블을 표시하고, 파싱 결과를 localStorage에 임시 저장합니다. `/settings/vehicles`에서 고정차량 목록을 등록하면 `/settlements`에서 전체/고정차/임시차 탭으로 분류 결과를 확인할 수 있습니다. `/settlements/convert`에서는 고정차만 추출해 표준 컬럼 매핑 후 붙여넣기용 테이블/클립보드 복사/xlsx 다운로드를 제공합니다. `/settlements/compare`에서는 청구자료와 지급자료를 각각 업로드해 차량번호 기준 누락, 금액 차이, 중복 데이터를 검증하고 결과 xlsx를 다운로드할 수 있습니다. `/reports`와 `/reports/weekly`에서는 BI/위클리 리포트를 제공합니다. Supabase 저장 확장을 위해 `converted_settlement_rows` 마이그레이션과 서버 전용 storage API를 추가했으며, UI는 아직 localStorage fallback을 유지합니다.

## Supabase SQL 적용 방법

1. Supabase 프로젝트 대시보드에 접속합니다.
2. **SQL Editor**를 엽니다.
3. `supabase/migrations/001_initial_schema.sql` 내용을 실행합니다.
4. 테이블, 인덱스, updated_at 트리거, RLS 정책이 생성되었는지 확인합니다.

Supabase CLI를 사용하는 경우에는 프로젝트 연결 후 아래처럼 적용할 수 있습니다.

```bash
supabase db push
```

## Supabase seed 적용 방법

초기 센터 데이터는 `supabase/seed.sql`에 있습니다.

1. Supabase SQL Editor를 엽니다.
2. `supabase/seed.sql` 내용을 실행합니다.
3. `centers` 테이블에 안산, 평택, 양산, 김해가 생성되었는지 확인합니다.

> `auth.users`에는 직접 insert하지 마세요. 사용자는 Supabase Auth 가입 흐름으로 생성해야 합니다.

## 최초 admin 계정 설정 방법

1. 앱 또는 Supabase Auth에서 최초 사용자를 가입시킵니다.
2. Supabase Dashboard의 Table Editor 또는 SQL Editor에서 해당 사용자의 `profiles.role`을 `admin`으로 변경합니다.
3. 예시 SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

최초 admin 지정은 운영자가 Supabase Dashboard에서 수동으로 수행합니다. 이후 admin 사용자는 앱 내 관리 기능을 통해 사용자 권한을 관리할 수 있습니다.

## Vercel 배포 방법

1. GitHub 저장소를 Vercel에 Import합니다.
2. Framework Preset은 Next.js로 선택합니다.
3. Environment Variables에 위 환경변수를 등록합니다.
4. Build Command는 기본값 `next build`를 사용합니다.
5. 배포 후 `NEXT_PUBLIC_APP_URL`을 실제 Vercel 도메인으로 갱신합니다.

## 보안 주의사항

- GitHub 토큰은 절대 코드, README, 이슈, PR, 환경변수 예시 파일에 저장하지 마세요.
- `.env.local`은 커밋하지 마세요.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. 브라우저 코드, Client Component, `NEXT_PUBLIC_` 접두사 환경변수에 넣지 마세요.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 클라이언트에서 사용할 수 있지만, 민감 데이터 보호는 반드시 RLS 정책으로 보장해야 합니다.
- 민감 테이블은 RLS 정책 없이 공개하지 마세요.
- `lib/supabase/admin.ts`는 서버 전용 작업에서만 사용하세요.

## 데이터 저장 구조

8단계부터 Supabase 저장 구조를 확장했습니다. 기존 localStorage 화면은 오프라인/초기 검증 fallback으로 유지하며, 서버 저장은 `/api/storage/[table]` API를 통해 단계적으로 연결할 수 있습니다.

지원 테이블:

- `centers`
- `drivers`
- `vehicles`
- `uploaded_files`
- `settlement_batches`
- `settlement_rows`
- `converted_settlement_rows`
- `comparison_results`

API 예시:

```bash
# 목록 조회
curl /api/storage/vehicles

# 생성
curl -X POST /api/storage/vehicles -H 'Content-Type: application/json' -d '{"vehicle_number":"12가3456","vehicle_type":"fixed","center_id":"..."}'

# 수정
curl -X PATCH /api/storage/vehicles/{id} -H 'Content-Type: application/json' -d '{"memo":"updated"}'

# 삭제
curl -X DELETE /api/storage/vehicles/{id}
```

이 API는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 서버 전용 API입니다. 브라우저에는 service role key를 노출하지 마세요. 인증/권한 UI는 9단계에서 연결합니다.

## 프로젝트 구조

```text
app/                         Next.js App Router 페이지
lib/settlements/             정산자료 변환/비교 유틸리티
lib/reports/                 BI/위클리 리포트 집계 유틸리티
lib/storage/                 Supabase storage API table whitelist
components/                  공통 UI 컴포넌트
lib/supabase/client.ts       브라우저용 Supabase 클라이언트
lib/supabase/server.ts       서버/Route Handler용 Supabase 클라이언트
lib/supabase/admin.ts        service role 기반 서버 전용 클라이언트
supabase/migrations/         데이터베이스 스키마 SQL
supabase/seed.sql            초기 센터 seed SQL
```

## 다음 개발 단계 제안

1. **9단계: 권한/관리자 기능**
   - Supabase Auth 로그인 추가
   - admin/user 권한을 UI와 서버 API에 적용
   - 관리자 전용 차량/센터/기준정보 수정 메뉴 정리
2. **10단계: 품질 개선**
   - 에러/빈 상태/로딩/검색/필터/도움말/타입 안정성 정리
