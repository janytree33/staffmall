# 07. CJ대한통운 운송장번호 엑셀 자동 매칭 및 배송조회 연동 계획서

## 1. 개요 및 목적
- 관리자 페이지에서 CJ대한통운 택배 접수 완료 후 다운로드한 엑셀(`.xlsx`/`.xls`/`.csv`) 파일을 업로드하면, 수령인 정보(`받는분`, `받는분전화번호`, `받는분우편번호`)를 기준으로 배송지(`order_deliveries` 및 구버전 `orders`)를 자동 매칭하여 **운송장번호(`tracking_number`)**를 일괄 등록한다.
- 운송장번호가 매칭·등록된 주문은 관리자가 일일이 상태를 변경하지 않아도 자동으로 **`배송/수령 완료`** 상태로 전환된다.
- 주문자는 **마이페이지([`MyPage.jsx`](file:///d:/안티그래비티/staff-mall-main/src/pages/MyPage.jsx))**에서 배송지별 운송장번호를 확인하고, 클릭 한 번으로 **CJ대한통운 실시간 배송조회 페이지**를 열 수 있다.

---

## 2. 데이터베이스(Supabase) 변경 사항
- 마이그레이션 파일: `supabase/migrations/011_add_tracking_number.sql`
  1. `public.order_deliveries` 테이블에 `tracking_number TEXT` 컬럼 추가
  2. 하위 호환성을 위해 `public.orders` 테이블에도 `tracking_number TEXT` 컬럼 추가
  3. `public.order_deliveries` 테이블의 `UPDATE` RLS 정책(`배송지 수정 허용`) 추가 보장

---

## 3. 화면별 구현 상세

### 3-1. 관리자 페이지 ([`src/pages/Admin.jsx`](file:///d:/안티그래비티/staff-mall-main/src/pages/Admin.jsx))
1. **데이터 조회(`fetchAdminOrders`) 확장**
   - `orders`의 `tracking_number` 및 `order_deliveries`의 `id, tracking_number` 필드를 함께 조회하도록 수정
2. **[운송장 엑셀 업로드] 버튼 및 자동 매칭 로직 추가**
   - 상단 `[택배발송 엑셀 다운로드]` 버튼 옆에 **`[운송장 엑셀 업로드]`** 버튼 배치
   - CJ대한통운 엑셀 파일 업로드 시 `xlsx` 라이브러리로 시트 데이터를 파싱
   - 헤더 행에서 `운송장번호`, `받는분`, `받는분전화번호`, `받는분우편번호` 컬럼 위치를 자동 탐색
   - 현재 월의 택배배송 주문(`주문취소` 제외) 중, **수령인 이름 + 전화번호(숫자만 추출 비교)**가 일치하는 배송지(`order_deliveries`)를 찾아 `tracking_number` 업데이트 (동일 수령인의 다중 배송지가 있을 경우 우편번호까지 비교)
   - 매칭된 배송지가 속한 주문(`orders`)의 상태를 자동으로 **`배송/수령 완료`**로 업데이트
   - 처리 완료 후 내부 결과 모달로 매칭 성공 건수 및 상세 내역 안내 (규칙 16 준수)
3. **관리자 화면 내 운송장번호 표시**
   - 각 배송지 정보 하단에 등록된 운송장번호(`CJ대한통운: 6010-0431-5561`) 표시 및 클릭 시 배송조회 팝업 연결

### 3-2. 마이페이지 ([`src/pages/MyPage.jsx`](file:///d:/안티그래비티/staff-mall-main/src/pages/MyPage.jsx))
1. **데이터 조회(`fetchOrders`) 확장**
   - `orders.tracking_number` 및 `order_deliveries.tracking_number` 조회 추가
2. **배송지별 운송장번호 및 CJ대한통운 배송조회 링크 표시**
   - 각 배송지 카드에 `tracking_number`가 존재할 경우:
     - `🚚 CJ대한통운: 6010-0431-5561 [배송조회 ↗]` 배지/버튼 표시
     - 클릭 시 CJ대한통운 배송조회 URL(`https://trace.cjlogistics.com/next/tracking.html?wblNo=운송장번호숫자만`)을 새 창으로 연결
