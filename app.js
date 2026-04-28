const allyAreaEl = document.getElementById('allyArea');
const enemyAreaEl = document.getElementById('enemyArea');
const turnInfoEl = document.getElementById('turnInfo');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const skillButtonsEl = document.getElementById('skillButtons');
const targetHintEl = document.getElementById('targetHint');
const commandTitleEl = document.getElementById('commandTitle');
const restartBtn = document.getElementById('restartBtn');

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

function createCharacter({ id, name, side, role, maxHp, atk, def, spd, skills }) {
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
    skills,
    alive: true,
    statuses: [],
    cooldowns: Object.fromEntries(skills.map((skill) => [skill.id, 0]))
  };
}

const skills = {
  slash: createSkill({ id: 'slash', name: 'スラッシュ', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ', effects: [{ type: 'damage', ratio: 0.9 }] }),
  powerStrike: createSkill({ id: 'powerStrike', name: 'パワーストライク', targetType: TARGET.ENEMY_SINGLE, cooldown: 2, desc: '中ダメージ', effects: [{ type: 'damage', ratio: 1.5 }] }),
  braveBurst: createSkill({ id: 'braveBurst', name: 'ブレイブバースト', targetType: TARGET.ENEMY_SINGLE, cooldown: 4, desc: '大ダメージ', effects: [{ type: 'damage', ratio: 2.3 }] }),

  wandTap: createSkill({ id: 'wandTap', name: 'ワンドヒット', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ+味方小回復', effects: [{ type: 'damage', ratio: 0.8 }, { type: 'heal_lowest_ally', ratio: 0.22 }] }),
  singleHeal: createSkill({ id: 'singleHeal', name: 'ヒール', targetType: TARGET.ALLY_SINGLE, cooldown: 2, desc: '味方単体回復', effects: [{ type: 'heal', ratio: 0.45 }] }),
  allHeal: createSkill({ id: 'allHeal', name: 'グループヒール', targetType: TARGET.ALLY_ALL, cooldown: 5, desc: '味方全体回復', effects: [{ type: 'heal', ratio: 0.26 }] }),

  arrowShot: createSkill({ id: 'arrowShot', name: 'アロウショット', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ+自分攻撃UP', effects: [{ type: 'damage', ratio: 0.8 }, { type: 'apply_status', status: STATUS.ATTACK_UP, turns: 2, potency: 0.2, target: 'self' }] }),
  battleCry: createSkill({ id: 'battleCry', name: 'バトルクライ', targetType: TARGET.ALLY_SINGLE, cooldown: 3, desc: '味方単体に攻撃UP', effects: [{ type: 'apply_status', status: STATUS.ATTACK_UP, turns: 2, potency: 0.28 }] }),
  rallySong: createSkill({ id: 'rallySong', name: 'ラリーソング', targetType: TARGET.ALLY_ALL, cooldown: 5, desc: '味方全体に攻撃UP', effects: [{ type: 'apply_status', status: STATUS.ATTACK_UP, turns: 2, potency: 0.18 }] }),

  jabHex: createSkill({ id: 'jabHex', name: 'ヘックスジャブ', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ+防御ダウン', effects: [{ type: 'damage', ratio: 0.75 }, { type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.2 }] }),
  stunBomb: createSkill({ id: 'stunBomb', name: 'スタンボム', targetType: TARGET.ENEMY_SINGLE, cooldown: 3, desc: '敵単体を気絶', effects: [{ type: 'apply_status', status: STATUS.STUN, turns: 1 }] }),
  breakStorm: createSkill({ id: 'breakStorm', name: 'ブレイクストーム', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に防御ダウン', effects: [{ type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.25 }] }),

  slimeShot: createSkill({ id: 'slimeShot', name: 'ぷるショット', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ', effects: [{ type: 'damage', ratio: 0.85 }] }),
  slimeWrap: createSkill({ id: 'slimeWrap', name: 'ねばり付き', targetType: TARGET.ENEMY_SINGLE, cooldown: 3, desc: '小ダメージ+防御ダウン', effects: [{ type: 'damage', ratio: 0.8 }, { type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.2 }] }),
  slimeRain: createSkill({ id: 'slimeRain', name: 'スライムレイン', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に小ダメージ', effects: [{ type: 'damage', ratio: 0.9 }] }),

  claw: createSkill({ id: 'claw', name: 'ファイアクロー', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ', effects: [{ type: 'damage', ratio: 0.95 }] }),
  flameBreath: createSkill({ id: 'flameBreath', name: 'フレイムブレス', targetType: TARGET.ENEMY_SINGLE, cooldown: 2, desc: '中ダメージ', effects: [{ type: 'damage', ratio: 1.45 }] }),
  inferno: createSkill({ id: 'inferno', name: 'インフェルノ', targetType: TARGET.ENEMY_ALL, cooldown: 5, desc: '敵全体に中ダメージ', effects: [{ type: 'damage', ratio: 1.15 }] }),

  spiritTouch: createSkill({ id: 'spiritTouch', name: 'スピリットタッチ', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ+継続回復', effects: [{ type: 'damage', ratio: 0.65 }, { type: 'apply_status', status: STATUS.REGEN, turns: 2, potency: 0.08, target: 'lowest_ally' }] }),
  soulMend: createSkill({ id: 'soulMend', name: 'ソウルメンド', targetType: TARGET.ALLY_SINGLE, cooldown: 3, desc: '味方単体回復', effects: [{ type: 'heal', ratio: 0.38 }] }),
  phantomPrayer: createSkill({ id: 'phantomPrayer', name: 'ファントム祈祷', targetType: TARGET.ALLY_ALL, cooldown: 5, desc: '味方全体に継続回復', effects: [{ type: 'apply_status', status: STATUS.REGEN, turns: 3, potency: 0.07 }] }),

  capHit: createSkill({ id: 'capHit', name: 'キャップアタック', targetType: TARGET.ENEMY_SINGLE, cooldown: 0, desc: '小ダメージ+防御ダウン', effects: [{ type: 'damage', ratio: 0.72 }, { type: 'apply_status', status: STATUS.DEF_DOWN, turns: 2, potency: 0.18 }] }),
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
  phase: 'idle',
  gameOver: false
};

function setupBattle() {
  state.allies = [
    createCharacter({ id: 'ally-warrior', name: '🛡️ 剣士ライル', side: 'ally', role: '攻撃役', maxHp: 130, atk: 35, def: 14, spd: 18, skills: [skills.slash, skills.powerStrike, skills.braveBurst] }),
    createCharacter({ id: 'ally-mage', name: '🔮 魔法使いミナ', side: 'ally', role: '回復役', maxHp: 110, atk: 24, def: 11, spd: 17, skills: [skills.wandTap, skills.singleHeal, skills.allHeal] }),
    createCharacter({ id: 'ally-ranger', name: '🏹 レンジャーノア', side: 'ally', role: '支援役', maxHp: 115, atk: 26, def: 12, spd: 22, skills: [skills.arrowShot, skills.battleCry, skills.rallySong] }),
    createCharacter({ id: 'ally-priest', name: '✨ 神官セレス', side: 'ally', role: '妨害役', maxHp: 120, atk: 22, def: 13, spd: 16, skills: [skills.jabHex, skills.stunBomb, skills.breakStorm] })
  ];

  state.enemies = [
    createCharacter({ id: 'enemy-slime', name: '💧 スライム', side: 'enemy', role: '攻撃役', maxHp: 125, atk: 28, def: 12, spd: 16, skills: [skills.slimeShot, skills.slimeWrap, skills.slimeRain] }),
    createCharacter({ id: 'enemy-dragon', name: '🐉 ドラゴン', side: 'enemy', role: '攻撃役', maxHp: 150, atk: 33, def: 15, spd: 14, skills: [skills.claw, skills.flameBreath, skills.inferno] }),
    createCharacter({ id: 'enemy-ghost', name: '👻 ゴースト', side: 'enemy', role: '回復役', maxHp: 105, atk: 20, def: 10, spd: 20, skills: [skills.spiritTouch, skills.soulMend, skills.phantomPrayer] }),
    createCharacter({ id: 'enemy-mushroom', name: '🍄 マッシュ', side: 'enemy', role: '妨害役', maxHp: 118, atk: 21, def: 12, spd: 15, skills: [skills.capHit, skills.sporeSleep, skills.toxicField] })
  ];

  state.turnOrder = [];
  state.turnIndex = 0;
  state.round = 1;
  state.currentActorId = null;
  state.pendingSkill = null;
  state.phase = 'idle';
  state.gameOver = false;
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
    if (unit.cooldowns[skill.id] > 0) {
      unit.cooldowns[skill.id] -= 1;
    }
  });
}

function processTurnStart(unit) {
  decrementCooldowns(unit);

  const regen = getStatus(unit, STATUS.REGEN);
  if (regen && unit.alive) {
    const amount = Math.max(4, Math.floor(unit.maxHp * regen.potency));
    const healed = healUnit(unit, amount);
    if (healed > 0) {
      appendLog(`${unit.name} は継続回復で ${healed} 回復。`, 'heal');
    }
  }

  const stun = getStatus(unit, STATUS.STUN);
  if (stun) {
    appendLog(`${unit.name} は気絶して行動できない。`, 'system');
    consumeStatuses(unit);
    render();
    setTimeout(() => {
      advanceToNextTurn();
    }, 550);
    return false;
  }

  return true;
}

function consumeStatuses(unit) {
  unit.statuses = unit.statuses
    .map((s) => ({ ...s, turns: s.turns - 1 }))
    .filter((s) => s.turns > 0);
}

function healUnit(target, amount) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

function calculateDamage(attacker, target, ratio) {
  const atkUp = getStatus(attacker, STATUS.ATTACK_UP);
  const defDown = getStatus(target, STATUS.DEF_DOWN);
  const atkBuff = 1 + (atkUp?.potency || 0);
  const defDebuff = 1 + (defDown?.potency || 0);
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
}

function pickTargets(actor, skill, preferredTargetId = null) {
  const allies = livingUnits(actor.side);
  const enemies = livingUnits(actor.side === 'ally' ? 'enemy' : 'ally');

  switch (skill.targetType) {
    case TARGET.ENEMY_SINGLE:
      if (preferredTargetId) {
        const preferred = getUnitById(preferredTargetId);
        if (preferred?.alive && preferred.side !== actor.side) return [preferred];
      }
      return [enemies[Math.floor(Math.random() * enemies.length)]];
    case TARGET.ENEMY_ALL:
      return enemies;
    case TARGET.ALLY_SINGLE:
      if (preferredTargetId) {
        const preferred = getUnitById(preferredTargetId);
        if (preferred?.alive && preferred.side === actor.side) return [preferred];
      }
      return [allies[Math.floor(Math.random() * allies.length)]];
    case TARGET.ALLY_ALL:
      return allies;
    case TARGET.SELF:
      return [actor];
    default:
      return [];
  }
}

function lowestHpRateUnit(units) {
  return units.reduce((lowest, unit) => (unit.hp / unit.maxHp) < (lowest.hp / lowest.maxHp) ? unit : lowest, units[0]);
}

function executeSkill(actor, skill, targetId = null) {
  if (!actor.alive) return;

  const targets = pickTargets(actor, skill, targetId);
  if (!targets.length) return;

  appendLog(`${actor.name} の ${skill.name}！`, 'system');

  skill.effects.forEach((effect) => {
    if (effect.type === 'damage') {
      targets.forEach((target) => target.alive && damageUnit(actor, target, effect.ratio, skill.name));
    }

    if (effect.type === 'heal') {
      targets.forEach((target) => {
        const amount = Math.max(6, Math.floor(target.maxHp * effect.ratio));
        const healed = healUnit(target, amount);
        appendLog(`${skill.name}: ${target.name} が ${healed} 回復。`, 'heal');
      });
    }

    if (effect.type === 'heal_lowest_ally') {
      const allies = livingUnits(actor.side);
      if (allies.length) {
        const target = lowestHpRateUnit(allies);
        const amount = Math.max(5, Math.floor(target.maxHp * effect.ratio));
        const healed = healUnit(target, amount);
        appendLog(`${skill.name}: ${target.name} が ${healed} 回復。`, 'heal');
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

  if (skill.cooldown > 0) {
    actor.cooldowns[skill.id] = skill.cooldown;
  }

  consumeStatuses(actor);
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
  const allies = livingUnits('enemy');
  const opponents = livingUnits('ally');

  const canUseBig = available.find((s) => s.cooldown >= 5);
  if (canUseBig && Math.random() < 0.65) {
    return { skill: canUseBig, targetId: null };
  }

  const healerSkill = available.find((s) => s.effects.some((e) => e.type === 'heal' || e.type === 'heal_lowest_ally'));
  const hurtAlly = allies.find((u) => u.hp / u.maxHp < 0.55);
  if (healerSkill && hurtAlly) {
    return { skill: healerSkill, targetId: hurtAlly.id };
  }

  const weightedTargets = [];
  opponents.forEach((unit) => {
    const weight = unit.hp / unit.maxHp < 0.4 ? 3 : unit.hp / unit.maxHp < 0.7 ? 2 : 1;
    for (let i = 0; i < weight; i += 1) weightedTargets.push(unit);
  });
  const target = weightedTargets[Math.floor(Math.random() * weightedTargets.length)] || opponents[0];

  const candidates = [...available].sort((a, b) => b.cooldown - a.cooldown);
  return { skill: candidates[0] || enemy.skills[0], targetId: target?.id || null };
}

function canUseSkill(actor, skill) {
  return actor.cooldowns[skill.id] === 0;
}

function checkGameOver() {
  const allyAlive = livingUnits('ally').length > 0;
  const enemyAlive = livingUnits('enemy').length > 0;
  if (!allyAlive || !enemyAlive) {
    state.gameOver = true;
    state.phase = 'ended';
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
    state.round += 1;
    recalculateTurnOrder();
    state.turnIndex = 0;
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

  turnInfoEl.textContent = `Round ${state.round} / 行動: ${actor.name}`;

  const canAct = processTurnStart(actor);
  if (!canAct) return;

  if (actor.side === 'ally') {
    state.phase = 'await_player_skill';
    statusEl.textContent = `${actor.name} の行動。スキルを選択してください。`;
    targetHintEl.textContent = 'スキルを選ぶと対象が選択できます。';
    render();
  } else {
    state.phase = 'enemy_acting';
    statusEl.textContent = `${actor.name} が行動中...`;
    render();
    setTimeout(() => {
      const action = chooseEnemyAction(actor);
      executeSkill(actor, action.skill, action.targetId);
      if (!checkGameOver()) {
        render();
        setTimeout(() => {
          advanceToNextTurn();
        }, 550);
      }
      render();
    }, 500);
  }
}

function onSkillClick(skill) {
  const actor = getUnitById(state.currentActorId);
  if (!actor || state.phase !== 'await_player_skill') return;
  if (!canUseSkill(actor, skill)) return;

  state.pendingSkill = skill;
  const targetNeeded = skill.targetType === TARGET.ENEMY_SINGLE || skill.targetType === TARGET.ALLY_SINGLE;
  if (!targetNeeded) {
    executeSkill(actor, skill, null);
    if (!checkGameOver()) advanceToNextTurn();
    render();
    return;
  }

  state.phase = 'await_player_target';
  statusEl.textContent = `${skill.name} の対象を選んでください。`;
  targetHintEl.textContent = skill.targetType === TARGET.ENEMY_SINGLE
    ? '右側の敵をタップ'
    : '左側の味方をタップ';
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

  executeSkill(actor, skill, target.id);
  if (!checkGameOver()) advanceToNextTurn();
  render();
}

function renderUnitList(container, units) {
  container.innerHTML = '';
  const actorId = state.currentActorId;

  units.forEach((unit) => {
    const hpRate = Math.max(0, (unit.hp / unit.maxHp) * 100);
    const isActive = actorId === unit.id;
    const canTargetEnemy = state.phase === 'await_player_target' && state.pendingSkill?.targetType === TARGET.ENEMY_SINGLE && unit.side === 'enemy' && unit.alive;
    const canTargetAlly = state.phase === 'await_player_target' && state.pendingSkill?.targetType === TARGET.ALLY_SINGLE && unit.side === 'ally' && unit.alive;

    const card = document.createElement('div');
    card.className = `unit ${unit.alive ? '' : 'dead'} ${isActive ? 'active' : ''} ${(canTargetEnemy || canTargetAlly) ? 'selectable' : ''}`.trim();

    const badges = unit.statuses.map((s) => `<span class="badge">${statusLabel(s.type)}:${s.turns}</span>`).join('');

    card.innerHTML = `
      <div class="unit-header">
        <strong>${unit.name}</strong>
        <small>${unit.role}</small>
      </div>
      <div>HP ${unit.hp}/${unit.maxHp}</div>
      <div class="hp-bar"><span class="hp-fill" style="width:${hpRate}%"></span></div>
      <div class="badges">${badges || '<span class="badge">-</span>'}</div>
    `;

    if (canTargetEnemy || canTargetAlly) {
      card.addEventListener('click', () => onUnitClick(unit.id));
    }

    container.appendChild(card);
  });
}

function renderSkillButtons() {
  skillButtonsEl.innerHTML = '';
  const actor = getUnitById(state.currentActorId);

  if (!actor || actor.side !== 'ally' || state.gameOver) {
    commandTitleEl.textContent = 'コマンド';
    targetHintEl.textContent = state.gameOver ? 'リスタートで再戦できます。' : '敵ターンです。';
    return;
  }

  commandTitleEl.textContent = `${actor.name} のスキル`;

  actor.skills.forEach((skill, index) => {
    const cd = actor.cooldowns[skill.id];
    const btn = document.createElement('button');
    btn.className = `skill ${state.pendingSkill?.id === skill.id ? 'selected' : ''}`.trim();
    btn.disabled = state.phase !== 'await_player_skill' || cd > 0;
    const cdText = cd > 0 ? `CT: ${cd}` : '使用可能';
    btn.innerHTML = `S${index + 1} ${skill.name}<small>${skill.desc} / ${cdText}</small>`;
    btn.addEventListener('click', () => onSkillClick(skill));
    skillButtonsEl.appendChild(btn);
  });
}

function render() {
  renderUnitList(allyAreaEl, state.allies);
  renderUnitList(enemyAreaEl, state.enemies);
  renderSkillButtons();
}

function appendLog(message, cls = '') {
  const line = document.createElement('div');
  line.className = `log-line ${cls}`.trim();
  line.textContent = message;
  logEl.prepend(line);
}

restartBtn.addEventListener('click', setupBattle);
setupBattle();
