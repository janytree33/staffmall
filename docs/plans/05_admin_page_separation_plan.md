# 🛠 관리자 전용 페이지 개편 및 현금영수증 DB 긴급 패치

현재 사용자 화면(Home) 하단에 노출되고 있는 '주문 현황 및 취소 관리 패널'을 완전히 독립된 형태의 **관리자 전용 페이지(`/admin`)**로 분리하여 보안과 사용성을 강화합니다. 또한, 방금 전 추가한 현금영수증 관련 정보를 DB에 기록하기 위한 필수 컬럼 추가 작업(마이그레이션)을 병행합니다.

> [!CAUTION]
> **DB 업데이트 필수:** 현재 `cash_receipt_requested` 등의 컬럼이 `orders` 테이블에 존재하지 않아 관리자 패널 로딩 시 에러("주문 내역을 불러오지 못했습니다")가 발생하고 있습니다. 이번 계획에 포함된 SQL 코드를 Supabase에서 반드시 실행해 주셔야 합니다.

## User Review Required

1. **페이지 분리 동의:** 현재 `Home.jsx` 화면 아래에 있던 관리자 뷰를 없애고, 상단 헤더의 `[⚙️ 관리자 패널]` 버튼을 통해서만 진입할 수 있는 완전히 분리된 페이지로 만드는데 동의하시나요?
2. **관리자 권한 검증:** 기존처럼 `info` (또는 지정된 관리자 이메일) 계정으로 로그인한 경우에만 해당 페이지에 접근할 수 있도록 보안을 유지합니다.

## Proposed Changes

---

### 1. Database Patch (현금영수증 컬럼 추가)
#### [NEW] `supabase/migrations/008_add_missing_cash_receipt_columns.sql`
- `orders` 테이블에 현금영수증 발급 여부, 용도, 번호를 저장하는 컬럼 3개 추가 (`cash_receipt_requested`, `cash_receipt_type`, `cash_receipt_number`).

---

### 2. Admin Page Separation (관리자 페이지 신설)
#### [NEW] `src/pages/Admin.jsx`
- `Home.jsx`의 맨 하단에 있던 "주문 현황 및 취소 관리 패널"과 "직원 계정 관리(AdminPanel)" 컴포넌트를 이 페이지로 전부 이동시킵니다.
- **아이콘 리뉴얼:** 기존의 투박한 방패(`shield`) 아이콘 대신 JT 디자인 시스템 가이드에 맞는 `admin_panel_settings`, `monitoring` 등 세련된 Material Symbols 아이콘으로 전면 교체합니다.

#### [MODIFY] `src/App.jsx`
- `<Route path="/admin" element={<Admin />} />` 라우팅 경로를 추가합니다.

#### [MODIFY] `src/pages/Home.jsx`
- 하단의 관리자 패널 렌더링 코드 전체를 삭제합니다.
- 상단 로고 우측 또는 "마이페이지/로그아웃" 버튼 영역 옆에 `info` 계정으로 로그인한 경우에만 보이는 **[⚙️ 관리자 패널]** 이동 버튼을 신설합니다.

## Verification Plan

1. [DB 수정] 사용자가 제공된 `008_...sql` 스크립트를 Supabase에서 실행합니다.
2. [권한 테스트] 일반 직원 계정으로 로그인 시 `[관리자 패널]` 버튼이 노출되지 않는지 확인합니다.
3. [페이지 분리 테스트] `info` 계정으로 로그인 후 `[관리자 패널]` 클릭 시 새로운 `/admin` 페이지로 이동하고, 세련된 아이콘과 함께 정상적으로 주문 내역(현금영수증, 택배 정보 포함)이 불러와지는지 확인합니다.
