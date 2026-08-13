import './Cart.css';

export default function Cart({ cartItems, onRemoveFromCart, onCheckout, user, quoteHistory = [] }) {
  // 장바구니 총액 계산
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // 장바구니 총 수량 계산
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 구매 대상별로 장바구니 아이템 그룹화
  const groupedCart = cartItems.reduce((acc, item) => {
    if (!acc[item.targetType]) acc[item.targetType] = [];
    acc[item.targetType].push(item);
    return acc;
  }, {});

  const getHeaderIcon = (targetType) => {
    switch (targetType) {
      case '본인': return 'person';
      case '가족': return 'family_restroom';
      case '지인': return 'redeem'; // 선물 상자 모양
      default: return '';
    }
  };

  const renderHeaderIcon = (targetType) => {
    return (
      <span 
        className="material-symbols-rounded" 
        style={{ 
          fontSize: '18px', 
          fontVariationSettings: "'FILL' 1, 'wght' 600",
          verticalAlign: 'text-bottom'
        }}
      >
        {getHeaderIcon(targetType)}
      </span>
    );
  };

  const getBadgeClass = (targetType) => {
    switch (targetType) {
      case '본인': return 'badge-self';
      case '가족': return 'badge-family';
      case '지인': return 'badge-acquaintance';
      default: return '';
    }
  };

  return (
    <div className="cart-container premium-card animate-fade-in" style={{ animationDelay: '0.1s', padding: 'var(--jt-space-6)' }}>
      <h2 style={{ color: 'var(--jt-color-text)', fontWeight: 800, margin: '0 0 var(--jt-space-5) 0', fontSize: '1.2rem' }}>장바구니</h2>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>장바구니가 비어있습니다. 상품을 담아주세요.</p>
        </div>
      ) : (
        <>
          <div className="cart-items-list">
            {['본인', '가족', '지인'].map((type) => {
              const groupItems = groupedCart[type];
              if (!groupItems || groupItems.length === 0) return null;
              
              // 그룹 내 아이템 정렬 (상품명 기준)
              groupItems.sort((a, b) => a.product.name.localeCompare(b.product.name));

              return (
                <div key={type} className="cart-group-card">
                  <div className="cart-group-header">
                    <span className={`badge ${getBadgeClass(type)}`}>
                      <span style={{ marginRight: '4px' }}>{renderHeaderIcon(type)}</span>
                      {type}구매
                    </span>
                  </div>
                  
                  <div className="cart-group-items">
                    {groupItems.map((item) => (
                      <div key={item.cartItemId} className="cart-group-item">
                        <div className="cart-group-item-info">
                          <span className="item-name">{item.product.name}</span>
                          <div className="cart-item-price-info" style={{ filter: !user ? 'blur(8px)' : 'none', userSelect: !user ? 'none' : 'auto' }}>
                            <span className="item-price-qty">{item.price.toLocaleString()}원 x {item.quantity}개</span>
                          </div>
                        </div>
                        <div className="cart-group-item-actions">
                          <span className="item-subtotal" style={{ filter: !user ? 'blur(8px)' : 'none', userSelect: !user ? 'none' : 'auto' }}>{(item.price * item.quantity).toLocaleString()}원</span>
                          <button 
                            className="delete-btn"
                            onClick={() => onRemoveFromCart(item.cartItemId)}
                            title="삭제"
                          >
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="cart-footer">
              <div style={{ position: 'relative' }}>
                {!user && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 2,
                    borderRadius: '8px',
                    color: 'var(--jt-color-primary)',
                    fontWeight: 'bold',
                    fontSize: '15px'
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '20px', marginRight: '4px' }}>lock</span>
                    로그인 후 가격 및 결제 가능
                  </div>
                )}
                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: '2px solid var(--jt-color-border)', filter: !user ? 'blur(8px)' : 'none', userSelect: !user ? 'none' : 'auto' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>총 결제액</span>
                  <span className="total-price" style={{ color: 'var(--jt-color-accent)', fontWeight: 800, fontSize: '1.5rem' }}>{totalPrice.toLocaleString()} 원</span>
                </div>

                <div className="bank-account-info" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: 'var(--jt-neutral-50)', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--jt-color-text-secondary)' }}>입금 계좌 안내</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: 'bold', color: 'var(--jt-color-text)' }}>신한은행 100-026-244778 (주)제니트리</p>
                </div>

                <button 
                  className="premium-btn checkout-btn"
                  style={{ width: '100%', height: 'var(--jt-control-height-lg)', fontSize: '1.1rem', filter: !user ? 'blur(2px)' : 'none' }}
                  onClick={onCheckout}
                  disabled={!user}
                >
                  주문하기 (총 {totalItemCount}건)
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 견적 복사 이력 표시 영역 */}
      {quoteHistory && quoteHistory.length > 0 && (
        <div className="quote-history" style={{ marginTop: '2rem', borderTop: '1px solid var(--jt-color-border)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--jt-color-text)' }}>최근 견적 복사 이력 (클릭 시 재복사)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {quoteHistory.map((historyItem) => (
              <button 
                key={historyItem.id}
                onClick={() => {
                  navigator.clipboard.writeText(historyItem.text).then(() => {
                    alert("이전 견적서가 복사되었습니다.\n\n" + historyItem.text);
                  }).catch(() => {
                    alert("견적서 복사에 실패했습니다.");
                  });
                }}
                style={{
                  textAlign: 'left',
                  padding: '0.8rem',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{historyItem.timeString}</span>
                <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>{historyItem.summary}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
