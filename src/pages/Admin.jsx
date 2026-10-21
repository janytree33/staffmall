import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import AdminPanel from '../components/AdminPanel';
import { sendEmailReceipt } from '../utils/notificationService';

// 동일 품목(product_name)일 경우 수량을 합산하여 "상품명 총수량개" 텍스트로 반환하는 헬퍼 함수
function formatMergedItemsText(items) {
  if (!items || items.length === 0) return '';
  const mergedMap = new Map();
  items.forEach(item => {
    const name = (item.product_name || '').trim();
    if (!name) return;
    const qty = Number(item.quantity) || 1;
    mergedMap.set(name, (mergedMap.get(name) || 0) + qty);
  });
  return Array.from(mergedMap.entries())
    .map(([name, totalQty]) => `${name} ${totalQty}개`)
    .join(', ');
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // 데이터 상태
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);

  // 선택된 년-월 상태
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // 선택된 주문 관리 상태
  const [selectedOrders, setSelectedOrders] = useState([]);

  // 운송장 엑셀 업로드 상태 및 모달
  const fileInputRef = useRef(null);
  const [isUploadingTracking, setIsUploadingTracking] = useState(false);
  const [uploadResultModal, setUploadResultModal] = useState(null);

  async function checkUserAndFetchData() {
    const sessionUser = JSON.parse(localStorage.getItem('custom_user') || 'null');
    // info 계정만 접근 가능
    if (!sessionUser || sessionUser.email !== 'info@janytree.com') {
      alert("관리자 전용 페이지입니다.");
      navigate('/');
      return;
    }
    setUser(sessionUser);

    // 멤버 및 제품 데이터 가져오기 (AdminPanel용)
    const { data: memberData } = await supabase.from('members').select('*');
    if (memberData) setMembers(memberData);

    const { data: productData } = await supabase.from('products').select('*');
    if (productData) setProducts(productData);

    // 주문 현황 가져오기
    fetchAdminOrders();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkUserAndFetchData();
    // 월 변경 시 선택된 주문 초기화
    setSelectedOrders([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function fetchAdminOrders() {
    try {
      const [year, month] = selectedMonth.split('-');
      const startRange = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
      const endRange = new Date(year, month, 1, 0, 0, 0, 0).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          delivery_fee_total,
          status,
          created_at,
          delivery_type,
          delivery_name,
          delivery_phone,
          delivery_address,
          delivery_address_detail,
          delivery_memo,
          tracking_number,
          cash_receipt_phone,
          members ( name, phone_last_4_hashed ),
          order_items ( product_name, target_type, quantity, price ),
          order_deliveries ( id, seq_no, recipient_name, phone, zipcode, address, address_detail, memo, tracking_number, assigned_items )
        `)
        .gte('created_at', startRange)
        .lt('created_at', endRange)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAdminOrders(data);
    } catch (error) {
      console.error(error);
      alert("주문 내역을 불러오지 못했습니다.");
    }
  };

  const handleOrderStatusChange = async (orderId, currentStatus, newStatus) => {
    if (!window.confirm(`주문 상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      alert(`주문 상태가 [${newStatus}]로 변경되었습니다.`);
      fetchAdminOrders();
    } catch (error) {
      console.error(error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleCancelOrder = async (orderId, ordererName, totalPrice) => {
    if (!window.confirm(`[${ordererName}]님의 주문(${totalPrice.toLocaleString()}원)을 취소 처리하시겠습니까?\n취소 시 직원의 구매 한도(수량)가 즉시 복구됩니다.`)) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: '주문취소' })
        .eq('id', orderId);

      if (error) throw error;

      sendEmailReceipt({
        actionType: '취소',
        ordererName,
        totalPrice,
        orderId,
        orderItems: [], 
        deliveryInfo: null
      });

      alert("주문이 정상적으로 취소 처리되었습니다.");
      fetchAdminOrders();
    } catch (error) {
      console.error(error);
      alert("주문 취소 처리에 실패했습니다.");
    }
  };

  const downloadDeliveryCSV = () => {
    const headers = ["판매채널","주문번호","주문상태","총 품목합계금액","총 합계 할인금액","총 합계 배송비","총 합계 포인트 사용액","최종주문금액","주문자 이름","주문자 이메일","주문자 번호","배송방식","배송비결제방식","배송송장번호","주문섹션번호","주문섹션번호","알파벳","주문섹션품목번호","박스수량","상품명","품목명","판매가","품목등급할인금액","품목포인트사용금액","품목쿠폰할인금액","품목실결제가","수령자명","수령자 전화번호","배송지 국가코드","배송지 우편번호","주소","상세주소","배송메모","택배사명","취소사유","반품사유","취소상세사유","반품 상세사유","주문일","상품고유번호"];
    
    if (selectedOrders.length === 0) {
      alert("다운로드할 주문을 먼저 체크박스로 선택해주세요.");
      return;
    }

    const targetOrders = adminOrders.filter(o => o.delivery_type === '택배배송' && o.status !== '주문취소' && selectedOrders.includes(o.id));
    if (targetOrders.length === 0) {
      alert("선택하신 주문 중 다운로드 가능한 택배 배송 주문(취소 제외)이 없습니다.");
      return;
    }

    // 엑셀 시트에 들어갈 2차원 배열 (첫 줄은 헤더)
    const rows = [headers];

    targetOrders.forEach(order => {
      // order_deliveries가 있으면 배송지별로 1줄씩(합배송) 행을 생성 (신규 방식)
      const deliveries = order.order_deliveries && order.order_deliveries.length > 0
        ? [...order.order_deliveries].sort((a, b) => a.seq_no - b.seq_no)
        : null;

      if (deliveries) {
        // 📦 신규 방식: 배송지 1곳당 무조건 1줄(합배송) 생성 + 동일 품목은 수량 합산
        deliveries.forEach((d) => {
          const items = d.assigned_items && d.assigned_items.length > 0
            ? d.assigned_items
            : order.order_items || [];

          const combinedProductNames = formatMergedItemsText(items);

          const row = Array(40).fill("");
          row[1] = order.id;
          row[2] = order.status;
          row[18] = 1; // 합배송 1박스 기준
          row[19] = "제니트리 발송품";
          row[20] = combinedProductNames; // 예: "앰플런스 앰플 6개"
          row[21] = ""; // 수령인에게 단가 비공개
          row[26] = d.recipient_name || "";
          row[27] = d.phone || "";
          row[29] = d.zipcode || "";
          row[30] = d.address || "";
          row[31] = d.address_detail || "";
          row[32] = d.memo || "";
          row[38] = new Date(order.created_at).toLocaleDateString();

          rows.push(row);
        });
      } else {
        // 🔄 구 방식 호환: 단일 배송지도 1줄(합배송) + 동일 품목 수량 합산으로 통합 생성
        if (order.order_items && order.order_items.length > 0) {
          const combinedProductNames = formatMergedItemsText(order.order_items);

          const row = Array(40).fill("");
          row[1] = order.id;
          row[2] = order.status;
          row[18] = 1; // 합배송 1박스 기준
          row[19] = "제니트리 발송품";
          row[20] = combinedProductNames;
          row[21] = ""; // 수령인에게 단가 비공개
          row[26] = order.delivery_name || order.members?.name || "";
          row[27] = order.delivery_phone || "";
          row[30] = order.delivery_address || "";
          row[31] = order.delivery_address_detail || "";
          row[32] = order.delivery_memo || "";
          row[38] = new Date(order.created_at).toLocaleDateString();

          rows.push(row);
        }
      }
    });

    // 엑셀 워크시트 및 워크북 생성 후 .xlsx 파일로 다운로드
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "택배발송목록");
    XLSX.writeFile(workbook, `택배배송_목록_${selectedMonth}.xlsx`);
  };

  // 전화번호 숫자 비교 헬퍼 (엑셀에서 앞자리 0이 잘린 경우까지 호환)
  const isPhoneMatch = (phoneA, phoneB) => {
    const digitsA = String(phoneA || '').replace(/[^0-9]/g, '');
    const digitsB = String(phoneB || '').replace(/[^0-9]/g, '');
    if (!digitsA || !digitsB) return false;
    if (digitsA === digitsB) return true;
    if (digitsA.length >= 8 && digitsB.length >= 8) {
      return digitsA.slice(-8) === digitsB.slice(-8);
    }
    return false;
  };

  // CJ대한통운 접수 엑셀/CSV 업로드 → 운송장번호 자동 매칭 및 주문상태 '배송/수령 완료' 자동 전환
  const handleTrackingExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 같은 파일을 다시 올릴 수 있도록 input 초기화
    e.target.value = '';

    setIsUploadingTracking(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // 1. 헤더 행 찾기 ('운송장번호' 또는 '송장번호'가 포함된 행)
      let headerRowIndex = -1;
      let trackingCol = -1;
      let nameCol = -1;
      let phoneCol = -1;
      let zipCol = -1;

      for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const row = rawRows[i].map(cell => String(cell || '').replace(/\s+/g, ''));
        const tIdx = row.findIndex(h => h.includes('운송장번호') || h.includes('송장번호'));
        if (tIdx !== -1) {
          headerRowIndex = i;
          trackingCol = tIdx;
          nameCol = row.findIndex(h => h === '받는분' || h === '받는분성명' || h === '수령자명' || h === '수령인' || h === '수취인' || h === '수취인명');
          phoneCol = row.findIndex(h => h.includes('받는분전화') || h.includes('수령자전화') || h.includes('받는분연락처') || h === '전화번호' || h === '연락처');
          zipCol = row.findIndex(h => h.includes('우편번호'));
          break;
        }
      }

      if (headerRowIndex === -1 || trackingCol === -1 || nameCol === -1) {
        setUploadResultModal({
          success: false,
          message: "엑셀 파일에서 '운송장번호' 또는 '받는분' 컬럼을 찾을 수 없습니다. 택배 사이트에서 다운로드한 파일이 맞는지 확인해주세요.",
          matchedList: [],
          unmatchedList: []
        });
        return;
      }

      // 2. 현재 조회된 택배배송 주문(취소 제외)에서 배송지 후보 목록 구성
      const activeDeliveryOrders = adminOrders.filter(
        o => o.delivery_type === '택배배송' && o.status !== '주문취소'
      );

      const usedDeliveryIds = new Set();
      const matchedOrderIds = new Set();
      const matchedList = [];
      const unmatchedList = [];

      // 3. 데이터 행 순회하며 매칭
      const dataRows = rawRows.slice(headerRowIndex + 1);
      for (const row of dataRows) {
        const trackingNo = String(row[trackingCol] || '').trim();
        const recipientName = String(row[nameCol] || '').trim();
        const recipientPhone = phoneCol !== -1 ? String(row[phoneCol] || '').trim() : '';
        const recipientZip = zipCol !== -1 ? String(row[zipCol] || '').trim() : '';

        // 빈 행 또는 운송장/수령인이 없는 행 건너뛰기
        if (!trackingNo || !recipientName) continue;

        let matchedTarget = null;

        // 후보 탐색 (이름 + 전화번호 일치)
        const candidates = [];
        for (const order of activeDeliveryOrders) {
          if (order.order_deliveries && order.order_deliveries.length > 0) {
            for (const d of order.order_deliveries) {
              if (usedDeliveryIds.has(`deliv_${d.id}`)) continue;
              const nameMatches = (d.recipient_name || '').trim() === recipientName;
              const phoneMatches = !recipientPhone || isPhoneMatch(d.phone, recipientPhone);
              if (nameMatches && phoneMatches) {
                candidates.push({ type: 'delivery', order, delivery: d });
              }
            }
          } else {
            if (usedDeliveryIds.has(`order_${order.id}`)) continue;
            const nameMatches = (order.delivery_name || '').trim() === recipientName;
            const phoneMatches = !recipientPhone || isPhoneMatch(order.delivery_phone, recipientPhone);
            if (nameMatches && phoneMatches) {
              candidates.push({ type: 'legacy_order', order });
            }
          }
        }

        if (candidates.length === 1) {
          matchedTarget = candidates[0];
        } else if (candidates.length > 1) {
          // 동일 수령인이 여러 건일 경우 우편번호 일치 건 우선, 아직 운송장이 없는 건 우선
          matchedTarget =
            candidates.find(c => c.type === 'delivery' && String(c.delivery.zipcode || '').trim() === recipientZip && !c.delivery.tracking_number) ||
            candidates.find(c => c.type === 'delivery' && String(c.delivery.zipcode || '').trim() === recipientZip) ||
            candidates.find(c => c.type === 'delivery' && !c.delivery.tracking_number) ||
            candidates[0];
        }

        if (matchedTarget) {
          if (matchedTarget.type === 'delivery') {
            const { error } = await supabase
              .from('order_deliveries')
              .update({ tracking_number: trackingNo })
              .eq('id', matchedTarget.delivery.id);
            if (error) throw error;
            usedDeliveryIds.add(`deliv_${matchedTarget.delivery.id}`);
          } else {
            const { error } = await supabase
              .from('orders')
              .update({ tracking_number: trackingNo })
              .eq('id', matchedTarget.order.id);
            if (error) throw error;
            usedDeliveryIds.add(`order_${matchedTarget.order.id}`);
          }

          matchedOrderIds.add(matchedTarget.order.id);
          matchedList.push({
            recipientName,
            recipientPhone,
            trackingNo,
            ordererName: matchedTarget.order.members?.name || ''
          });
        } else {
          unmatchedList.push({ recipientName, recipientPhone, trackingNo });
        }
      }

      // 4. 매칭된 주문들의 상태를 자동으로 '배송/수령 완료'로 업데이트
      for (const orderId of matchedOrderIds) {
        await supabase
          .from('orders')
          .update({ status: '배송/수령 완료' })
          .eq('id', orderId);
      }

      await fetchAdminOrders();

      setUploadResultModal({
        success: true,
        message: matchedList.length > 0
          ? `총 ${matchedList.length}건의 배송지에 운송장번호가 등록되었으며, 해당 주문 상태가 '배송/수령 완료'로 자동 변경되었습니다.`
          : `일치하는 주문을 찾지 못했습니다. 현재 선택된 조회 월(${selectedMonth})의 주문인지 확인해주세요.`,
        matchedList,
        unmatchedList
      });
    } catch (err) {
      console.error('운송장 엑셀 업로드 오류:', err);
      setUploadResultModal({
        success: false,
        message: '운송장번호 저장 중 오류가 발생했습니다. DB 마이그레이션(011_add_tracking_number.sql)이 실행되었는지 확인해주세요.',
        matchedList: [],
        unmatchedList: []
      });
    } finally {
      setIsUploadingTracking(false);
    }
  };

  if (!user) return null; // 권한 확인 전 빈 화면

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // 택배배송이면서 취소가 아닌 건만 전체선택
      const downloadableIds = adminOrders
        .filter(o => o.delivery_type === '택배배송' && o.status !== '주문취소')
        .map(o => o.id);
      setSelectedOrders(downloadableIds);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const downloadableCount = adminOrders.filter(o => o.delivery_type === '택배배송' && o.status !== '주문취소').length;
  const isAllSelected = downloadableCount > 0 && selectedOrders.length === downloadableCount;

  return (
    <div className="container" style={{ paddingBottom: '140px' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img src="/logo/logo-h.png" alt="제니트리 로고" className="header-logo" />
        </Link>
        <Link to="/" className="premium-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', textDecoration: 'none', background: 'var(--jt-neutral-100)', color: 'var(--jt-color-text)', border: '1px solid var(--jt-color-border)' }}>
          ← 쇼핑몰 돌아가기
        </Link>
      </header>

      <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--jt-color-primary)', fontSize: '1.5rem' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '1.8rem', color: 'var(--jt-color-text)' }}>admin_panel_settings</span>
        관리자 대시보드
      </h2>

      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--jt-color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--jt-color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px', color: 'var(--jt-color-text)' }}>monitoring</span>
              주문 현황 및 취소 관리
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={downloadDeliveryCSV}
                className="premium-btn outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>download</span>
                택배발송 엑셀 다운로드
              </button>

              {/* CJ대한통운 접수 엑셀 업로드 숨김 input + 버튼 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleTrackingExcelUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingTracking}
                className="premium-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--jt-color-primary)', color: '#fff', border: 'none' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>upload_file</span>
                {isUploadingTracking ? '운송장 매칭 중...' : '운송장 엑셀 업로드'}
              </button>

              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--jt-color-text-secondary)', marginLeft: '0.5rem' }}>조회 월 선택:</span>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--jt-color-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--jt-color-border)', borderRadius: 'var(--jt-r-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
              <thead style={{ backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)', width: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} style={{ cursor: 'pointer' }} />
                      주문일시
                    </div>
                  </th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)', width: '35%' }}>직원 및 상세 주문 품목</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>총 결제액</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>현재 상태</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--jt-color-border)', transition: 'background-color 0.2s', backgroundColor: selectedOrders.includes(order.id) ? 'var(--jt-neutral-50)' : 'transparent' }}>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', fontSize: '0.85rem', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {order.delivery_type === '택배배송' && order.status !== '주문취소' && (
                          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectOrder(order.id)} style={{ cursor: 'pointer' }} />
                        )}
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1rem', border: '1px solid var(--jt-color-border)', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-primary)', marginBottom: '0.5rem', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px', verticalAlign: 'text-bottom', color: 'var(--jt-color-primary)' }}>person</span> 
                        {order.members?.name} 직원님
                      </div>
                      <div style={{ backgroundColor: order.status === '주문취소' ? 'var(--jt-neutral-50)' : 'var(--jt-neutral-0)', padding: '0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px dashed var(--jt-color-border)' }}>
                        {order.order_items && order.order_items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text-secondary)', padding: '0.15rem 0', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'text-bottom' }}>inventory_2</span> 
                            {item.product_name} <span style={{ color: 'var(--jt-neutral-500)' }}>({item.target_type})</span> — <strong>{item.quantity}개</strong> <span style={{ color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-neutral-400)', fontSize: '0.8rem', marginLeft: '4px' }}>{(item.price || 0).toLocaleString()}원</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* 배송 및 현금영수증 정보 요약 */}
                      <div style={{ marginTop: '0.5rem', backgroundColor: 'var(--jt-neutral-50)', padding: '0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', fontSize: '0.85rem', color: 'var(--jt-color-text-secondary)', textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--jt-color-primary)', marginBottom: '0.2rem' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom' }}>
                            {order.delivery_type === '방문수령' ? 'storefront' : 'local_shipping'}
                          </span>
                          {order.delivery_type || '방문수령'}
                        </div>
                        {order.delivery_type === '택배배송' && (() => {
                          const deliveries = order.order_deliveries && order.order_deliveries.length > 0
                            ? [...order.order_deliveries].sort((a, b) => a.seq_no - b.seq_no)
                            : null;

                          if (deliveries) {
                            // 신규: 다중 배송지 표시 (동일 품목 수량 합산 + 운송장번호 표시)
                            return (
                              <div style={{ lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {deliveries.map((d, i) => (
                                  <div key={i} style={{ borderLeft: '2px solid var(--jt-color-primary)', paddingLeft: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '0.78rem', color: 'var(--jt-color-primary)' }}>배송지 {d.seq_no}</span>
                                      {d.tracking_number && (
                                        <a
                                          href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${d.tracking_number.replace(/[^0-9]/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--jt-color-accent, #305CDE)', backgroundColor: 'var(--jt-neutral-0)', border: '1px solid var(--jt-color-border)', borderRadius: '4px', padding: '1px 6px', textDecoration: 'none' }}
                                        >
                                          CJ대한통운 {d.tracking_number} ↗
                                        </a>
                                      )}
                                    </div>
                                    <div><strong>수령인:</strong> {d.recipient_name} / {d.phone}</div>
                                    <div><strong>주소:</strong> ({d.zipcode}) {d.address} {d.address_detail}</div>
                                    {d.memo && <div><strong>메모:</strong> {d.memo}</div>}
                                    {d.assigned_items && d.assigned_items.length > 0 && (
                                      <div style={{ color: 'var(--jt-color-text-tertiary)', fontSize: '0.78rem' }}>
                                        → {formatMergedItemsText(d.assigned_items)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            // 구 방식 호환: 단일 배송지
                            return (
                              <div style={{ lineHeight: '1.4' }}>
                                {order.tracking_number && (
                                  <div style={{ marginBottom: '2px' }}>
                                    <a
                                      href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${order.tracking_number.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--jt-color-accent, #305CDE)', textDecoration: 'underline' }}
                                    >
                                      CJ대한통운 {order.tracking_number} ↗
                                    </a>
                                  </div>
                                )}
                                <div><strong>수령인:</strong> {order.delivery_name}</div>
                                <div><strong>연락처:</strong> {order.delivery_phone}</div>
                                <div><strong>주소:</strong> {order.delivery_address} {order.delivery_address_detail}</div>
                                {order.delivery_memo && <div><strong>메모:</strong> {order.delivery_memo}</div>}
                              </div>
                            );
                          }
                        })()}
                        <div style={{ marginTop: order.delivery_type === '택배배송' ? '0.5rem' : '0.2rem', paddingTop: order.delivery_type === '택배배송' ? '0.5rem' : '0', borderTop: order.delivery_type === '택배배송' ? '1px dashed var(--jt-color-border)' : 'none' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom', color: 'var(--jt-color-primary)' }}>receipt_long</span>
                          <strong style={{ color: 'var(--jt-color-primary)' }}>현금영수증:</strong> {order.cash_receipt_phone || '010-000-1234'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle', fontWeight: 'bold', color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text)', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {order.total_price.toLocaleString()}원
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      <span style={{ 
                        display: 'inline-block', minWidth: '70px', textAlign: 'center', padding: '0.2rem 0.5rem', borderRadius: 'var(--jt-r-md)', fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1.4',
                        backgroundColor: order.status === '입금완료' ? '#10b981' : order.status === '배송/수령 완료' ? 'var(--jt-color-primary)' : order.status === '입금대기' ? '#fef08a' : order.status === '주문취소' ? 'var(--jt-neutral-200)' : 'var(--jt-neutral-100)',
                        color: (order.status === '입금완료' || order.status === '배송/수령 완료') ? 'white' : order.status === '입금대기' ? '#854d0e' : order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text)'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      {order.status === '주문취소' ? (
                        <span style={{ color: 'var(--jt-neutral-500)', fontSize: '0.85rem', fontStyle: 'italic' }}>한도복구완료</span>
                      ) : order.status === '배송/수령 완료' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--jt-color-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>종결됨</span>
                          <button 
                            onClick={() => handleOrderStatusChange(order.id, order.status, '입금완료')}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--jt-color-text-tertiary)', textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            입금완료로 되돌리기
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                          {order.status === '입금대기' ? (
                            <button 
                              onClick={() => handleOrderStatusChange(order.id, order.status, '입금완료')}
                              className="premium-btn"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4' }}
                            >
                              입금 확인
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleOrderStatusChange(order.id, order.status, '배송/수령 완료')}
                                className="premium-btn"
                                style={{ backgroundColor: 'var(--jt-color-primary)', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4', color: 'white' }}
                              >
                                배송/수령 완료
                              </button>
                              <button 
                                onClick={() => handleOrderStatusChange(order.id, order.status, '입금대기')}
                                className="premium-btn"
                                style={{ backgroundColor: 'var(--jt-neutral-100)', color: 'var(--jt-neutral-600)', border: '1px solid var(--jt-color-border)', padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4' }}
                              >
                                대기로 되돌리기 ↺
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleCancelOrder(order.id, order.members?.name, order.total_price)}
                            className="premium-btn"
                            style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4' }}
                          >
                            주문취소
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {adminOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', color: 'var(--jt-neutral-400)' }}>선택하신 달({selectedMonth})의 주문 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AdminPanel을 하단으로 이동 */}
      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
        <AdminPanel members={members} products={products} />
      </div>

      {/* 📦 운송장 엑셀 업로드 결과 모달 */}
      {uploadResultModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'var(--jt-dim-50)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="card animate-fade-in" style={{
            width: '90%', maxWidth: '480px', backgroundColor: 'var(--jt-neutral-0)',
            padding: 'var(--jt-space-7)', borderRadius: 'var(--jt-r-xl)',
            boxShadow: 'var(--jt-shadow-2xl)', maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: uploadResultModal.success ? 'var(--jt-color-primary)' : '#ef4444' }}>
                {uploadResultModal.success ? 'local_shipping' : 'error'}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--jt-color-text)', margin: '0.4rem 0' }}>
                운송장 엑셀 업로드 결과
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--jt-color-text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {uploadResultModal.message}
              </p>
            </div>

            {uploadResultModal.matchedList.length > 0 && (
              <div style={{ backgroundColor: 'var(--jt-neutral-50)', padding: '0.75rem', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--jt-color-primary)', marginBottom: '0.4rem' }}>
                  매칭 완료 내역 ({uploadResultModal.matchedList.length}건)
                </div>
                {uploadResultModal.matchedList.map((m, idx) => (
                  <div key={idx} style={{ padding: '0.25rem 0', borderBottom: idx < uploadResultModal.matchedList.length - 1 ? '1px dashed var(--jt-color-border)' : 'none' }}>
                    <strong>{m.recipientName}</strong> ({m.recipientPhone}) → <span style={{ color: 'var(--jt-color-primary)', fontWeight: 'bold' }}>{m.trackingNo}</span>
                  </div>
                ))}
              </div>
            )}

            {uploadResultModal.unmatchedList.length > 0 && (
              <div style={{ backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: 'var(--jt-r-md)', border: '1px solid #fecaca', marginBottom: '1rem', fontSize: '0.82rem', color: '#991b1b' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>
                  매칭되지 않은 행 ({uploadResultModal.unmatchedList.length}건)
                </div>
                {uploadResultModal.unmatchedList.map((u, idx) => (
                  <div key={idx} style={{ padding: '0.15rem 0' }}>
                    {u.recipientName} ({u.recipientPhone}) - {u.trackingNo}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setUploadResultModal(null)}
              className="premium-btn"
              style={{ width: '100%', padding: '0.7rem', backgroundColor: 'var(--jt-color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--jt-r-md)', fontWeight: 'bold', cursor: 'pointer' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
