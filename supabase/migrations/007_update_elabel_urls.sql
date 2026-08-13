-- 각 제품별 전자라벨 고유 URL 업데이트
-- 제품 이름에 포함된 키워드를 기반으로 매칭하여 URL을 업데이트합니다.

UPDATE public.products 
SET elabel_url = 'https://e-label-lyart.vercel.app/?c=AMP-HYA' 
WHERE name LIKE '%앰플런스 앰플%';

UPDATE public.products 
SET elabel_url = 'https://e-label-lyart.vercel.app/?c=AMP-HYC' 
WHERE name LIKE '%앰플런스 크림%';

UPDATE public.products 
SET elabel_url = 'https://e-label-lyart.vercel.app/?c=AMP-HYB' 
WHERE name LIKE '%버블폼%';

UPDATE public.products 
SET elabel_url = 'https://e-label-lyart.vercel.app/?c=INTO-DMC' 
WHERE name LIKE '%딥모이스처 카머%';

UPDATE public.products 
SET elabel_url = 'https://e-label-lyart.vercel.app/?c=INTO-IBC' 
WHERE name LIKE '%인텐시브 베리어%';
