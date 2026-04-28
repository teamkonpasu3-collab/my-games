const allyAreaEl = document.getElementById('allyArea');
const enemyAreaEl = document.getElementById('enemyArea');
const turnInfoEl = document.getElementById('turnInfo');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const skillButtonsEl = document.getElementById('skillButtons');
const targetHintEl = document.getElementById('targetHint');
const commandTitleEl = document.getElementById('commandTitle');
const selectionSummaryEl = document.getElementById('selectionSummary');
const backBtn = document.getElementById('backBtn');
const confirmBtn = document.getElementById('confirmBtn');
const restartBtn = document.getElementById('restartBtn');

const MAX_LOG_LINES = 80;
const SPRITE_ATLAS = 'assets/party-and-monsters.png';

const TARGET = {
  ENEMY_SINGLE: 'enemy_single',
  ENEMY_ALL: 'enemy_all',
  ALLY_SINGLE: 'ally_single',
  ALLY_ALL: 'ally_all',
  SELF: 'self'
};

const STATUS = {
  ATTACK_UP: 'attack_up',
  DEF_DOWN: 'def_down',
  STUN: 'stun',
  REGEN: 'regen'
};

function createSkill({ id, name, targetType, cooldown = 0, desc, effects }) {
  return { id, name, targetType, cooldown, desc, effects };
}

function createCharacter({ id, name, side, role, maxHp, atk, def, spd, sprite, icon, skills }) {
  return {
    id,
    name,
    side,
    role,
    maxHp,
    hp: maxHp,
    atk,
    def,
    spd,
    sprite,
    icon,
    skills,
    alive: true,
    statuses: [],
    cooldowns: Object.fromEntries(skills.map((skill) => [skill.id, 0]))
  };
}

