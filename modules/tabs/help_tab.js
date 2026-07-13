import { liveGoalsChecklist, liveNextGoalLine, canClaimDailyGoalsBundle, markDailyGoalsBundleClaimed, localDateStr } from "../systems/gameplay_fun.js";
import { ensureEra, questLabel, syncEraQuests } from "../systems/era.js";
import { PVE_CHAPTERS, isStageUnlocked } from "../pve_defs.js";

export function createRenderHelp({ elHelp, ui, escapeHtml, getState, getCaptureAreas, dexCaughtUnique, defs, addRes, addLog, render }) {
  return function renderHelp() {
    if (!elHelp) return;
    if (ui.activeTab !== "help") return;
    if (!ui.helpDirty) return;

    const block = (title, bodyHtml, open = false) =>
      `<details class="helpBlock" ${open ? "open" : ""}>
        <summary class="helpBlock__title">${title}</summary>
        <div class="helpBlock__body">${bodyHtml}</div>
      </details>`;
    const h = (t) => `<strong>${t}</strong>`;
    const br = '<br/>';
    const gap = '<div style="margin-top:8px"></div>';
    const tip = (t) => `<div class="muted" style="font-size:11px;margin-top:6px">提示：${t}</div>`;

    const rows = [];

    rows.push(`
      <div class="row">
        <div class="row__left">
          <div class="row__title">帮助文档</div>
          <div class="row__desc muted">版本 v0.41.0 · 时代纪元 / PvE / 道具 / 社交鉴权 · 点击各节标题展开详情</div>
        </div>
      </div>
    `);

    let nextGoal = "下一目标：继续采集、捕捉与远征循环。";
    let checklistHtml = "";
    let canBundle = false;
    let bundleClaimed = false;
    try {
      const state = typeof getState === "function" ? getState() : null;
      if (state) {
        let eraQuest = "";
        if (typeof getCaptureAreas === "function") {
          ensureEra(state);
          const era = syncEraQuests(state, getCaptureAreas);
          const nextQ = (era.quests || []).find((q) => q.kind === "main" && !q.done);
          if (nextQ) eraQuest = questLabel(nextQ);
        }
        let pveNext = "";
        const progress = state.pve?.progress || {};
        const dexCount = typeof dexCaughtUnique === "function" ? dexCaughtUnique() : 0;
        outer: for (const ch of PVE_CHAPTERS) {
          if (dexCount < ch.unlockDex) {
            pveNext = `解锁「${ch.name}」（需图鉴 ${ch.unlockDex}）`;
            break;
          }
          for (const st of ch.stages) {
            if (!isStageUnlocked(st.id, progress)) continue;
            if (!progress[st.id]) {
              pveNext = `${ch.name} · ${st.name}`;
              break outer;
            }
          }
        }
        const totalSpecies = Array.isArray(defs?.pokemon) ? defs.pokemon.length : 0;
        let unique = 0;
        const caught = state.dex?.caught || {};
        for (const v of Object.values(caught)) if (typeof v === "number" && v > 0) unique += 1;
        const dexPct = totalSpecies > 0 ? Math.round((unique / totalSpecies) * 100) : 0;
        nextGoal = liveNextGoalLine(state, { dexPct, eraQuest, pveNext });
        const goals = liveGoalsChecklist(state, { dexPct, eraQuest, pveNext });
        checklistHtml = goals
          .map((g) => `<div>${g.done ? "☑" : "☐"} ${escapeHtml(g.label)}</div>`)
          .join("");
        canBundle = canClaimDailyGoalsBundle(state, localDateStr());
        bundleClaimed = state.meta?.dailyGoalsClaimDate === localDateStr();
      }
    } catch {
      // keep default
    }

    rows.push(block("前30分钟路线", `
      <div style="line-height:1.9">
        <b>1. 采集</b>：顶栏【采集】换树果${br}
        <b>2. 研究</b>：研究页点${h('精灵球基础')}（完成后送球×5）${br}
        <b>3. 捕捉</b>：打开「捕捉」抓第一只${br}
        <b>4. 看世界</b>：「更多」→「排行榜」看 NPC 训练家${br}
        <b>5. 可选云账号</b>：「设置」注册 → 换机不丢档，还能加好友约战
      </div>
      ${tip('球到手后游戏会轻推你去捕捉；第一只到手后再提醒看榜/开云。')}
    `, true));

    rows.push(block("今日下一目标", `
      <div style="line-height:1.9">
        <b>${escapeHtml(nextGoal)}</b>${br}
        ${checklistHtml || ""}
        ${gap}<button type="button" class="btn btn--primary btn--small" data-help-goals-claim ${canBundle ? "" : "disabled"}>${bundleClaimed ? "日目标已领" : "三目标全清 +12"}</button>
        ${gap}也可按上方「前30分钟路线」或下方「快速开始」起步。
      </div>
      ${tip('清单随存档进度刷新：捕捉/训练/挑战日目标 + 时代或关卡提示。')}
    `, false));

    rows.push(block("快速开始", `
      <div style="line-height:1.9">
        <b>① 营地（篝火）</b>：点【采集】获取树果 → 尽快研究${h('精灵球基础')}（完成赠送精灵球×5）→ 去捕捉${br}
        <b>② 扩产</b>：建造${h('树果田')}和${h('球果营地')}，资源自动产出后再研究扩产科技${br}
        <b>③ 捕捉</b>：有球就抓精灵，组建队伍；图鉴有记录后开放「任务」页玩法${br}
        <b>④ 功能</b>：训练精灵提升等级，送精灵远征赚未来币（入口在「更多」）${br}
        <b>⑤ 循环</b>：用未来币购买全服Buff → 资源更多 → 建筑更强 → 继续收集${br}
        <b>⑥ 挑战</b>：图鉴≥5解锁道馆关卡；按推荐属性组队（能打又抗），失败也耗次数
      </div>
      ${tip('精灵球不够？建球果营地产球果，或研究「精灵球容量」科技。')}
    `, false));

    rows.push(block("营地（篝火页）", `
      <div style="line-height:1.8">
        ${h('采集按钮')}：最多储存 1000 次，每 10 秒回充 1 次。点击消耗次数换取资源。${br}
        ${h('建筑系统')}：建造后自动产出资源，每级提升产量/上限，费用随等级增长。
      </div>
      ${gap}
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="opacity:0.6"><td>建筑</td><td>主要效果</td></tr>
        <tr><td>树果田</td><td>每秒产出树果（基础资源）</td></tr>
        <tr><td>球果营地</td><td>产出球果，提升精灵球上限</td></tr>
        <tr><td>工坊</td><td>解锁并加速精灵球制作</td></tr>
        <tr><td>训练场</td><td>每级 +1 训练槽，上限 10 只</td></tr>
        <tr><td>🥚 饲养屋</td><td>解锁生蛋，支持孵化</td></tr>
        <tr><td>🗺️ 远征所</td><td>解锁远征，完成任务获经验+未来币</td></tr>
        <tr><td>💎 碎片矿场</td><td>持续产出进化石碎片</td></tr>
      </table>
      ${tip('资源不够用？先升级树果田和球果营地，再研究提升上限的科技。')}
    `));

    rows.push(block("研究（科技页）", `
      <div style="line-height:1.8">
        ${h('前置条件')}：部分科技需要先完成其他科技或建造特定建筑。灰色=未解锁，蓝色=可研究。${br}
        ${h('研究进度')}：每次只能研究一项，显示进度条和剩余时间。${br}
        ${h('研究速度')}：全服科研Buff、电系精灵技能可临时加速。${br}
        ${h('推荐顺序')}：精灵球上限 → 捕获率 → 资源产量 → 进化相关 → 高级科技
      </div>
      ${tip('有多余资源时可以点击「优先研究成本低」排序，效率更高。')}
    `));

    rows.push(block("捕捉系统", `
      <div style="line-height:1.8">
        ${h('稀有度')}：普通(80%) · 少见(15%) · 稀有(4%) · 史诗(1%)${br}
        ${h('闪光精灵')}：极小概率，出现时有全屏特效提示${br}
        ${h('神兽/传说')}：特殊区域，捕获率极低，建议配合龙系技能和捕获Buff${br}
        捕捉页有「时代」主线任务；完成条件后可迈入下一时代，规则加成会叠加，存档资源/精灵不重置。
      </div>
      ${gap}
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="opacity:0.6"><td>区域</td><td>解锁图鉴数</td><td>编号</td></tr>
        <tr><td>关都草丛</td><td>0种</td><td>001-151</td></tr>
        <tr><td>城都树林</td><td>25种</td><td>152-251</td></tr>
        <tr><td>丰缘海岸</td><td>70种</td><td>252-386</td></tr>
        <tr><td>神奥雪原</td><td>140种</td><td>387-493</td></tr>
        <tr><td>合众沙漠</td><td>210种</td><td>494-649</td></tr>
        <tr><td>卡洛斯花田</td><td>280种</td><td>650-721</td></tr>
        <tr><td>阿罗拉海岛</td><td>350种</td><td>722-809</td></tr>
        <tr><td>伽勒尔旷野</td><td>430种</td><td>810-905</td></tr>
      </table>
      ${tip('龙系精灵技能可临时提升捕获率，抓神兽前先用！')}
    `));

    rows.push(block("精灵培育", `
      <div style="line-height:1.9">
        ${h('训练')}：放入训练场自动升级。训练场等级 = 同时训练数量（最多10只）。${br}
        ${h('生蛋')}：选两只精灵放入饲养屋，亲密度越高越快生蛋，火系技能可加速。${br}
        ${h('进化')}：消耗进化石碎片 → 进化石 → 稀有糖果，逐步进化精灵。${br}
        ${h('远征')}：派队去任务，完成后获得经验+未来币，概率掉落药剂道具。${br}
        ${h('亲密度')}：喂食/训练/技能互动都能提升，影响生蛋速度和部分技能效果。
      </div>
      ${tip('远征是最稳定的未来币来源，建议全天候保持远征队在线。')}
    `));

    rows.push(block("精灵技能一览", `
      <div class="muted" style="margin-bottom:8px">技能消耗饱腹度，低于阈值会失败。技能有冷却时间，部分技能有前置状态要求。</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        
        <tr style='opacity:0.6'><td>属性</td><td>技能效果</td><td>前置条件</td></tr>
        <tr><td>格斗</td><td>训练叠加+1（加速升级）</td><td>有精灵在训练</td></tr>
        <tr><td>草</td><td>种植果树（产大树果）</td><td>有树果</td></tr>
        <tr><td>水</td><td>给果树浇水加速成熟</td><td>有果树生长中</td></tr>
        <tr><td>火</td><td>生蛋加速</td><td>饲养屋生蛋中</td></tr>
        <tr><td>电</td><td>当前研究减少冷却时间</td><td>有科技研究中</td></tr>
        <tr><td>地面</td><td>进入挖矿状态（产进化能量）</td><td>无</td></tr>
        <tr><td>毒</td><td>资源消耗减少20%（60分钟）</td><td>无</td></tr>
        <tr><td>飞行</td><td>探险剩余时间 -30分钟</td><td>有探险任务</td></tr>
        <tr><td>超能力</td><td>合成时间 -20%（下10次）</td><td>无</td></tr>
        <tr><td>岩石</td><td>建筑成本降低20%（60分钟）</td><td>无</td></tr>
        <tr><td>冰</td><td>饱腹度下降减慢60分钟</td><td>无</td></tr>
        <tr><td>龙</td><td>捕获率提升10分钟</td><td>无</td></tr>
        <tr><td>恶</td><td>PVE伤害+50% 10分钟</td><td>无</td></tr>
        <tr><td>钢</td><td>精灵球制作成本-10%（100次）</td><td>无</td></tr>
        <tr><td>妖精</td><td>亲密度增长加速60分钟</td><td>无</td></tr>
        <tr><td>一般</td><td>全队资源产量提升（可叠加）</td><td>无</td></tr>
        <tr><td>幽灵</td><td>随机一只精灵技能冷却减半</td><td>无</td></tr>
        <tr><td>虫</td><td>恐吓林佬（需服务器连接）</td><td>林佬存活</td></tr>
      </table>
    `));

    rows.push(block("未来币与全服 Buff", `
      <div style='line-height:1.8'>
        <strong>未来币来源</strong>：远征完成、每日任务（含连续登录）、林佬奖励<br/>
        <strong>用途</strong>：购买全服Buff（1币≈1分钟），兑换道具
      </div>
      <table style='width:100%;border-collapse:collapse;font-size:12px'>
        <tr style='opacity:0.6'><td>Buff</td><td>每级效果</td></tr>
        <tr><td>全服经验</td><td>+5% 经验获取</td></tr>
        <tr><td>全服资源产量</td><td>+5% 所有资源产量</td></tr>
        <tr><td>全服资源上限</td><td>+5% 所有资源上限</td></tr>
        <tr><td>全服科研速度</td><td>+10% 科研速度</td></tr>
        <tr><td>全服捕获率</td><td>+5% 捕获成功率</td></tr>
        <tr><td>全服亲密度</td><td>+5% 亲密度增长</td></tr>
      </table>
      <div class='muted' style='font-size:11px;margin-top:6px'>提示：全服Buff全服共享——你买了大家受益。</div>
    `));

    rows.push(block("每日任务", `
      <div style='line-height:1.8'>
        每天随机 5 个玩法目标；完成任意任务后可在「商店与合成」领取奖励。<br/>
        <strong>连续登录</strong>已并入任务领取：领奖时自动发放当日连续登录奖励（7天循环），不再单独签到。
      </div>
      <table style='width:100%;border-collapse:collapse;font-size:12px'>
        <tr style='opacity:0.6'><td>连续天数</td><td>登录奖励</td></tr>
        <tr><td>第1天</td><td>未来币x5 + 树果x500</td></tr>
        <tr><td>第2天</td><td>未来币x5 + 球果x200</td></tr>
        <tr><td>第3天</td><td>未来币x10 + 进化石碎片x100</td></tr>
        <tr><td>第4天</td><td>未来币x10 + 精灵球x50</td></tr>
        <tr><td>第5天</td><td>未来币x15 + 稀有糖果x1</td></tr>
        <tr><td>第6天</td><td>未来币x20 + 进化能量x2</td></tr>
        <tr><td>第7天</td><td>未来币x50 + 进化石x1 + 稀有糖果x3</td></tr>
      </table>
      <div class='muted' style='font-size:11px;margin-top:6px'>提示：月卡每日领取仍在未来币商店，与任务独立。</div>
    `));

    rows.push(block("图鉴与排行榜", `
      <div style='line-height:1.8'>
        <strong>图鉴加成</strong>：每登记一种新精灵，全局资源产量永久提升。<br/>
        <strong>排行榜</strong>：展示全服玩家精灵战斗力排名，需在设置页注册昵称才能上榜。<br/>
        <strong>筛选功能</strong>：图鉴页支持按地区/属性/稀有度筛选。
      </div>
      <div class='muted' style='font-size:11px;margin-top:6px'>提示：同种精灵重复收集不增加图鉴加成，但可用于进化和远征。</div>
    `));

    rows.push(block("云存档与设置", `
      <div style='line-height:1.8'>
        <strong>注册账号</strong>：在设置页输入用户名/密码注册。<br/>
        <strong>存档槽</strong>：槽 0 为自动存档（主进度）；槽 1 为手动存档。登录后可在设置页查看各槽本地/云端时间并单独拉取或上传。<br/>
        <strong>立即同步</strong>：按时间戳合并所有已接入槽位；若发生冲突会弹出选择：保留本地、保留云端或取消。<br/>
        <strong>自动同步</strong>：游戏每30秒自动上传槽 0；后台冲突会静默跳过，需手动同步处理。<br/>
        <strong>换设备</strong>：登录同一账号后点立即同步或拉取槽 0。<br/>
        <strong>忘记密码</strong>：暂不支持自助找回，请联系管理员，或先导出本地存档备份。
      </div>
      <div class='muted' style='font-size:11px;margin-top:6px'>提示：换设备前务必手动同步一次，避免进度丢失。</div>
    `));

    rows.push(block("常见问题", `
      <div style='line-height:1.9'>
        <b>Q: 按钮点了没反应？</b><br/>
        A: 检查：①资源是否足够 ②是否在冷却中 ③前置条件是否满足<br/>
        <div style='margin-top:6px'></div>
        <b>Q: 精灵球不够用？</b><br/>
        A: 升级球果营地 + 研究精灵球容量科技 + 购买全服捕获Buff<br/>
        <div style='margin-top:6px'></div>
        <b>Q: 游戏加载失败？</b><br/>
        A: 强制刷新（Ctrl+Shift+R），仍失败请清除浏览器缓存<br/>
        <div style='margin-top:6px'></div>
        <b>Q: 存档丢失？</b><br/>
        A: 设置页从备份恢复，或登录云存档账号拉取云端存档
      </div>
    `));

    elHelp.innerHTML = rows.join("");
    const claimBtn = elHelp.querySelector("[data-help-goals-claim]");
    if (claimBtn) {
      claimBtn.addEventListener("click", () => {
        const state = typeof getState === "function" ? getState() : null;
        if (!state) return;
        if (!markDailyGoalsBundleClaimed(state, localDateStr())) {
          if (typeof addLog === "function") addLog("日目标未完成或已领取");
          return;
        }
        if (typeof addRes === "function") addRes("futurecoin", 12);
        if (typeof addLog === "function") addLog("日目标全清：未来币 +12", true);
        ui.helpDirty = true;
        if (typeof render === "function") render();
      });
    }
    ui.helpDirty = false;
  };
}
