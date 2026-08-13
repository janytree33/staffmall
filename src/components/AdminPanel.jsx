import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AdminPanel.css';

export default function AdminPanel({ members, products }) {
  // 멤버 추가 폼 상태
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
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

  // ===== [주문 내역 끊김 복구(동기화) 로직] =====
  const handleRecoverOrders = async () => {
    if (!window.confirm("혹시 직원분들의 마이페이지에 옛날 주문이 안 보이시나요?\n직원 계정을 새로 만들면서 끊어진 과거 주문 기록들을 '이름' 기준으로 현재 계정에 다시 싹 연결해 드릴까요?")) return;
    
    try {
      alert("주문 기록을 스캔하여 복구 중입니다... 잠시만 기다려주세요.");
      
      // 1. 모든 멤버 가져오기
      const { data: allMembers, error: mErr } = await supabase.from('members').select('*');
      if (mErr) throw mErr;

      // 2. 모든 주문 가져오기 (기존 멤버 정보 조인)
      const { data: allOrders, error: oErr } = await supabase.from('orders').select('id, member_id, members(name)');
      if (oErr) throw oErr;

      let updateCount = 0;
      
      // 3. 복구 시작
      for (let order of allOrders) {
        if (!order.members || !order.members.name) continue;
        const orderName = order.members.name;
        
        // 해당 이름을 가진 현재 계정들 찾기
        const matchingMembers = allMembers.filter(m => m.name === orderName);
        if (matchingMembers.length === 0) continue;
        
        // 최우선순위: 이메일이 등록된 계정 -> ID가 높은(가장 최근에 만든) 계정
        matchingMembers.sort((a, b) => {
          if (a.email && !b.email) return -1;
          if (!a.email && b.email) return 1;
          return b.id - a.id; // 내림차순 정렬
        });
        
        const targetMemberId = matchingMembers[0].id;
        
        // 현재 주문의 member_id가 찾아낸 최신 계정의 id와 다르다면 (계정을 지웠다 새로 만든 경우) 업데이트
        if (order.member_id !== targetMemberId) {
          const { error: upErr } = await supabase.from('orders').update({ member_id: targetMemberId }).eq('id', order.id);
          if (!upErr) updateCount++;
        }
      }
      
      alert(`🎉 마법 복구 완료!\n총 ${updateCount}건의 끊어진 주문을 현재 계정으로 다시 완벽하게 연결했습니다. 마이페이지를 새로고침 해보세요!`);
    } catch (err) {
      console.error(err);
      alert("복구 중 오류가 발생했습니다.");
    }
  };

  // ===== [멤버 관리 로직] =====
  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPin.trim()) {
      alert("직원 이름, 이메일, 초기 비밀번호를 정확히 입력해주세요.");
      return;
    }

    setIsAddingMember(true);
    const { data, error } = await supabase
      .from('members')
      .insert([{ 
        name: newMemberName.trim(), 
        email: newMemberEmail.trim(),
        phone_last_4_hashed: newMemberPin 
      }])
      .select();

    if (error) {
      console.error("멤버 추가 에러:", error);
      alert("멤버 추가에 실패했습니다. (동일한 이메일이 이미 존재할 수 있습니다.)");
    } else if (data && data.length > 0) {
      alert("멤버가 성공적으로 추가되었습니다.");
      window.location.reload();
    }
    setIsAddingMember(false);
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("이 직원을 삭제하시겠습니까? (기존 주문 이력은 보존되지 않을 수 있습니다)")) return;
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      alert("삭제되었습니다.");
      window.location.reload();
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
        <h2><span className="material-symbols-rounded" style={{ fontSize: '24px', marginRight: '8px', verticalAlign: 'bottom' }}>settings</span> 제니트리 종합 관리자 설정</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="premium-btn" 
            onClick={handleRecoverOrders}
            style={{ backgroundColor: 'var(--jt-color-accent)', color: 'white', padding: '0 1rem', height: '32px', fontSize: '13px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom' }}>magic_button</span> 끊어진 옛날 주문 복구하기
          </button>
          <span className="sync-badge"><span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom' }}>cloud_sync</span> 실시간 DB 동기화 활성</span>
        </div>
      </div>

      <div className="admin-grid">
        {/* --- [좌측] 멤버 관리 --- */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h3><span className="material-symbols-rounded" style={{ fontSize: '20px', marginRight: '6px', verticalAlign: 'text-bottom' }}>group</span> 직원 명부 관리 ({members.length}명)</h3>
          </div>
          
          <div className="input-group">
            <input 
              type="text" 
              placeholder="성함 (예: 홍길동)" 
              value={newMemberName} 
              onChange={e => setNewMemberName(e.target.value)}
              style={{ flex: 1, minWidth: '100px' }}
            />
            <input 
              type="email" 
              placeholder="이메일 (아이디)" 
              value={newMemberEmail} 
              onChange={e => setNewMemberEmail(e.target.value)}
              style={{ flex: 2, minWidth: '150px' }}
            />
            <input 
              type="text" 
              placeholder="초기 비번" 
              value={newMemberPin} 
              onChange={e => setNewMemberPin(e.target.value)}
              style={{ width: '100px', flex: 'none' }}
            />
            <button className="btn-add" onClick={handleAddMember} disabled={isAddingMember}>
              {isAddingMember ? '추가중' : <><span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px', verticalAlign: 'text-bottom' }}>person_add</span> 추가</>}
            </button>
          </div>

          <div className="list-container">
            {members.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
              <div key={m.id} className="list-item">
                <div className="item-info">
                  <span className="item-name">{m.name}</span>
                  <span className="item-sub">이메일: {m.email || '미등록'} | 비밀번호: {m.phone_last_4_hashed}</span>
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
            <h3><span className="material-symbols-rounded" style={{ fontSize: '20px', marginRight: '6px', verticalAlign: 'text-bottom' }}>category</span> 화장품 품목 관리 ({products.length}개)</h3>
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
              {isAddingProduct ? '추가중...' : <><span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px', verticalAlign: 'text-bottom' }}>add_circle</span> 새로운 화장품 품목 등록하기</>}
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
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom' }}>image</span> 사진변경
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
        <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#059669' }}>cloud</span> <strong>Supabase 실시간 DB 안내:</strong> 관리자가 위에서 등록/수정/삭제한 데이터는 즉각적으로 Supabase에 반영되며, 모든 사용자의 쇼핑몰 화면이 새로고침 없이 최신 상태로 바뀝니다.
      </div>
    </div>
  );
}
