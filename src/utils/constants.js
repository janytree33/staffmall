export const TARGET_TYPES = {
  SELF: '본인',
  FAMILY: '가족',
  ACQUAINTANCE: '지인'
};

export const PURCHASE_LIMITS = {
  [TARGET_TYPES.SELF]: 1, // 품목별 월 1개
  [TARGET_TYPES.FAMILY]: 5, // 품목별 월 5개
  [TARGET_TYPES.ACQUAINTANCE]: Infinity, // 무제한
};

export const PRODUCTS = [
  {
    id: 1,
    name: '앰플런스 앰플 (50ml)',
    prices: {
      [TARGET_TYPES.SELF]: 6500,
      [TARGET_TYPES.FAMILY]: 9500,
      [TARGET_TYPES.ACQUAINTANCE]: 13000,
    }
  },
  {
    id: 2,
    name: '앰플런스 크림 (75ml)',
    prices: {
      [TARGET_TYPES.SELF]: 5000,
      [TARGET_TYPES.FAMILY]: 7000,
      [TARGET_TYPES.ACQUAINTANCE]: 9000,
    }
  },
  {
    id: 3,
    name: '앰플런스 버블폼 (150ml)',
    prices: {
      [TARGET_TYPES.SELF]: 5500,
      [TARGET_TYPES.FAMILY]: 9500,
      [TARGET_TYPES.ACQUAINTANCE]: 10000,
    }
  },
  {
    id: 4,
    name: '딥모이스처 카머(70ml)',
    prices: {
      [TARGET_TYPES.SELF]: 5000,
      [TARGET_TYPES.FAMILY]: 7000,
      [TARGET_TYPES.ACQUAINTANCE]: 9000,
    }
  },
  {
    id: 5,
    name: '인텐시브 베리어 카머 (90ml)',
    prices: {
      [TARGET_TYPES.SELF]: 6000,
      [TARGET_TYPES.FAMILY]: 8000,
      [TARGET_TYPES.ACQUAINTANCE]: 10000,
    }
  }
];
