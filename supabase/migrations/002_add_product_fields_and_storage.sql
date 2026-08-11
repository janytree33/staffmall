-- 002_add_product_fields_and_storage.sql

-- 1. products 테이블에 규격과 이미지 URL 컬럼 추가
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS spec_ml TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 기존 데이터에 규격 기본값 업데이트 (이전의 데이터가 있다면 분리)
UPDATE public.products SET spec_ml = '50ml' WHERE name LIKE '%(50ml)%';
UPDATE public.products SET spec_ml = '75ml' WHERE name LIKE '%(75ml)%';
UPDATE public.products SET spec_ml = '150ml' WHERE name LIKE '%(150ml)%';
UPDATE public.products SET spec_ml = '70ml' WHERE name LIKE '%(70ml)%';
UPDATE public.products SET spec_ml = '90ml' WHERE name LIKE '%(90ml)%';

-- 이름에서 규격 텍스트 괄호 제거 (옵션)
UPDATE public.products SET name = '앰플런스 앰플' WHERE name LIKE '앰플런스 앰플%';
UPDATE public.products SET name = '앰플런스 크림' WHERE name LIKE '앰플런스 크림%';
UPDATE public.products SET name = '앰플런스 버블폼' WHERE name LIKE '앰플런스 버블폼%';
UPDATE public.products SET name = '딥모이스처 카머' WHERE name LIKE '딥모이스처 카머%';
UPDATE public.products SET name = '인텐시브 베리어 카머' WHERE name LIKE '인텐시브 베리어 카머%';

-- 2. Supabase Storage: 'product-images' 버킷 생성 및 권한 설정
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 누구나 조회 가능하도록 정책 추가
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'product-images' );

-- 로그인 없이(익명) 누구나 업로드, 수정, 삭제 가능하도록 허용 (사내용이므로 간단하게 설정)
CREATE POLICY "Anonymous Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'product-images' );

CREATE POLICY "Anonymous Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'product-images' );

CREATE POLICY "Anonymous Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'product-images' );

-- 3. 실시간(Realtime) 구독 활성화를 위해 레플리카 속성 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
