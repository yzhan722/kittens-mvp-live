// 娓告垙閰嶇疆甯搁噺闆嗕腑绠＄悊
export const GAME_CONFIG = {
  // 鐗堟湰淇℃伅
  VERSION: "0.40.1",
  
  // 瀛樺偍閿悕
  STORAGE: {
    SAVE_KEY: "kittens_mvp_save_v1",
    SAVE_BACKUP_KEY: "kittens_mvp_save_v1_bak",
    SAVE_SLOTS: [
      // Cloud slot1 only; API slots 2鈥? reserved/unused
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
  
  // 鏈嶅姟鍣?Buff 閰嶇疆
  SERVER_BUFF: {
    KEYS: ["exp", "resProd", "resCap", "research", "capture", "aff"],
    MAX_LEVEL: 20,
    BUY_MAX_MINUTES: 30 * 24 * 60, // 30 澶?    POLL_INTERVAL: 8000, // 8 绉?    UI: {
      exp: { name: "鍏ㄦ湇缁忛獙", icon: "缁忛獙", perLvl: 0.05 },
      resProd: { name: "鍏ㄦ湇璧勬簮浜ч噺", icon: "璧勬簮", perLvl: 0.05 },
      resCap: { name: "鍏ㄦ湇璧勬簮涓婇檺", icon: "涓婇檺", perLvl: 0.05 },
      research: { name: "鍏ㄦ湇绉戠爺閫熷害", icon: "绉戠爺", perLvl: 0.1 },
      capture: { name: "鍏ㄦ湇鎹曡幏鐜?, icon: "鎹曡幏", perLvl: 0.05 },
      aff: { name: "鍏ㄦ湇浜插瘑搴?, icon: "浜插瘑", perLvl: 0.05 },
    },
  },
  
  // 寤虹瓚骞宠　鍙傛暟
  BUILDING_BALANCE: {
    costMul: 0.25,
    prodMul: 0.25,
    capAddMul: 0.25,
  },
  
  // 绉戞妧骞宠　鍙傛暟
  TECH_BALANCE: {
    researchCostMul: 2,
    prodMulNerf: 0.7,
    woodProdMulNerf: 0.35,
    capAddBuff: 1.25,
  },
  
  // 鎹曡幏绯荤粺
  CAPTURE: {
    WEIGHTS: {
      common: 80,
      uncommon: 15,
      rare: 4,
      epic: 1,
    },
  },
  
  // UI 閰嶇疆
  UI: {
    DEX_PAGE_SIZE: 50,
    MON_PAGE_SIZE: 20,
    HINT_DEFAULT_TTL: 2000,
    AUTOSAVE_INTERVAL: 30000, // 30 绉?    RENDER_DEBOUNCE: 16, // 绾?60fps
    VIRTUAL_SCROLL_BUFFER: 5, // 铏氭嫙婊氬姩缂撳啿鍖哄ぇ灏?    LAZY_IMAGE_ROOT_MARGIN: '100px', // 鎳掑姞杞芥彁鍓嶉噺
  },
  
  // 鎺掕姒滈厤缃?  LEADERBOARD: {
    AUTO_REFRESH_INTERVAL: 60000, // 60 绉?    TOP_MONS_LIMIT: 6,
  },
  
  // Boss 閰嶇疆
  BOSS_BULLY: {
    POLL_INTERVAL: 10000, // 10 绉?    SNOOZE_DURATION: 3600000, // 1 灏忔椂
  },
};

// 鎹曡幏鍖哄煙閰嶇疆
export const CAPTURE_AREAS = [
  {
    id: "kanto",
    name: "鍏抽兘鑽変笡锛圢o.001-151锛?,
    unlockReq: 0,
    pool: (p) => p.tier !== "epic" && p.dex >= 1 && p.dex <= 151,
  },
  {
    id: "johto",
    name: "鍩庨兘鏍戞灄锛圢o.152-251锛?,
    unlockReq: 25,
    pool: (p) => p.tier !== "epic" && p.dex >= 152 && p.dex <= 251,
  },
  {
    id: "hoenn",
    name: "涓扮紭娴峰哺锛圢o.252-386锛?,
    unlockReq: 70,
    pool: (p) => p.tier !== "epic" && p.dex >= 252 && p.dex <= 386,
  },
  {
    id: "sinnoh",
    name: "绁炲ゥ闆師锛圢o.387-493锛?,
    unlockReq: 140,
    pool: (p) => p.tier !== "epic" && p.dex >= 387 && p.dex <= 493,
  },
  {
    id: "unova",
    name: "鍚堜紬娌欐紶锛圢o.494-649锛?,
    unlockReq: 210,
    pool: (p) => p.tier !== "epic" && p.dex >= 494 && p.dex <= 649,
  },
  {
    id: "kalos",
    name: "鍗℃礇鏂姳鐢帮紙No.650-721锛?,
    unlockReq: 280,
    pool: (p) => p.tier !== "epic" && p.dex >= 650 && p.dex <= 721,
  },
  {
    id: "alola",
    name: "闃跨綏鎷夋捣宀涳紙No.722-809锛?,
    unlockReq: 350,
    pool: (p) => p.tier !== "epic" && p.dex >= 722 && p.dex <= 809,
  },
  {
    id: "galar",
    name: "浼藉嫆灏旀椃閲庯紙No.810-905锛?,
    unlockReq: 430,
    pool: (p) => p.tier !== "epic" && p.dex >= 810 && p.dex <= 905,
  },
  {
    id: "mythic",
    name: "绁炲吔棰嗗煙锛堜紶璇?骞讳箣锛?,
    unlockReq: 520,
    pool: (p) => p.tier === "epic",
  },
];
