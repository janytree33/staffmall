-- 1. products 테이블에 detail_image_url 컬럼 추가 (구글 드라이브 등 외부 링크 저장용)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS detail_image_url text;
