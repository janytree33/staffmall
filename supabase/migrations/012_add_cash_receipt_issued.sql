-- ================================================================
-- 012_add_cash_receipt_issued.sql
-- 목적: 현금영수증 발급 완료 여부(cash_receipt_issued) 체크 컬럼 추가
-- ================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cash_receipt_issued BOOLEAN DEFAULT FALSE;