const skills = {
  slash: createSkill({ id: 'slash', name: 'スラッシュ', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ', effects: [{ type: 'damage', ratio: 0.9 }] }),
  powerStrike: createSkill({ id: 'powerStrike', name: 'パワーストライク', targetType: TARGET.ENEMY_SINGLE, cooldown: 2, desc: '中ダメージ', effects: [{ type: 'damage', ratio: 1.5 }] }),
  braveBurst: createSkill({ id: 'braveBurst', name: 'ブレイブバースト', targetType: TARGET.ENEMY_SINGLE, cooldown: 4, desc: '大ダメージ', effects: [{ type: 'damage', ratio: 2.3 }] }),

  wandTap: createSkill({ id: 'wandTap', name: 'ワンドヒット', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ+最低HP味方を小回復', effects: [{ type: 'damage', ratio: 0.8 }, { type: 'heal_lowest_ally', ratio: 0.22 }] }),
  singleHeal: createSkill({ id: 'singleHeal', name: 'ヒール', targetType: TARGET.ALLY_SINGLE, cooldown: 2, desc: '味方単体回復', effects: [{ type: 'heal', ratio: 0.45 }] }),
  allHeal: createSkill({ id: 'allHeal', name: 'グループヒール', targetType: TARGET.ALLY_ALL, cooldown: 5, desc: '味方全体回復', effects: [{ type: 'heal', ratio: 0.26 }] }),

  arrowShot: createSkill({ id: 'arrowShot', name: 'アロウショット', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ+自分に攻撃UP', effects: [{ type: 'damage', ratio: 0.8 }, { type: 'apply_status', status: STATUS.ATTACK_UP, turns: 2, potency: 0.2, target: 'self' }] }),
  battleCry: createSkill({ id: 'battleCry', name: 'バトルクライ', targetType: TARGET.ALLY_SINGLE, cooldown: 3, desc: '味方単体に攻撃UP', effects: [{ type: 'apply_status', status: STATUS.ATTACK_UP, turns: 2, potency: 0.3 }] }),
  rallySong: createSkill({ id: 'rallySong', name: 'ラリーソング', targetType: TARGET.ALLY_ALL, cooldown: 5, desc: '味方全体に攻撃UP', effects: [{ type: 'apply_status', status: STATUS.ATTACK_UP, turns: 2, potency: 0.2 }] }),

  jabHex: createSkill({ id: 'jabHex', name: 'ヘックスジャブ', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ+防御ダウン', effects: [{ type: 'damage', ratio: 0.75 }, { type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.2 }] }),
  stunBomb: createSkill({ id: 'stunBomb', name: 'スタンボム', targetType: TARGET.ENEMY_SINGLE, cooldown: 3, desc: '敵単体を気絶', effects: [{ type: 'apply_status', status: STATUS.STUN, turns: 1 }] }),
  breakStorm: createSkill({ id: 'breakStorm', name: 'ブレイクストーム', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に防御ダウン', effects: [{ type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.25 }] }),

  slimeShot: createSkill({ id: 'slimeShot', name: 'ぷるショット', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ', effects: [{ type: 'damage', ratio: 0.85 }] }),
  slimeWrap: createSkill({ id: 'slimeWrap', name: 'ねばり付き', targetType: TARGET.ENEMY_SINGLE, cooldown: 3, desc: '小ダメージ+防御ダウン', effects: [{ type: 'damage', ratio: 0.8 }, { type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.2 }] }),
  slimeRain: createSkill({ id: 'slimeRain', name: 'スライムレイン', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に小ダメージ', effects: [{ type: 'damage', ratio: 0.9 }] }),

  claw: createSkill({ id: 'claw', name: 'ファイアクロー', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ', effects: [{ type: 'damage', ratio: 0.95 }] }),
  flameBreath: createSkill({ id: 'flameBreath', name: 'フレイムブレス', targetType: TARGET.ENEMY_SINGLE, cooldown: 2, desc: '中ダメージ', effects: [{ type: 'damage', ratio: 1.45 }] }),
  inferno: createSkill({ id: 'inferno', name: 'インフェルノ', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に中ダメージ', effects: [{ type: 'damage', ratio: 1.15 }] }),

  spiritTouch: createSkill({ id: 'spiritTouch', name: 'スピリットタッチ', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ+最低HP味方に継続回復', effects: [{ type: 'damage', ratio: 0.65 }, { type: 'apply_status', status: STATUS.REGEN, turns: 2, potency: 0.08, target: 'lowest_ally' }] }),
  soulMend: createSkill({ id: 'soulMend', name: 'ソウルメンド', targetType: TARGET.ALLY_SINGLE, cooldown: 3, desc: '味方単体回復', effects: [{ type: 'heal', ratio: 0.38 }] }),
  phantomPrayer: createSkill({ id: 'phantomPrayer', name: 'ファントム祈祷', targetType: TARGET.ALLY_ALL, cooldown: 5, desc: '味方全体に継続回復', effects: [{ type: 'apply_status', status: STATUS.REGEN, turns: 3, potency: 0.07 }] }),

  capHit: createSkill({ id: 'capHit', name: 'キャップアタック', targetType: TARGET.ENEMY_SINGLE, desc: '小ダメージ+防御ダウン', effects: [{ type: 'damage', ratio: 0.72 }, { type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.18 }] }),
  sporeSleep: createSkill({ id: 'sporeSleep', name: 'しびれ胞子', targetType: TARGET.ENEMY_SINGLE, cooldown: 3, desc: '敵単体を気絶', effects: [{ type: 'apply_status', status: STATUS.STUN, turns: 1 }] }),
  toxicField: createSkill({ id: 'toxicField', name: 'きのこフィールド', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に防御ダウン', effects: [{ type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.22 }] })
};

const state = {
  allies: [],
  enemies: [],
  turnOrder: [],
  turnIndex: 0,
  round: 1,
  currentActorId: null,
  pendingSkill: null,
  pendingTargetId: null,
  phase: 'idle',
  gameOver: false,
  animations: {
    actingId: null,
    damageIds: [],
    healIds: []
  }
};

function setupBattle() {
  state.allies = [
    createCharacter({ id: 'ally-warrior', name: '剣士ライル', side: 'ally', role: '攻撃役', maxHp: 130, atk: 35, def: 14, spd: 18, sprite: { col: 0, row: 0 }, icon: '🗡️', skills: [skills.slash, skills.powerStrike, skills.braveBurst] }),
    createCharacter({ id: 'ally-mage', name: '魔法使いミナ', side: 'ally', role: '回復役', maxHp: 110, atk: 24, def: 11, spd: 17, sprite: { col: 0, row: 1 }, icon: '🔮', skills: [skills.wandTap, skills.singleHeal, skills.allHeal] }),
    createCharacter({ id: 'ally-ranger', name: 'レンジャーノア', side: 'ally', role: '支援役', maxHp: 115, atk: 26, def: 12, spd: 22, sprite: { col: 0, row: 2 }, icon: '🏹', skills: [skills.arrowShot, skills.battleCry, skills.rallySong] }),
    createCharacter({ id: 'ally-priest', name: '神官セレス', side: 'ally', role: '妨害役', maxHp: 120, atk: 22, def: 13, spd: 16, sprite: { col: 0, row: 3 }, icon: '✨', skills: [skills.jabHex, skills.stunBomb, skills.breakStorm] })
  ];

  state.enemies = [
    createCharacter({ id: 'enemy-slime', name: 'スライム', side: 'enemy', role: '攻撃役', maxHp: 125, atk: 28, def: 12, spd: 16, sprite: { col: 1, row: 0 }, icon: '💧', skills: [skills.slimeShot, skills.slimeWrap, skills.slimeRain] }),
    createCharacter({ id: 'enemy-dragon', name: 'ドラゴン', side: 'enemy', role: '攻撃役', maxHp: 150, atk: 33, def: 15, spd: 14, sprite: { col: 1, row: 1 }, icon: '🐉', skills: [skills.claw, skills.flameBreath, skills.inferno] }),
    createCharacter({ id: 'enemy-ghost', name: 'ゴースト', side: 'enemy', role: '回復役', maxHp: 105, atk: 20, def: 10, spd: 20, sprite: { col: 1, row: 2 }, icon: '👻', skills: [skills.spiritTouch, skills.soulMend, skills.phantomPrayer] }),
    createCharacter({ id: 'enemy-mushroom', name: 'マッシュ', side: 'enemy', role: '妨害役', maxHp: 118, atk: 21, def: 12, spd: 15, sprite: { col: 1, row: 3 }, icon: '🍄', skills: [skills.capHit, skills.sporeSleep, skills.toxicField] })
  ];

  state.turnOrder = [];
  state.turnIndex = 0;
  state.round = 1;
  state.currentActorId = null;
  state.pendingSkill = null;
  state.pendingTargetId = null;
  state.phase = 'idle';
  state.gameOver = false;
  clearAnimations();
  logEl.innerHTML = '';
  appendLog('バトル開始！素早さ順に行動します。', 'system');
  advanceToNextTurn();
}

function getAllUnits() {
  return [...state.allies, ...state.enemies];
}

function getUnitById(id) {
  return getAllUnits().find((u) => u.id === id);
}

function livingUnits(side) {
  const pool = side === 'ally' ? state.allies : state.enemies;
  return pool.filter((u) => u.alive);
}

function recalculateTurnOrder() {
  state.turnOrder = getAllUnits()
    .filter((u) => u.alive)
    .sort((a, b) => b.spd - a.spd || Math.random() - 0.5)
    .map((u) => u.id);
}

function getStatus(unit, type) {
  return unit.statuses.find((s) => s.type === type);
}

function addOrRefreshStatus(target, statusData) {
  const existing = getStatus(target, statusData.status);
  if (existing) {
    existing.turns = Math.max(existing.turns, statusData.turns);
    existing.potency = Math.max(existing.potency || 0, statusData.potency || 0);
  } else {
    target.statuses.push({
      type: statusData.status,
      turns: statusData.turns,
      potency: statusData.potency || 0
    });
  }
}

function decrementCooldowns(unit) {
  unit.skills.forEach((skill) => {
    if (unit.cooldowns[skill.id] > 0) unit.cooldowns[skill.id] -= 1;
  });
}

function processTurnStart(unit) {
  decrementCooldowns(unit);

  const regen = getStatus(unit, STATUS.REGEN);
  if (regen && unit.alive) {
    const amount = Math.max(4, Math.floor(unit.maxHp * regen.potency));
    const healed = healUnit(unit, amount);
    if (healed > 0) appendLog(`${unit.name} は継続回復で ${healed} 回復。`, 'heal');
  }

  const stun = getStatus(unit, STATUS.STUN);
  if (stun) {
    appendLog(`${unit.name} は気絶して行動できない。`, 'system');
    consumeStatuses(unit);
    render();
    setTimeout(() => advanceToNextTurn(), 550);
    return false;
  }

  return true;
}

function consumeStatuses(unit) {
  unit.statuses = unit.statuses.map((s) => ({ ...s, turns: s.turns - 1 })).filter((s) => s.turns > 0);
}

function healUnit(target, amount) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

function calculateDamage(attacker, target, ratio) {
  const atkUp = getStatus(attacker, STATUS.ATTACK_UP);
  const defDown = getStatus(target, STATUS.DEF_DOWN);
  const atkBuff = 1 + ((atkUp && atkUp.potency) || 0);
  const defDebuff = 1 + ((defDown && defDown.potency) || 0);
  const atkVal = attacker.atk * atkBuff;
  const defVal = Math.max(1, target.def / defDebuff);
  const base = Math.max(1, Math.floor(atkVal * ratio - defVal * 0.5));
  const variance = Math.floor(Math.random() * 5) - 2;
  return Math.max(1, base + variance);
}

function damageUnit(attacker, target, ratio, skillName) {
  const amount = calculateDamage(attacker, target, ratio);
  target.hp -= amount;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    appendLog(`${skillName}: ${target.name} に ${amount} ダメージ！`, 'damage');
    appendLog(`${target.name} は倒れた。`, 'system');
  } else {
    appendLog(`${skillName}: ${target.name} に ${amount} ダメージ！`, 'damage');
  }
  return amount;
}

function pickTargets(actor, skill, preferredTargetId = null) {
  const allies = livingUnits(actor.side);
  const enemies = livingUnits(actor.side === 'ally' ? 'enemy' : 'ally');

  switch (skill.targetType) {
    case TARGET.ENEMY_SINGLE: {
      if (preferredTargetId) {
        const preferred = getUnitById(preferredTargetId);
        if (preferred && preferred.alive && preferred.side !== actor.side) return [preferred];
      }
      return [enemies[Math.floor(Math.random() * enemies.length)]];
    }
    case TARGET.ENEMY_ALL:
      return enemies;
    case TARGET.ALLY_SINGLE: {
      if (preferredTargetId) {
        const preferred = getUnitById(preferredTargetId);
        if (preferred && preferred.alive && preferred.side === actor.side) return [preferred];
      }
      return [allies[Math.floor(Math.random() * allies.length)]];
    }
    case TARGET.ALLY_ALL:
      return allies;
    case TARGET.SELF:
      return [actor];
    default:
      return [];
  }
}

function lowestHpRateUnit(units) {
  return units.reduce((lowest, unit) => ((unit.hp / unit.maxHp) < (lowest.hp / lowest.maxHp) ? unit : lowest), units[0]);
}

function playActionAnimation(actorId, damageIds, healIds) {
  state.animations.actingId = actorId;
  state.animations.damageIds = [...new Set(damageIds)];
  state.animations.healIds = [...new Set(healIds)];
  render();
  setTimeout(() => {
    clearAnimations();
    render();
  }, 320);
}

function clearAnimations() {
  state.animations.actingId = null;
  state.animations.damageIds = [];
  state.animations.healIds = [];
}

function executeSkill(actor, skill, targetId = null) {
  if (!actor.alive) return;

  const targets = pickTargets(actor, skill, targetId);
  if (!targets.length) return;

  appendLog(`${actor.name} の ${skill.name}！`, 'system');

  const damageIds = [];
  const healIds = [];

  skill.effects.forEach((effect) => {
    if (effect.type === 'damage') {
      targets.forEach((target) => {
        if (!target.alive) return;
        damageUnit(actor, target, effect.ratio, skill.name);
        damageIds.push(target.id);
      });
    }

    if (effect.type === 'heal') {
      targets.forEach((target) => {
        const amount = Math.max(6, Math.floor(target.maxHp * effect.ratio));
        const healed = healUnit(target, amount);
        appendLog(`${skill.name}: ${target.name} が ${healed} 回復。`, 'heal');
        if (healed > 0) healIds.push(target.id);
      });
    }

    if (effect.type === 'heal_lowest_ally') {
      const allies = livingUnits(actor.side);
      if (allies.length) {
        const target = lowestHpRateUnit(allies);
        const amount = Math.max(5, Math.floor(target.maxHp * effect.ratio));
        const healed = healUnit(target, amount);
        appendLog(`${skill.name}: ${target.name} が ${healed} 回復。`, 'heal');
        if (healed > 0) healIds.push(target.id);
      }
    }

    if (effect.type === 'apply_status') {
      let statusTargets = targets;
      if (effect.target === 'self') statusTargets = [actor];
      if (effect.target === 'lowest_ally') {
        const allies = livingUnits(actor.side);
        statusTargets = allies.length ? [lowestHpRateUnit(allies)] : [];
      }
      statusTargets.forEach((target) => {
        addOrRefreshStatus(target, effect);
        appendLog(`${skill.name}: ${target.name} に ${statusLabel(effect.status)} (${effect.turns}T)。`, 'system');
      });
    }
  });

  if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;
  consumeStatuses(actor);
  playActionAnimation(actor.id, damageIds, healIds);
}

function statusLabel(type) {
  if (type === STATUS.ATTACK_UP) return '攻撃UP';
  if (type === STATUS.DEF_DOWN) return '防御DOWN';
  if (type === STATUS.STUN) return '気絶';
  if (type === STATUS.REGEN) return '継続回復';
  return type;
}

function chooseEnemyAction(enemy) {
  const available = enemy.skills.filter((skill) => enemy.cooldowns[skill.id] === 0);
  const enemyTeam = livingUnits('enemy');
  const opponents = livingUnits('ally');

  const bigSkill = available.find((skill) => skill.cooldown >= 5);
  if (bigSkill && Math.random() < 0.65) return { skill: bigSkill, targetId: null };

  const healSkill = available.find((skill) => skill.effects.some((e) => e.type === 'heal' || e.type === 'heal_lowest_ally'));
  const hurtAlly = enemyTeam.find((u) => u.hp / u.maxHp < 0.55);
  if (healSkill && hurtAlly) return { skill: healSkill, targetId: hurtAlly.id };

  const weightedTargets = [];
  opponents.forEach((unit) => {
    const rate = unit.hp / unit.maxHp;
    const weight = rate < 0.4 ? 3 : rate < 0.7 ? 2 : 1;
    for (let i = 0; i < weight; i += 1) weightedTargets.push(unit);
  });
  const chosenTarget = weightedTargets[Math.floor(Math.random() * weightedTargets.length)] || opponents[0];

  const pickedSkill = [...available].sort((a, b) => b.cooldown - a.cooldown)[0] || enemy.skills[0];
  return { skill: pickedSkill, targetId: (chosenTarget && chosenTarget.id) || null };
}

function checkGameOver() {
  const allyAlive = livingUnits('ally').length > 0;
  const enemyAlive = livingUnits('enemy').length > 0;
  if (!allyAlive || !enemyAlive) {
    state.gameOver = true;
    state.phase = 'ended';
    state.pendingSkill = null;
    state.pendingTargetId = null;
    statusEl.textContent = allyAlive ? '勝利！敵を全滅させた。' : '敗北…味方が全滅した。';
    turnInfoEl.textContent = 'バトル終了';
    targetHintEl.textContent = 'リスタートで再戦できます。';
    return true;
  }
  return false;
}

function advanceToNextTurn() {
  if (state.gameOver) return;

  if (!state.turnOrder.length || state.turnIndex >= state.turnOrder.length) {
    recalculateTurnOrder();
    state.turnIndex = 0;
    state.round += 1;
  }

  const actorId = state.turnOrder[state.turnIndex];
  state.turnIndex += 1;
  const actor = getUnitById(actorId);

  if (!actor || !actor.alive) {
    advanceToNextTurn();
    return;
  }

  state.currentActorId = actor.id;
  state.pendingSkill = null;
  state.pendingTargetId = null;
  turnInfoEl.textContent = `Round ${state.round} / 行動: ${actor.name}`;

  const canAct = processTurnStart(actor);
  if (!canAct) return;

  if (actor.side === 'ally') {
    state.phase = 'await_player_skill';
    statusEl.textContent = `${actor.name} の行動。スキルを選択してください。`;
    targetHintEl.textContent = 'スキル選択後、対象指定または発動確認を行います。';
    render();
    return;
  }

  state.phase = 'enemy_acting';
  statusEl.textContent = `${actor.name} が行動中...`;
  render();

  setTimeout(() => {
    const action = chooseEnemyAction(actor);
    executeSkill(actor, action.skill, action.targetId);
    if (!checkGameOver()) {
      render();
      setTimeout(() => advanceToNextTurn(), 560);
    }
    render();
  }, 550);
}

function isSingleTarget(skill) {
  return skill.targetType === TARGET.ENEMY_SINGLE || skill.targetType === TARGET.ALLY_SINGLE;
}

function targetLabelForSkill(skill) {
  if (skill.targetType === TARGET.ENEMY_ALL) return '敵全体';
  if (skill.targetType === TARGET.ALLY_ALL) return '味方全体';
  if (skill.targetType === TARGET.SELF) return '自分';
  if (skill.targetType === TARGET.ENEMY_SINGLE) return '敵単体';
  if (skill.targetType === TARGET.ALLY_SINGLE) return '味方単体';
  return '対象なし';
}

function onSkillClick(skill) {
  const actor = getUnitById(state.currentActorId);
  if (!actor || !state.phase.startsWith('await_player')) return;
  if (actor.cooldowns[skill.id] > 0) return;

  state.pendingSkill = skill;
  state.pendingTargetId = null;

  if (isSingleTarget(skill)) {
    state.phase = 'await_player_target';
    statusEl.textContent = `${skill.name} の対象を選択。別スキルへ変更も可能です。`;
    targetHintEl.textContent = skill.targetType === TARGET.ENEMY_SINGLE ? '右側の敵をタップ（戻る可）' : '左側の味方をタップ（戻る可）';
    render();
    return;
  }

  state.phase = 'await_player_confirm';
  statusEl.textContent = `${skill.name} を発動しますか？`;
  targetHintEl.textContent = `${targetLabelForSkill(skill)}に効果。発動前に戻って変更できます。`;
  render();
}

function onUnitClick(unitId) {
  if (state.phase !== 'await_player_target') return;

  const actor = getUnitById(state.currentActorId);
  const skill = state.pendingSkill;
  const target = getUnitById(unitId);
  if (!actor || !skill || !target || !target.alive) return;

  const enemySingle = skill.targetType === TARGET.ENEMY_SINGLE && target.side !== actor.side;
  const allySingle = skill.targetType === TARGET.ALLY_SINGLE && target.side === actor.side;
  if (!enemySingle && !allySingle) return;

  state.pendingTargetId = target.id;
  state.phase = 'await_player_confirm';
  statusEl.textContent = `${target.name} に ${skill.name} を使用します。`;
  targetHintEl.textContent = '発動するか、戻って選び直してください。';
  render();
}

function onBackClick() {
  if (!state.phase.startsWith('await_player')) return;
  state.pendingSkill = null;
  state.pendingTargetId = null;
  state.phase = 'await_player_skill';

  const actor = getUnitById(state.currentActorId);
  statusEl.textContent = `${(actor && actor.name) || ''} の行動。スキルを選択してください。`;
  targetHintEl.textContent = 'スキルを選ぶと対象を選択・確認できます。';
  render();
}

function onConfirmClick() {
  if (state.phase !== 'await_player_confirm') return;

  const actor = getUnitById(state.currentActorId);
  const skill = state.pendingSkill;
  if (!actor || !skill) return;

  if (isSingleTarget(skill)) {
    const target = getUnitById(state.pendingTargetId);
    if (!target || !target.alive) {
      statusEl.textContent = '対象が無効です。選び直してください。';
      state.phase = 'await_player_target';
      render();
      return;
    }
  }

  executeSkill(actor, skill, state.pendingTargetId);
  state.pendingSkill = null;
  state.pendingTargetId = null;

  if (!checkGameOver()) advanceToNextTurn();
  render();
}

function spriteStyle(unit) {
  const colPercent = unit.sprite.col * 100;
  const rowPercent = unit.sprite.row * 33.333;
  return `background-image:url('${SPRITE_ATLAS}');background-position:${colPercent}% ${rowPercent}%;`;
}

function renderUnitList(container, units) {
  container.innerHTML = '';
  const actorId = state.currentActorId;

  units.forEach((unit) => {
    const hpRate = Math.max(0, (unit.hp / unit.maxHp) * 100);
    const isActive = actorId === unit.id;

    const isChoosingEnemy = state.phase === 'await_player_target' && state.pendingSkill && state.pendingSkill.targetType === TARGET.ENEMY_SINGLE;
    const isChoosingAlly = state.phase === 'await_player_target' && state.pendingSkill && state.pendingSkill.targetType === TARGET.ALLY_SINGLE;
    const canTargetEnemy = isChoosingEnemy && unit.side === 'enemy' && unit.alive;
    const canTargetAlly = isChoosingAlly && unit.side === 'ally' && unit.alive;
    const selectedTarget = state.pendingTargetId === unit.id && state.phase === 'await_player_confirm';

    const card = document.createElement('div');
    card.className = [
      'unit',
      unit.alive ? '' : 'dead',
      isActive ? 'active' : '',
      (canTargetEnemy || canTargetAlly) ? 'selectable' : '',
      selectedTarget ? 'target-selected' : '',
      state.animations.actingId === unit.id ? 'anim-attacking' : '',
      state.animations.damageIds.includes(unit.id) ? 'anim-damaged' : '',
      state.animations.healIds.includes(unit.id) ? 'anim-healed' : ''
    ].filter(Boolean).join(' ');

    const badges = unit.statuses.map((s) => `<span class="badge">${statusLabel(s.type)}:${s.turns}</span>`).join('');

    card.innerHTML = `
      <div class="unit-main">
        <div class="sprite" style="${spriteStyle(unit)}"><span class="sprite-fallback">${unit.icon}</span></div>
        <div class="unit-info">
          <div class="unit-header">
            <strong>${unit.name}</strong>
            <small>${unit.role}</small>
          </div>
          <div>HP ${unit.hp}/${unit.maxHp}</div>
          <div class="hp-bar"><span class="hp-fill" style="width:${hpRate}%"></span></div>
          <div class="badges">${badges || '<span class="badge">-</span>'}</div>
        </div>
      </div>
    `;

    if (canTargetEnemy || canTargetAlly) card.addEventListener('click', () => onUnitClick(unit.id));
    container.appendChild(card);
  });
}

function renderSkillButtons() {
  skillButtonsEl.innerHTML = '';
  const actor = getUnitById(state.currentActorId);

  if (!actor || actor.side !== 'ally' || state.gameOver) {
    commandTitleEl.textContent = 'コマンド';
    return;
  }

  commandTitleEl.textContent = `${actor.name} のスキル`;
  const selectablePhase = state.phase.startsWith('await_player');

  actor.skills.forEach((skill, index) => {
    const cd = actor.cooldowns[skill.id];
    const btn = document.createElement('button');
    btn.className = `skill ${state.pendingSkill && state.pendingSkill.id === skill.id ? 'selected' : ''}`.trim();
    btn.disabled = !selectablePhase || cd > 0;
    const cdText = cd > 0 ? `CT: ${cd}` : '使用可能';
    btn.innerHTML = `S${index + 1} ${skill.name}<small>${skill.desc} / ${cdText}</small>`;
    btn.addEventListener('click', () => onSkillClick(skill));
    skillButtonsEl.appendChild(btn);
  });
}

function renderConfirmRow() {
  const actor = getUnitById(state.currentActorId);
  const skill = state.pendingSkill;
  const target = state.pendingTargetId ? getUnitById(state.pendingTargetId) : null;

  if (!actor || actor.side !== 'ally' || state.gameOver) {
    selectionSummaryEl.textContent = '';
    backBtn.style.display = 'none';
    confirmBtn.style.display = 'none';
    return;
  }

  const inPlayerFlow = state.phase.startsWith('await_player');
  backBtn.style.display = inPlayerFlow ? 'inline-block' : 'none';

  if (!skill) {
    selectionSummaryEl.textContent = 'スキルを選択してください。';
    confirmBtn.style.display = 'none';
    backBtn.disabled = true;
    return;
  }

  backBtn.disabled = false;
  if (state.phase === 'await_player_target') {
    selectionSummaryEl.textContent = `選択中: ${skill.name}（${targetLabelForSkill(skill)}）`;
    confirmBtn.style.display = 'none';
    return;
  }

  if (state.phase === 'await_player_confirm') {
    const targetText = target ? ` → ${target.name}` : ` → ${targetLabelForSkill(skill)}`;
    selectionSummaryEl.textContent = `確認: ${skill.name}${targetText}`;
    confirmBtn.style.display = 'inline-block';
    confirmBtn.disabled = isSingleTarget(skill) && !target;
    return;
  }

  selectionSummaryEl.textContent = 'スキルを選択してください。';
  confirmBtn.style.display = 'none';
}

function render() {
  renderUnitList(allyAreaEl, state.allies);
  renderUnitList(enemyAreaEl, state.enemies);
  renderSkillButtons();
  renderConfirmRow();
}

function appendLog(message, cls = '') {
  const line = document.createElement('div');
  line.className = `log-line ${cls}`.trim();
  line.textContent = message;
  logEl.prepend(line);

  while (logEl.children.length > MAX_LOG_LINES) {
    if (logEl.lastElementChild) logEl.lastElementChild.remove();
  }
}

restartBtn.addEventListener('click', setupBattle);
backBtn.addEventListener('click', onBackClick);
confirmBtn.addEventListener('click', onConfirmClick);
setupBattle();
