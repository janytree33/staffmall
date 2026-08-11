import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AdminPanel.css';

export default function AdminPanel({ members, products }) {
  // 멤버 추가 폼 상태
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPin, setNewMemberPin] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // 상품 추가 폼 상태
  const [newProductName, setNewProductName] = useState('');
  const [newProductSpec, setNewProductSpec] = useState('');
  const [priceSelf, setPriceSelf] = useState('');
  const [priceFamily, setPriceFamily] = useState('');
  const [priceAcq, setPriceAcq] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // 숨겨진 파일 인풋 참조
  const fileInputRef = useRef(null);
  const [uploadingProductId, setUploadingProductId] = useState(null);

  // ===== [멤버 관리 로직] =====
  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberPin.trim() || newMemberPin.length !== 4) {
      alert("직원 이름과 비밀번호(초기 4자리)를 정확히 입력해주세요.");
      return;
    }
    setIsAddingMember(true);
    try {
      const { error } = await supabase.from('members').insert({
        name: newMemberName.trim(),
        phone_last_4_hashed: newMemberPin.trim()
      });
      if (error) throw error;
      setNewMemberName('');
      setNewMemberPin('');
    } catch (e) {
      console.error(e);
      alert("직원 추가에 실패했습니다.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("이 직원을 삭제하시겠습니까? (기존 주문 이력은 보존되지 않을 수 있습니다)")) return;
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  // ===== [상품 관리 로직] =====
  const handleAddProduct = async () => {
    if (!newProductName.trim() || !priceSelf || !priceFamily || !priceAcq) {
      alert("상품명과 단가를 모두 입력해주세요.");
      return;
    }
    setIsAddingProduct(true);
    try {
      const { error } = await supabase.from('products').insert({
        name: newProductName.trim(),
        spec_ml: newProductSpec.trim() || '단품',
        price_self: parseInt(priceSelf),
        price_family: parseInt(priceFamily),
        price_acquaintance: parseInt(priceAcq),
        image_url: '' // 기본 빈 이미지
      });
      if (error) throw error;
      
      setNewProductName('');
      setNewProductSpec('');
      setPriceSelf('');
      setPriceFamily('');
      setPriceAcq('');
    } catch (e) {
      console.error(e);
      alert("상품 추가에 실패했습니다.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("이 화장품 품목을 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  // 사진 업로드 클릭
  const handleUploadClick = (productId) => {
    setUploadingProductId(productId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 실제 사진 업로드 처리 (Supabase Storage)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingProductId) return;

    try {
      // 1. 파일 이름 난수화
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      alert("사진을 업로드 중입니다. 잠시만 기다려주세요...");

      // 2. Storage 버킷에 업로드
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Public URL 가져오기
      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 4. Products 테이블 업데이트
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', uploadingProductId);

      if (updateError) throw updateError;
      
      alert("사진이 성공적으로 변경되었습니다! 화면에 실시간 반영됩니다.");
    } catch (error) {
      console.error(error);
      alert("사진 업로드 중 오류가 발생했습니다. 권한이나 용량을 확인해주세요.");
    } finally {
      setUploadingProductId(null);
      e.target.value = null; // input 초기화
    }
  };

  return (
    <div className="admin-panel-container animate-fade-in">
      <div className="admin-header">
        <h2>⚙️ 제니트리 종합 관리자 설정</h2>
        <span className="sync-badge">☁️ 실시간 DB 동기화 활성</span>
      </div>

      <div className="admin-grid">
        {/* --- [좌측] 멤버 관리 --- */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>👥 직원 명부 관리 ({members.length}명)</h3>
          </div>
          
          <div className="input-group">
            <input 
              type="text" 
              placeholder="직원 성함 (예: 홍길동)" 
              value={newMemberName} 
              onChange={e => setNewMemberName(e.target.value)}
              style={{ flex: 1 }}
            />
            <input 
              type="text" 
              placeholder="초기 비번 4자리" 
              maxLength={4}
              value={newMemberPin} 
              onChange={e => setNewMemberPin(e.target.value)}
              style={{ width: '130px', flex: 'none' }}
            />
            <button className="btn-add" onClick={handleAddMember} disabled={isAddingMember}>
              {isAddingMember ? '추가중' : '추가 👤'}
            </button>
          </div>

          <div className="list-container">
            {members.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
              <div key={m.id} className="list-item">
                <div className="item-info">
                  <span className="item-name">{m.name}</span>
                  <span className="item-sub">비밀번호: {m.phone_last_4_hashed}</span>
                </div>
                <button className="btn-icon btn-delete" onClick={() => handleDeleteMember(m.id)}>
                  ✕
                </button>
              </div>
            ))}
            {members.length === 0 && <p style={{ color: 'gray', textAlign: 'center', padding: '1rem' }}>등록된 직원이 없습니다.</p>}
          </div>
        </div>

        {/* --- [우측] 화장품 메뉴판 관리 --- */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h3>💄 화장품 품목 관리 ({products.length}개)</h3>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px dashed #cbd5e1' }}>
            <div className="input-group" style={{ marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="추가할 화장품 이름 (예: 앰플런스 크림)" 
                value={newProductName} 
                onChange={e => setNewProductName(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="규격 (예: 50ml)" 
                value={newProductSpec} 
                onChange={e => setNewProductSpec(e.target.value)}
                style={{ width: '100px', flex: 'none' }}
              />
            </div>
            <div className="product-form-grid">
              <input type="number" placeholder="본인단가" value={priceSelf} onChange={e => setPriceSelf(e.target.value)} />
              <input type="number" placeholder="가족단가" value={priceFamily} onChange={e => setPriceFamily(e.target.value)} />
              <input type="number" placeholder="지인단가" value={priceAcq} onChange={e => setPriceAcq(e.target.value)} style={{ gridColumn: '1 / -1' }} />
            </div>
            <button className="btn-add" style={{ width: '100%', padding: '0.8rem', justifyContent: 'center' }} onClick={handleAddProduct} disabled={isAddingProduct}>
              {isAddingProduct ? '추가중...' : '새로운 화장품 품목 등록하기 🌟'}
            </button>
          </div>

          <div className="list-container">
            {products.sort((a,b) => a.id - b.id).map(p => (
              <div key={p.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                  {/* 썸네일 */}
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="product-thumbnail" />
                  ) : (
                    <div className="product-thumbnail" style={{ backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>No Img</div>
                  )}
                  
                  <div className="item-info">
                    <span className="item-name">{p.name} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>({p.spec_ml})</span></span>
                    <span className="item-sub">본:{p.price_self} / 가:{p.price_family} / 지:{p.price_acquaintance}</span>
                  </div>
                </div>

                <div className="item-actions">
                  <button className="btn-upload" onClick={() => handleUploadClick(p.id)}>
                    🖼️ 사진변경
                  </button>
                  <button className="btn-icon btn-delete" onClick={() => handleDeleteProduct(p.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && <p style={{ color: 'gray', textAlign: 'center', padding: '1rem' }}>등록된 품목이 없습니다.</p>}
          </div>
        </div>
      </div>

      {/* 숨겨진 파일 인풋 (사진 업로드용) */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />
      
      <div style={{ marginTop: '1.5rem', backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '8px', color: '#065f46', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>☁️</span> <strong>Supabase 실시간 DB 안내:</strong> 관리자가 위에서 등록/수정/삭제한 데이터는 즉각적으로 Supabase에 반영되며, 모든 사용자의 쇼핑몰 화면이 새로고침 없이 최신 상태로 바뀝니다.
      </div>
    </div>
  );
}
