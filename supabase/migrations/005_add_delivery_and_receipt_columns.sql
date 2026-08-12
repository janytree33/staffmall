-- 1. orders 테이블에 배송 및 현금영수증 관련 컬럼 추가
ALTER TABLE public.orders
ADD COLUMN delivery_type text DEFAULT '방문수령',
ADD COLUMN delivery_name text,
ADD COLUMN delivery_phone text,
ADD COLUMN delivery_zipcode text,
ADD COLUMN delivery_address text,
ADD COLUMN delivery_address_detail text,
ADD COLUMN delivery_memo text,
ADD COLUMN cash_receipt_phone text;

-- 2. 이미 존재하는 데이터가 있다면 null 이 들어갔을 것이므로, 기존 데이터의 delivery_type을 '방문수령'으로 업데이트 (선택 사항)
UPDATE public.orders SET delivery_type = '방문수령' WHERE delivery_type IS NULL;
