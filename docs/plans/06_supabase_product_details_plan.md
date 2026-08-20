# 06_supabase_product_details_plan.md

## 1. 개요 및 배경
현재 임직원 전용 화장품 복지몰의 '상세페이지' 이미지는 프론트엔드 프로젝트의 `public/details/` 폴더에 하드코딩된 이름(`[상세페이지] 제품명.jpg`)으로 보관되어 있습니다.
이 방식은 추후 **상세페이지 디자인이 변경되거나 새 제품이 추가될 때마다 개발자가 직접 코드를 수정하고 이미지를 배포**해야 하는 큰 불편함이 있습니다.
이를 해결하기 위해, 데이터베이스(Supabase)와 클라우드 스토리지(Supabase Storage)를 활용하여 **관리자가 원할 때 언제든 상세 이미지를 교체하고 관리할 수 있도록** 동적 구조로 개편합니다.

## 2. 변경 대상 및 구조
1. **Supabase Database (`products` 테이블)**
   - `detail_image_url` (Text, nullable) 컬럼 추가.
   - 각 제품별로 연결될 상세페이지의 클라우드 주소를 저장합니다.
   
2. **Supabase Storage (`product-details` 버킷)**
   - 상세페이지 전용 클라우드 저장 공간(버킷)을 신설합니다.
   - 관리자가 이 버킷에 새로운 상세페이지 이미지(JPG, PNG 등)를 자유롭게 업로드할 수 있습니다.

3. **관리자 패널 (`src/pages/Admin.jsx`)**
   - 관리자 화면의 상품 목록(테이블)에 **'상세페이지'** 관리 열(Column)을 추가합니다.
   - '업로드' 버튼을 통해 내 PC의 이미지를 선택하면, 자동으로 Supabase Storage에 이미지가 올라가고 해당 상품의 `detail_image_url` 주소가 업데이트되는 폼을 구축합니다.

4. **사용자 화면 (`src/components/ProductList.jsx`)**
   - 현재처럼 무조건 돋보기 옆에 상세페이지 버튼을 띄우지 않습니다.
   - DB에서 불러온 해당 상품 정보에 `detail_image_url` 값이 **존재할 때만** 상세페이지 버튼이 나타나게 방어 코드를 적용합니다. (아직 상세페이지가 없는 상품 처리)

## 3. 보안 및 접근 권한 설정
- **Storage 권한**: `product-details` 버킷은 모든 임직원이 "읽기(조회)"는 가능하게 하되, "쓰기/수정(업로드)"은 인증된 관리자만 가능하도록 RLS(Row Level Security) 정책을 세팅합니다. (또는 클라이언트에서 Admin 권한 체크).

## 4. 진행 단계 (Step-by-step)
- **Step 1**: Supabase 콘솔에서 `detail_image_url` 컬럼 추가 (SQL 마이그레이션 혹은 대시보드 직접 조작).
- **Step 2**: Supabase Storage에 버킷 생성 후 권한 설정.
- **Step 3**: `Admin.jsx` 관리자 화면에 상세페이지 업로드용 UI 및 Supabase Storage SDK 업로드 로직(비동기 통신) 구축.
- **Step 4**: `ProductList.jsx`에서 렌더링 조건을 하드코딩 경로 대신 `product.detail_image_url` 값으로 교체.

## 5. 확인 사항 (사용자 승인 요청)
본 작업이 완료되면 현재 `public/details/` 폴더에 임시로 넣어둔 대용량 JPG 파일들은 더 이상 프로젝트 내에 저장할 필요가 없어지므로 삭제(경량화)할 예정입니다.
또한, 처음에는 모든 상품의 상세페이지 연결이 끊어지게 되며, 제니님께서 관리자 패널에 직접 로그인하셔서 상세페이지 이미지를 상품별로 한 번씩 다시 업로드해 주셔야 연동이 완료됩니다.
