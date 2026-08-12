/**
 * 알림 발송 서비스 (Telegram API & EmailJS 연동)
 */
import emailjs from '@emailjs/browser';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * 텔레그램 봇으로 주문 알림을 발송합니다.
 * @param {Object} orderData - { memberName, items(array), totalPrice, status }
 */
export const sendTelegramOrderAlert = async (orderData) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('텔레그램 봇 토큰 또는 Chat ID가 설정되지 않아 알림이 발송되지 않습니다.');
    return;
  }

  try {
    // 메시지 포맷팅
    let message = `🛒 <b>신규 주문 알림 (제니트리 직원복지몰)</b>\n\n`;
    message += `👤 <b>주문자:</b> ${orderData.memberName} 직원님\n`;
    message += `⏰ <b>주문일시:</b> ${new Date().toLocaleString()}\n`;
    message += `──────────────────\n`;
    
    orderData.items.forEach((item, idx) => {
      message += `${idx + 1}. 📦 ${item.product_name} (${item.target_type}) - ${item.quantity}개\n`;
    });
    
    message += `──────────────────\n`;
    message += `💰 <b>총 결제액:</b> ${orderData.totalPrice.toLocaleString()}원\n`;
    message += `🏷 <b>현재상태:</b> ${orderData.status}\n\n`;
    message += `※ 관리자 페이지에서 입금 확인 및 상태를 변경해주세요.`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('텔레그램 알림 발송 실패:', data.description);
    } else {
      console.log('텔레그램 알림 발송 성공!');
    }
    
  } catch (error) {
    console.error('텔레그램 API 호출 중 에러 발생:', error);
  }
};

/**
 * 텔레그램 봇으로 주문 취소 알림을 발송합니다.
 */
export const sendTelegramCancelAlert = async (memberName, orderId) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const message = `❌ <b>주문 취소 알림</b>\n\n👤 <b>직원:</b> ${memberName} 님\n🔖 <b>주문번호:</b> ${orderId}\n⏰ <b>취소일시:</b> ${new Date().toLocaleString()}\n\n※ 관리자 페이지에서 취소 내역을 확인해주세요.`;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
  } catch (error) {
    console.error('텔레그램 취소 알림 에러:', error);
  }
};

/**
 * EmailJS를 이용해 주문/취소 내역을 직원 본인에게 발송합니다.
 * @param {string} type - 'order' 또는 'cancel'
 * @param {Object} memberInfo - { email, name }
 * @param {Object} details - { orderId, items(배열), totalPrice, status }
 */
export const sendEmailReceipt = async (type, memberInfo, details) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS 키가 설정되지 않았습니다.');
    return;
  }
  if (!memberInfo || !memberInfo.email) {
    console.warn('받는 사람 이메일 정보가 없어 메일을 발송할 수 없습니다.');
    return;
  }

  try {
    let productDetails = '';
    if (details.items && details.items.length > 0) {
      details.items.forEach((item, idx) => {
        productDetails += `${idx + 1}. ${item.product_name} (${item.target_type}) - ${item.quantity}개\n`;
      });
    } else {
      productDetails = '상세 내역 없음';
    }

    const templateParams = {
      to_name: memberInfo.name || '임직원',
      to_email: memberInfo.email,
      order_id: details.orderId || '-',
      order_status: type === 'order' ? '주문 완료' : '주문 취소',
      product_details: productDetails,
      total_price: details.totalPrice ? details.totalPrice.toLocaleString() + '원' : '-'
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('이메일 발송 성공:', response.status, response.text);
  } catch (error) {
    console.error('이메일 발송 실패:', error);
  }
};
