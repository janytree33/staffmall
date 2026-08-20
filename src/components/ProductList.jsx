import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TARGET_TYPES } from '../utils/constants';
import './ProductList.css'; 

export default function ProductList({ products = [], onAddToCart, onBatchAddToCart, user, openElabelModal }) {
  // 각 상품별로 선택된 '구매 유형', '수량' 관리
  const [selections, setSelections] = useState({});
  // 상세페이지 이미지 모달 상태
  const [detailImageUrl, setDetailImageUrl] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    // eslint-disable-next-line
    setSelections(prev => {
      const newSel = { ...prev };
      products.forEach(p => {
        if (!newSel[p.id]) newSel[p.id] = { targetType: TARGET_TYPES.SELF, quantity: 0 };
      });
      return newSel;
    });
  }, [products]);

  // 구글 드라이브 링크를 이미지 태그(<img>) 렌더링용 다이렉트 링크로 변환하는 마법 함수
  const getDirectImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000`;
      }
    }
    return url;
  };

  // 팝업이 열려있을 때 뒷배경 스크롤 방지
  useEffect(() => {
    if (detailImageUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [detailImageUrl]);

  const handleTargetChange = (productId, newTargetType) => {
    setSelections(prev => ({
      ...prev,
      [productId]: { ...prev[productId], targetType: newTargetType }
    }));
  };

  const handleQuantityChange = (productId, delta) => {
    setSelections(prev => {
      const currentQty = prev[productId].quantity;
      const newQty = Math.max(0, currentQty + delta);
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity: newQty }
      };
    });
  };

  const handleQuantityInput = (productId, value) => {
    let newQty = 0;
    if (value !== '') {
      newQty = parseInt(value, 10);
      if (isNaN(newQty) || newQty < 0) newQty = 0;
    }
    setSelections(prev => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: newQty }
    }));
  };

  const selectedTotal = products.reduce((sum, product) => {
    const sel = selections[product.id];
    if (!sel) return sum;
    const price = product.prices[sel.targetType];
    return sum + (price * sel.quantity);
  }, 0);

  const selectedCount = products.reduce((sum, product) => {
    const sel = selections[product.id];
    if (!sel) return sum;
    return sum + sel.quantity;
  }, 0);

  const selectedKindCount = products.filter(p => selections[p.id] && selections[p.id].quantity > 0).length;

  return (
    <div className="product-list-container animate-fade-in">
      <h2 style={{ color: 'var(--jt-color-text)', fontWeight: '800', fontSize: '1.4rem', marginBottom: '0.5rem' }}>상품 목록</h2>
      <p style={{ color: 'var(--jt-color-text-secondary)', marginBottom: '1.5rem', fontWeight: '600' }}>
        원하시는 상품의 구매 대상과 수량을 선택한 후 장바구니에 담아주세요.
      </p>

      <div className="product-grid">
        {products.map((product) => {
          const selection = selections[product.id];
          if (!selection) return null; // 로딩 지연 방지
          
          const currentPrice = product.prices[selection.targetType];

          return (
            <div
              key={product.id}
              className="premium-card product-card"
              style={{
                opacity: 1,
                border: selection.quantity > 0 ? '2px solid var(--jt-color-accent)' : '1px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 0,
                overflow: 'hidden'
              }}
            >
              {/* 제품명+이미지 상단 */}
              <div style={{
                padding: '1.25rem 1.25rem 1rem 1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '1rem',
                borderBottom: '1.5px solid var(--jt-color-split)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', wordBreak: 'keep-all', lineHeight: '1.4' }}>
                    {product.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => openElabelModal && openElabelModal(product.elabel_url)}
                      style={{
                        background: 'var(--jt-color-primary)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: 'var(--jt-shadow-sm)'
                      }}
                      title="전자라벨 팝업 보기"
                    >
                      <span className="material-symbols-rounded" style={{ color: 'var(--jt-neutral-0)', fontSize: '15px' }}>search</span>
                    </button>

                    <button 
                      onClick={() => {
                        const originalUrl = product.detail_image_url || `/details/[상세페이지] ${product.name}.jpg`;
                        // PC, 모바일 공통: 무조건 팝업 모달로 띄움 (구글 주소면 썸네일 API 변환)
                        const modalUrl = product.detail_image_url ? getDirectImageUrl(originalUrl) : originalUrl;
                        setDetailImageUrl(modalUrl);
                      }}
                      style={{
                        background: 'var(--jt-neutral-400)', // 사용자가 요청한 회색 배경
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: 'var(--jt-shadow-sm)'
                      }}
                      title="상세페이지 이미지 보기"
                    >
                      <span className="material-symbols-rounded" style={{ color: 'var(--jt-neutral-0)', fontSize: '15px' }}>image</span>
                    </button>
                  </div>
                </div>
                
                <div style={{
                  width: '130px', height: '130px', minWidth: '130px', minHeight: '130px',
                  backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                }}>
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>이미지 준비중</div>
                  )}
                </div>
              </div>

              <div className="product-options" style={{ padding: '1rem 1.25rem 0 1.25rem' }}>
                <div className="option-group">
                  <label>구매 대상</label>
                  <select
                    className="select-input"
                    value={selection.targetType}
                    onChange={(e) => handleTargetChange(product.id, e.target.value)}
                  >
                    <option value={TARGET_TYPES.SELF}>본인구매 (월 1개 한정)</option>
                    <option value={TARGET_TYPES.FAMILY}>가족구매 (월 5개 한정)</option>
                    <option value={TARGET_TYPES.ACQUAINTANCE}>지인 구매 (제한없음)</option>
                  </select>
                </div>

                <div className="price-display" style={{ position: 'relative' }}>
                  {!user && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(3px)',
                      zIndex: 2,
                      borderRadius: '8px',
                      color: 'var(--jt-color-primary)',
                      fontWeight: 'bold',
                      fontSize: '13px'
                    }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px' }}>lock</span>
                      로그인 후 확인
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', filter: !user ? 'blur(4px)' : 'none' }}>
                    <span className="price-label">적용 단가:</span>
                    <span className="price-value">{currentPrice.toLocaleString()}원</span>
                  </div>
                </div>

                <div className="option-group quantity-group">
                  <label>수량</label>
                  <div className="quantity-controls">
                    <button 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(product.id, -1)} 
                      disabled={selection.quantity <= 0}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      className="number-input qty-input" 
                      value={selection.quantity === 0 ? '' : selection.quantity} 
                      onChange={(e) => handleQuantityInput(product.id, e.target.value)}
                      placeholder="0"
                    />
                    <button 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(product.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button 
                className="premium-btn add-to-cart-btn" 
                onClick={() => onAddToCart(product, selection.targetType, selection.quantity)} 
                disabled={selection.quantity === 0 || !user}
                style={{ margin: '0 1.25rem 1.25rem 1.25rem', width: 'calc(100% - 2.5rem)', height: 'var(--jt-control-height-lg)' }}
              >
                {!user ? '로그인 후 이용 가능' : '장바구니 담기'}
              </button>
            </div>
          );
        })}

        {/* 구매 대상별 단가표 (로그인 시에만 노출) */}
        {user && (
          <div 
            className="price-chart-card animate-fade-in" 
            style={{ 
              animationDelay: '0.05s',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400", marginRight: '6px' }}>table_view</span> 
              구매 대상별 단가표
            </h3>
            
            {/* 단가표 테이블 */}
            <div className="price-chart-table-container">
              <table className="price-chart-table">
                <thead>
                  <tr>
                    <th colSpan="2">품목</th>
                    <th>규격</th>
                    <th className="th-self" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>본인구매</th>
                    <th className="th-family" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>가족구매</th>
                    <th className="th-acquaintance" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>지인구매</th>
                  </tr>
                </thead>
                <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td colSpan="2" className="brand-cell" style={{ textAlign: 'left', paddingLeft: '1rem', wordBreak: 'keep-all' }}>{p.name}</td>
                    <td>{p.spec_ml}</td>
                    <td className="cell-self">{p.price_self.toLocaleString()}</td>
                    <td className="cell-family">{p.price_family.toLocaleString()}</td>
                    <td className="cell-acquaintance">{p.price_acquaintance.toLocaleString()}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem' }}>등록된 품목이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 안내 상자 */}
          <div 
            className="price-chart-notes" 
            style={{ 
              background: 'var(--jt-color-primary)', // 다시 다크/검정(차콜) 테마로 유지
              color: 'var(--jt-neutral-0)',
              padding: '1rem',
              borderRadius: 'var(--jt-r-md)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <span>※ 본인구매는 매달 1개 한정입니다.</span>
            <span>※ 가족구매는 매달 5개 한정입니다.</span>
            <span>※ 지인구매는 수량제한 없습니다.</span>
            
            {/* 💬 계좌 및 입금기한 안내 (배경은 검정, 강조색만 민트, 아이콘은 흰색) */}
            <div style={{ 
              borderTop: '1px solid rgba(255, 255, 255, 0.15)', 
              paddingTop: '0.6rem', 
              marginTop: '0.4rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.3rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#fff' }}>account_balance</span>
                <span>입금 계좌: <strong style={{ color: 'var(--jt-color-success)', letterSpacing: '0.5px' }}>신한 100-026-244778</strong> (주)제니트리</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#fff' }}>event_busy</span>
                <span>주문 후 <strong style={{ color: 'var(--jt-color-success)' }}>24시간 내 입금 미확인 시</strong> 자동 취소됩니다.</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <div 
        className="product-list-summary premium-card" 
        style={{ 
          marginTop: '2rem', 
          padding: 'var(--jt-space-6)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1rem', 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '500px', fontSize: '1.1rem', fontWeight: 'bold' }}>
          <span>선택한 품목:</span>
          <span>{selectedKindCount}종 (총 {selectedCount}개)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '500px', fontSize: '1.4rem', fontWeight: 'bold' }}>
          <span>실시간 예상 합계:</span>
          <span style={{ fontSize: '1.6rem', color: 'var(--jt-color-accent)' }}>{selectedTotal.toLocaleString()}원</span>
        </div>
        <button 
          className="premium-btn" 
          style={{ 
            width: '100%', 
            maxWidth: '500px', 
            height: 'var(--jt-control-height-lg)', 
            fontSize: '1.1rem', 
          }} 
          onClick={() => {
            const itemsToAdd = products.filter(p => selections[p.id] && selections[p.id].quantity > 0).map(p => ({ product: p, targetType: selections[p.id].targetType, quantity: selections[p.id].quantity }));
            if (itemsToAdd.length === 0) { alert("선택된 상품이 없습니다. 수량을 1개 이상으로 조절해 주세요."); return; }
            onBatchAddToCart(itemsToAdd);
          }}
        >
          선택한 {selectedKindCount}종 상품 장바구니에 일괄 담기
        </button>
      </div>
      
      {/* 상세페이지 팝업 모달 */}
      {detailImageUrl && createPortal(
        <div 
          className="modal-overlay animate-fade-in" 
          onClick={() => { setDetailImageUrl(null); setZoomLevel(100); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', // 너무 시커멓지 않게 밝게 조절
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            zIndex: 999999, // z-index 대폭 강화
            padding: '6vh 16px', // 화면 중앙보단 약간 상단에 위치하도록 조절
            overflowY: 'auto' 
          }}
        >
          <div 
            className="modal-content premium-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', 
              maxWidth: `${9.4 * zoomLevel}px`, // 100%일 때 약 940px (방금 전의 125% 크기를 100%로)
              backgroundColor: '#fff', borderRadius: '16px',
              display: 'flex', flexDirection: 'column',
              position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              transition: 'max-width 0.2s ease-out'
            }}
          >
            <div style={{ position: 'sticky', top: 0, padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', zIndex: 10, borderRadius: '16px 16px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--jt-color-text)' }}>제품 상세페이지</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--jt-neutral-50)', padding: '4px 6px', borderRadius: 'var(--jt-r-md)' }}>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                    style={{ border: 'none', background: 'var(--jt-neutral-0)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                    title="축소"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>remove</span>
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', width: '45px', textAlign: 'center', color: 'var(--jt-color-text)' }}>{zoomLevel}%</span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(300, prev + 25))}
                    style={{ border: 'none', background: 'var(--jt-neutral-0)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                    title="확대"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                  </button>
                </div>

                <button 
                  onClick={() => { setDetailImageUrl(null); setZoomLevel(100); }} 
                  style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: 'var(--jt-color-text)', lineHeight: 1, padding: '0 4px' }}
                  title="닫기"
                >
                  &times;
                </button>
              </div>
            </div>
            {/* 모달 창 크기에 맞춰서 이미지는 100%로 렌더링 */}
            <div style={{ backgroundColor: '#f9fafb', padding: 0 }}>
              <img src={detailImageUrl} alt="상세페이지" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}