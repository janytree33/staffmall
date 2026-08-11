
import './Cart.css';

export default function Cart({ cartItems, onRemoveFromCart, onCheckout, quoteHistory = [] }) {
  // 장바구니 총액 계산
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // 장바구니 총 수량 계산
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="cart-container card animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <h2 className="text-gradient">장바구니</h2>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>장바구니가 비어있습니다. 상품을 담아주세요.</p>
        </div>
      ) : (
        <>
          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="cart-item">
                <div className="cart-item-info">
                  <h4 className="item-name">{item.product.name}</h4>
                  <div className="item-details">
                    <span className="badge badge-target">{item.targetType}구매</span>
                    <span className="item-price">{item.price.toLocaleString()}원</span>
                    <span className="item-quantity">x {item.quantity}개</span>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <span className="item-subtotal">{(item.price * item.quantity).toLocaleString()}원</span>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => onRemoveFromCart(item.cartItemId)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="total-row">
              <span>총 결제액</span>
              <span className="total-price text-gradient">{totalPrice.toLocaleString()} 원</span>
            </div>

            <div className="bank-account-info" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>입금 계좌 안내</p>
              <p style={{ margin: '0.2rem 0 0 0', fontWeight: 'bold', color: 'var(--color-text)' }}>신한은행 100-026-244778 (주)제니트리</p>
            </div>

            <button 
              className="btn btn-primary checkout-btn"
              onClick={onCheckout}
            >
              견적서 복사하기 (총 {totalItemCount}건)
            </button>
          </div>
        </>
      )}

      {/* 견적 복사 이력 표시 영역 */}
      {quoteHistory && quoteHistory.length > 0 && (
        <div className="quote-history" style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>최근 견적 복사 이력 (클릭 시 재복사)</h3>
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
