-- 008_add_missing_cash_receipt_columns.sql
-- orders 테이블에 현금영수증 관련 누락된 컬럼들을 추가합니다.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cash_receipt_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cash_receipt_type text,
ADD COLUMN IF NOT EXISTS cash_receipt_number text;

-- 컬럼 주석 추가
COMMENT ON COLUMN public.orders.cash_receipt_requested IS '현금영수증 발급 신청 여부';
COMMENT ON COLUMN public.orders.cash_receipt_type IS '현금영수증 용도 (소득공제용 / 지출증빙용)';
COMMENT ON COLUMN public.orders.cash_receipt_number IS '현금영수증 발급 번호 (휴대폰번호 / 사업자번호)';
