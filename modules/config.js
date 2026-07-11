// 游戏配置常量集中管理
export const GAME_CONFIG = {
  // 版本信息
  VERSION: "0.39.7",
  
  // 存储键名
  STORAGE: {
    SAVE_KEY: "kittens_mvp_save_v1",
    SAVE_BACKUP_KEY: "kittens_mvp_save_v1_bak",
    SAVE_SLOTS: [
      // Cloud slot1 only; API slots 2–3 reserved/unused
      "kittens_mvp_save_slot_1"
    ],
    DAILY_LOGIN_KEY: "kittens_mvp_daily_login_reward_v1",
    LOG_COLLAPSE_KEY: "kittens_mvp_log_collapsed_v1",
    BULLETIN_COLLAPSE_KEY: "kittens_mvp_bulletin_collapsed_v1",
    CAPTURE_PREVIEW_KEY: "kittens_mvp_capture_preview_hidden_v1",
    LB_UID_KEY: "kittens_mvp_lb_uid_v1",
    LB_NAME_KEY: "kittens_mvp_lb_name_v1",
    LB_AVATAR_KEY: "kittens_mvp_lb_avatar_v1",
    STYLE_GUARD_KEY: "kittens_mvp_style_fix_v1",
    BOSS_BULLY_SNOOZE_KEY: "kittens_mvp_boss_bully_snooze_until_v1",
  },
  
  // 服务器 Buff 配置
  SERVER_BUFF: {
    KEYS: ["exp", "resProd", "resCap", "research", "capture", "aff"],
    MAX_LEVEL: 20,
    BUY_MAX_MINUTES: 30 * 24 * 60, // 30 天
    POLL_INTERVAL: 8000, // 8 秒
    UI: {
      exp: { name: "全服经验", icon: "经验", perLvl: 0.05 },
      resProd: { name: "全服资源产量", icon: "资源", perLvl: 0.05 },
      resCap: { name: "全服资源上限", icon: "上限", perLvl: 0.05 },
      research: { name: "全服科研速度", icon: "科研", perLvl: 0.1 },
      capture: { name: "全服捕获率", icon: "捕获", perLvl: 0.05 },
      aff: { name: "全服亲密度", icon: "亲密", perLvl: 0.05 },
    },
  },
  
  // 建筑平衡参数
  BUILDING_BALANCE: {
    costMul: 0.25,
    prodMul: 0.25,
    capAddMul: 0.25,
  },
  
  // 科技平衡参数
  TECH_BALANCE: {
    researchCostMul: 2,
    prodMulNerf: 0.7,
    woodProdMulNerf: 0.35,
    capAddBuff: 1.25,
  },
  
  // 捕获系统
  CAPTURE: {
    WEIGHTS: {
      common: 80,
      uncommon: 15,
      rare: 4,
      epic: 1,
    },
  },
  
  // UI 配置
  UI: {
    DEX_PAGE_SIZE: 50,
    MON_PAGE_SIZE: 20,
    HINT_DEFAULT_TTL: 2000,
    AUTOSAVE_INTERVAL: 30000, // 30 秒
    RENDER_DEBOUNCE: 16, // 约 60fps
    VIRTUAL_SCROLL_BUFFER: 5, // 虚拟滚动缓冲区大小
    LAZY_IMAGE_ROOT_MARGIN: '100px', // 懒加载提前量
  },
  
  // 排行榜配置
  LEADERBOARD: {
    AUTO_REFRESH_INTERVAL: 60000, // 60 秒
    TOP_MONS_LIMIT: 6,
  },
  
  // Boss 配置
  BOSS_BULLY: {
    POLL_INTERVAL: 10000, // 10 秒
    SNOOZE_DURATION: 3600000, // 1 小时
  },
};

// 捕获区域配置
export const CAPTURE_AREAS = [
  {
    id: "kanto",
    name: "关都草丛（No.001-151）",
    unlockReq: 0,
    pool: (p) => p.tier !== "epic" && p.dex >= 1 && p.dex <= 151,
  },
  {
    id: "johto",
    name: "城都树林（No.152-251）",
    unlockReq: 25,
    pool: (p) => p.tier !== "epic" && p.dex >= 152 && p.dex <= 251,
  },
  {
    id: "hoenn",
    name: "丰缘海岸（No.252-386）",
    unlockReq: 70,
    pool: (p) => p.tier !== "epic" && p.dex >= 252 && p.dex <= 386,
  },
  {
    id: "sinnoh",
    name: "神奥雪原（No.387-493）",
    unlockReq: 140,
    pool: (p) => p.tier !== "epic" && p.dex >= 387 && p.dex <= 493,
  },
  {
    id: "unova",
    name: "合众沙漠（No.494-649）",
    unlockReq: 210,
    pool: (p) => p.tier !== "epic" && p.dex >= 494 && p.dex <= 649,
  },
  {
    id: "kalos",
    name: "卡洛斯花田（No.650-721）",
    unlockReq: 280,
    pool: (p) => p.tier !== "epic" && p.dex >= 650 && p.dex <= 721,
  },
  {
    id: "alola",
    name: "阿罗拉海岛（No.722-809）",
    unlockReq: 350,
    pool: (p) => p.tier !== "epic" && p.dex >= 722 && p.dex <= 809,
  },
  {
    id: "galar",
    name: "伽勒尔旷野（No.810-905）",
    unlockReq: 430,
    pool: (p) => p.tier !== "epic" && p.dex >= 810 && p.dex <= 905,
  },
  {
    id: "mythic",
    name: "神兽领域（传说/幻之）",
    unlockReq: 520,
    pool: (p) => p.tier === "epic",
  },
];
