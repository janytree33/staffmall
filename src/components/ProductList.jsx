import { useState, useEffect } from 'react';
import { TARGET_TYPES } from '../utils/constants';
import './ProductList.css'; 

export default function ProductList({ products = [], onAddToCart, onBatchAddToCart }) {
  // 각 상품별로 선택된 '구매 유형', '수량' 관리
  const [selections, setSelections] = useState({});

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
      <h2 style={{ color: 'var(--jt-color-text)', fontWeight: '800', fontSize: '1.8rem', marginBottom: '0.5rem' }}>상품 목록</h2>
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
              className="card product-card"
              style={{
                opacity: 1,
                transition: 'all 0.3s ease',
                border: selection.quantity > 0 ? '2px solid #06b6d4' : '1.5px solid rgba(6,182,212,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 0,
                overflow: 'hidden'
              }}
            >
              {/* 제품명+이미지 상단: 불투명한 그라데이션 배경 */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(224,242,254,0.97) 100%)',
                padding: '1.25rem 1.25rem 1rem 1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '1rem',
                borderBottom: '1.5px solid rgba(6,182,212,0.15)'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', wordBreak: 'keep-all', lineHeight: '1.4', flex: 1 }}>
                  {product.name}
                </h3>
                
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

                <div className="price-display">
                  <span className="price-label">적용 단가:</span>
                  <span className="price-value">{currentPrice.toLocaleString()}원</span>
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
                      value={selection.quantity} 
                      readOnly 
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
                className="btn btn-primary add-to-cart-btn" 
                onClick={() => onAddToCart(product, selection.targetType, selection.quantity)} 
                disabled={selection.quantity === 0}
                style={{ margin: '0 1.25rem 1.25rem 1.25rem', width: 'calc(100% - 2.5rem)' }}
              >
                장바구니 담기
              </button>
            </div>
          );
        })}

        {/* 6번째 칸: 단가표 상단 + 하단 검정 박스 구조 고정 */}
        <div 
          className="price-chart-card animate-fade-in" 
          style={{ 
            animationDelay: '0.05s',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <h3 style={{ margin: 0 }}>💡 구매 대상별 단가표</h3>
          
          {/* 단가표 테이블 */}
          <div className="price-chart-table-container">
            <table className="price-chart-table">
              <thead>
                <tr>
                  <th colSpan="2">품목</th>
                  <th>규격</th>
                  <th className="th-self">본인구매</th>
                  <th className="th-family">가족구매</th>
                  <th className="th-acquaintance">지인구매</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td colSpan="2" className="brand-cell" style={{ textAlign: 'left', paddingLeft: '1rem' }}>{p.name}</td>
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
              background: '#1e293b', 
              color: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
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
            
            {/* 💬 [수정 완료] '익일 자정까지' 반영 및 정렬 세팅 */}
            <div style={{ 
              borderTop: '1px solid #334155', 
              paddingTop: '0.6rem', 
              marginTop: '0.4rem', 
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <div>
                <span style={{ marginRight: '4px' }}>💰</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>계좌:</span> 신한은행 100-026-244778 (주)제니트리
              </div>
              <div>
                <span style={{ marginRight: '4px' }}>⏰</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>입금기한:</span> 익일 자정까지
              </div>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="product-list-summary card" 
        style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          backgroundColor: '#fdfbff', 
          border: '1px solid #e9d5ff', 
          borderRadius: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1rem', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '500px', fontSize: '1.1rem', fontWeight: 'bold' }}>
          <span>선택한 품목:</span>
          <span>{selectedKindCount}종 (총 {selectedCount}개)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '500px', fontSize: '1.4rem', fontWeight: 'bold' }}>
          <span>실시간 예상 합계:</span>
          <span className="text-gradient" style={{ fontSize: '1.6rem' }}>{selectedTotal.toLocaleString()}원</span>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ 
            width: '100%', 
            maxWidth: '500px', 
            padding: '0.9rem 1.5rem', 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            borderRadius: '8px' 
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
    </div>
  );
}