import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { sendTelegramCancelAlert, sendEmailReceipt } from '../utils/notificationService';

export default function MyPage() {
  // 📞 전화번호 자동 하이픈(-) 포맷팅 함수 (렌더링 용)
  const formatPhoneNumber = (value) => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, ''); // 숫자 이외의 문자 제거
    const match = cleaned.match(/^(\d{0,3})(\d{0,4})(\d{0,4})$/);
    if (!match) return cleaned;
    
    if (match[3]) return `${match[1]}-${match[2]}-${match[3]}`;
    if (match[2]) return `${match[1]}-${match[2]}`;
    return match[1];
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = () => {
      const storedUser = localStorage.getItem('custom_user');
      
      if (!storedUser) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
        return;
      }
      
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setLoading(false);
        fetchOrders(parsedUser.id);
      } catch (error) {
        console.error('Session loading error:', error);
        alert('로그인 정보가 손상되었습니다. 다시 로그인해주세요.');
        navigate('/login');
      }
    };

    const fetchOrders = async (userId) => {
      setLoadingOrders(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            total_price,
            status,
            created_at,
            delivery_type,
            delivery_name,
            delivery_phone,
            delivery_address,
            delivery_address_detail,
            delivery_memo,
            cash_receipt_phone,
            order_items ( product_name, target_type, quantity, price )
          `)
          .eq('member_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('주문 내역 로딩 실패:', err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('custom_user');
    window.dispatchEvent(new Event('storage')); // Home.jsx 등에 로그아웃 이벤트 알림
    navigate('/');
  };

  const openCancelModal = (orderId) => {
    setTargetOrderId(orderId);
    setShowCancelModal(true);
  };

  const handleCancelOrder = async () => {
    if (!targetOrderId) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: '주문취소' })
        .eq('id', targetOrderId);

      if (error) throw error;
      
      // 화면 갱신
      const updatedOrders = orders.map(order => 
        order.id === targetOrderId ? { ...order, status: '주문취소' } : order
      );
      setOrders(updatedOrders);
      
      // 🚀 텔레그램 취소 알림 발송
      try {
        await sendTelegramCancelAlert(user?.name, targetOrderId);
        
        // 📧 이메일 취소 알림 발송 (직원 본인에게)
        const targetOrder = orders.find(o => o.id === targetOrderId);
        if (targetOrder) {
          await sendEmailReceipt('cancel', user, {
            orderId: targetOrderId,
            items: targetOrder.order_items,
            totalPrice: targetOrder.total_price
          });
        }
      } catch (err) {
        console.error('취소 알림 발송 오류:', err);
      }
      
    } catch (err) {
      console.error('주문 취소 실패:', err);
      alert('주문 취소 중 오류가 발생했습니다.');
    } finally {
      setShowCancelModal(false);
      setTargetOrderId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--jt-bg-layout)' }}>
        <p style={{ color: 'var(--jt-color-text-secondary)' }}>정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--jt-bg-layout)',
      padding: 'var(--jt-space-7) var(--jt-space-4)',
      fontFamily: 'var(--jt-seed-font-base)'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* 상단 네비게이션 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--jt-space-6)' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--jt-color-text)' }}>마이페이지</h1>
          <div>
            <button 
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: 'var(--jt-space-2) var(--jt-space-4)',
                marginRight: 'var(--jt-space-3)',
                backgroundColor: 'var(--jt-bg-container)',
                border: '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-md)',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--jt-color-text)'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>shopping_cart</span>
              쇼핑하러 가기
            </button>
            <button 
              onClick={handleLogout}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: 'var(--jt-space-2) var(--jt-space-4)',
                backgroundColor: 'transparent',
                border: '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-md)',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--jt-color-text-secondary)'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>logout</span>
              로그아웃
            </button>
          </div>
        </div>

        {/* 내 정보 카드 */}
        <div className="premium-card" style={{
          padding: 'var(--jt-space-6)',
          marginBottom: 'var(--jt-space-6)'
        }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 var(--jt-space-5) 0', color: 'var(--jt-color-text)', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px', marginRight: 'var(--jt-space-2)', color: 'var(--jt-color-primary)', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>eco</span>
            로그인 정보
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--jt-neutral-50)', padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)' }}>
              <span style={{ color: 'var(--jt-color-text-secondary)', fontWeight: 600 }}>직원 성함</span>
              <span style={{ color: 'var(--jt-color-text)', fontWeight: 700, fontSize: '16px' }}>{user?.name}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--jt-space-2)' }}>
              <button 
                className="premium-btn"
                onClick={() => navigate('/update-password')}
                style={{
                  padding: '0 var(--jt-space-5)',
                  height: 'var(--jt-control-height)',
                  backgroundColor: 'var(--jt-neutral-100)',
                  color: 'var(--jt-neutral-700)',
                  border: '1px solid var(--jt-color-border)',
                }}
              >
                비밀번호 변경
              </button>
            </div>
          </div>
        </div>

        {/* 내 주문 내역 컨테이너 */}
        <div className="premium-card" style={{
          padding: 'var(--jt-space-6)'
        }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 var(--jt-space-5) 0', color: 'var(--jt-color-text)', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px', marginRight: 'var(--jt-space-2)', color: 'var(--jt-color-primary)', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>eco</span>
            내 주문 내역
          </h2>
          
          {loadingOrders ? (
            <div style={{ padding: 'var(--jt-space-6) 0', textAlign: 'center', color: 'var(--jt-color-text-tertiary)' }}>
              주문 내역을 불러오는 중입니다...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: 'var(--jt-space-6) 0', textAlign: 'center', color: 'var(--jt-color-text-tertiary)' }}>
              <p>아직 연결된 주문 내역이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-4)' }}>
              {orders.map((order) => (
                <div key={order.id} style={{ 
                  border: '1px solid var(--jt-color-border)', 
                  borderRadius: 'var(--jt-r-md)',
                  padding: 'var(--jt-space-4)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--jt-space-3)', borderBottom: '1px solid var(--jt-color-split)', paddingBottom: 'var(--jt-space-2)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--jt-color-text-secondary)' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                    <span style={{ 
                      padding: '0.3rem 0.6rem', borderRadius: 'var(--jt-r-md)', fontSize: '0.8rem', fontWeight: 'bold',
                      backgroundColor: order.status === '입금대기' ? 'var(--jt-neutral-100)' : order.status === '입금완료' ? '#ecfdf5' : 'var(--jt-danger-50)',
                      color: order.status === '입금대기' ? 'var(--jt-neutral-700)' : order.status === '입금완료' ? '#047857' : 'var(--jt-color-danger)'
                    }}>
                      {order.status}
                    </span>
                  </div>
                  
                  {/* 배송 및 결제 정보 */}
                  <div style={{ backgroundColor: 'var(--jt-neutral-50)', padding: 'var(--jt-space-3)', borderRadius: 'var(--jt-r-md)', marginBottom: 'var(--jt-space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', marginRight: '6px' }}>수령 방법:</span>
                        <span style={{ color: order.delivery_type === '택배배송' ? 'var(--jt-color-primary)' : 'var(--jt-color-text)', fontWeight: 'bold' }}>{order.delivery_type || '방문수령'}</span>
                      </div>
                      {order.cash_receipt_phone && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '6px' }}>현금영수증:</span>
                          <span>{formatPhoneNumber(order.cash_receipt_phone)}</span>
                        </div>
                      )}
                    </div>
                    {order.delivery_type === '택배배송' && (
                      <div style={{ marginTop: 'var(--jt-space-2)', fontSize: '12px', color: 'var(--jt-color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>수령인:</span> {order.delivery_name} ({formatPhoneNumber(order.delivery_phone)})</div>
                        <div><span style={{ fontWeight: 'bold' }}>배송지:</span> {order.delivery_address} {order.delivery_address_detail}</div>
                        {order.delivery_memo && <div><span style={{ fontWeight: 'bold' }}>요청사항:</span> {order.delivery_memo}</div>}
                      </div>
                    )}
                  </div>

                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-2)' }}>
                    {order.order_items?.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--jt-color-text)' }}>
                          {item.product_name} <span style={{ color: 'var(--jt-color-text-tertiary)', fontSize: '12px' }}>({item.target_type})</span>
                        </span>
                        <span style={{ color: 'var(--jt-color-text)', fontWeight: 500 }}>
                          {item.quantity}개 <span style={{ color: 'var(--jt-color-text-tertiary)', fontSize: '13px', marginLeft: 'var(--jt-space-2)' }}>{(item.price || 0).toLocaleString()}원</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--jt-space-3)', paddingTop: 'var(--jt-space-3)', borderTop: '1px dashed var(--jt-color-border)' }}>
                    {order.status === '입금대기' ? (
                      <button 
                        onClick={() => openCancelModal(order.id)}
                        style={{ 
                          padding: 'var(--jt-space-2) var(--jt-space-4)', 
                          fontSize: '13px', 
                          fontWeight: 600,
                          backgroundColor: 'var(--jt-neutral-0)', 
                          color: 'var(--jt-seed-color-error)',
                          border: '1px solid var(--jt-seed-color-error)',
                          borderRadius: 'var(--jt-r-md)',
                          cursor: 'pointer'
                        }}
                      >
                        주문 취소
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--jt-color-text-secondary)', marginRight: 'var(--jt-space-2)' }}>총 결제 금액:</span>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--jt-color-text)' }}>{order.total_price?.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🛑 주문 취소 모달 */}
      {showCancelModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'var(--jt-dim-50)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--jt-neutral-0)', padding: 'var(--jt-space-7)', borderRadius: 'var(--jt-r-xl)', boxShadow: 'var(--jt-shadow-2xl)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--jt-seed-color-error)' }}>cancel</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--jt-color-text)', margin: 0 }}>주문 취소</h2>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--jt-color-text-secondary)', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.5' }}>
              정말로 이 주문을 취소하시겠습니까?<br/>취소된 주문은 복구할 수 없습니다.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => { setShowCancelModal(false); setTargetOrderId(null); }}
                style={{
                  flex: 1, padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                  border: '1px solid var(--jt-color-border)', background: 'var(--jt-neutral-0)',
                  color: 'var(--jt-neutral-700)', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                닫기
              </button>
              <button 
                onClick={handleCancelOrder}
                style={{
                  flex: 1, padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                  border: 'none',
                  background: 'var(--jt-seed-color-error)',
                  color: 'var(--jt-neutral-0)', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                취소 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
