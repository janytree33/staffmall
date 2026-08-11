import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 현재 접속 중인 유저 확인
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      setLoading(false);
      fetchOrders(session.user.id);
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
            order_items ( product_name, target_type, quantity, price )
          `)
          .eq('user_id', userId)
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
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
                padding: 'var(--jt-space-2) var(--jt-space-4)',
                marginRight: 'var(--jt-space-3)',
                backgroundColor: 'var(--jt-bg-container)',
                border: '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-full)',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--jt-color-text)'
              }}
            >
              쇼핑하러 가기
            </button>
            <button 
              onClick={handleLogout}
              style={{
                padding: 'var(--jt-space-2) var(--jt-space-4)',
                backgroundColor: 'transparent',
                border: '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-full)',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--jt-color-text-secondary)'
              }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 내 정보 카드 */}
        <div className="premium-card" style={{
          padding: 'var(--jt-space-6)',
          marginBottom: 'var(--jt-space-6)'
        }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 var(--jt-space-5) 0', color: 'var(--jt-color-text)', fontWeight: 800 }}>👤 로그인 정보</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--jt-neutral-50)', padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)' }}>
              <span style={{ color: 'var(--jt-color-text-secondary)', fontWeight: 600 }}>이메일 계정</span>
              <span style={{ color: 'var(--jt-color-text)', fontWeight: 700, fontSize: '16px' }}>{user?.email}</span>
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
          <h2 style={{ fontSize: '18px', margin: '0 0 var(--jt-space-5) 0', color: 'var(--jt-color-text)', fontWeight: 800 }}>📦 내 주문 내역</h2>
          
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
                      fontWeight: 700, 
                      color: order.status === '주문취소' ? 'var(--jt-seed-color-error)' : 
                             order.status === '입금완료' ? 'var(--jt-seed-color-success)' : 'var(--jt-seed-color-info)' 
                    }}>
                      {order.status}
                    </span>
                  </div>
                  
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-2)' }}>
                    {order.order_items?.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--jt-color-text)' }}>
                          {item.product_name} <span style={{ color: 'var(--jt-color-text-tertiary)', fontSize: '12px' }}>({item.target_type})</span>
                        </span>
                        <span style={{ color: 'var(--jt-color-text)', fontWeight: 500 }}>
                          {item.quantity}개
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ textAlign: 'right', marginTop: 'var(--jt-space-3)', paddingTop: 'var(--jt-space-3)', borderTop: '1px dashed var(--jt-color-border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--jt-color-text-secondary)', marginRight: 'var(--jt-space-2)' }}>총 결제 금액:</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--jt-color-text)' }}>{order.total_price?.toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
