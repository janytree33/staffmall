
import './Cart.css';

export default function Cart({ cartItems, onRemoveFromCart, onCheckout, quoteHistory = [] }) {
  // 장바구니 총액 계산
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // 장바구니 총 수량 계산
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 본인 -> 가족 -> 지인 순서로 정렬
  const targetOrder = { '본인': 1, '가족': 2, '지인': 3 };
  const sortedCartItems = [...cartItems].sort((a, b) => {
    const orderA = targetOrder[a.targetType] || 99;
    const orderB = targetOrder[b.targetType] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.product.name.localeCompare(b.product.name);
  });

  return (
    <div className="cart-container premium-card animate-fade-in" style={{ animationDelay: '0.1s', padding: 'var(--jt-space-6)' }}>
      <h2 style={{ color: 'var(--jt-color-text)', fontWeight: 800, margin: '0 0 var(--jt-space-5) 0', fontSize: '1.5rem' }}>장바구니</h2>
      
      {sortedCartItems.length === 0 ? (
        <div className="empty-cart">
          <p>장바구니가 비어있습니다. 상품을 담아주세요.</p>
        </div>
      ) : (
        <>
          <div className="cart-items-list">
            {sortedCartItems.map((item) => (
              <div key={item.cartItemId} className="cart-item">
                <div className="cart-item-info">
                  <h4 className="item-name">{item.product.name}</h4>
                  <div className="item-details">
                    <span className={`badge badge-${item.targetType}`}>{item.targetType}구매</span>
                    <span className="item-price">{item.price.toLocaleString()}원</span>
                    <span className="item-quantity">x {item.quantity}개</span>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <span className="item-subtotal" style={{ fontWeight: 700 }}>{(item.price * item.quantity).toLocaleString()}원</span>
                  <button 
                    style={{ background: 'none', border: 'none', padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s', opacity: 0.7, color: 'var(--jt-color-text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--jt-seed-color-error)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.color = 'var(--jt-color-text-secondary)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onClick={() => onRemoveFromCart(item.cartItemId)}
                    title="삭제"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: '2px solid var(--jt-color-border)' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>총 결제액</span>
              <span className="total-price" style={{ color: 'var(--jt-color-accent)', fontWeight: 800, fontSize: '1.5rem' }}>{totalPrice.toLocaleString()} 원</span>
            </div>

            <div className="bank-account-info" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: 'var(--jt-neutral-50)', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--jt-color-text-secondary)' }}>입금 계좌 안내</p>
              <p style={{ margin: '0.2rem 0 0 0', fontWeight: 'bold', color: 'var(--jt-color-text)' }}>신한은행 100-026-244778 (주)제니트리</p>
            </div>

            <button 
              className="premium-btn checkout-btn"
              style={{ width: '100%', height: 'var(--jt-control-height-lg)', fontSize: '1.1rem' }}
              onClick={onCheckout}
            >
              주문하기 (총 {totalItemCount}건)
            </button>
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
