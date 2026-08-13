-- products 테이블에 전자라벨 URL(elabel_url) 컬럼 추가
-- 이 컬럼에는 'https://e-label-lyart.vercel.app/product/aqua' 와 같은 제품별 고유 URL이 들어갑니다.
-- URL이 없을 경우 프론트엔드에서 기본 메인 주소(https://e-label-lyart.vercel.app/)를 띄우도록 처리합니다.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS elabel_url text;

-- 주석(Comment) 추가
COMMENT ON COLUMN public.products.elabel_url IS '제품별 전자라벨 고유 URL 주소';
