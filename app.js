const setupSection = document.getElementById('setup');
const battleSection = document.getElementById('battle');
const skillListEl = document.getElementById('skillList');
const startBtn = document.getElementById('startBtn');
const commandSkillsEl = document.getElementById('commandSkills');
const targetAreaEl = document.getElementById('targetArea');
const allyAreaEl = document.getElementById('allyArea');
const enemyAreaEl = document.getElementById('enemyArea');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const restartBtn = document.getElementById('restartBtn');

const skillPool = [
  { id: 'slash', name: 'ブレード', power: 24, type: 'attack', desc: '単体に中ダメージ' },
  { id: 'fire', name: 'ファイア', power: 18, type: 'attack_all', desc: '敵全体に小ダメージ' },
  { id: 'guardBreak', name: 'ガードブレイク', power: 30, type: 'attack', desc: '単体に大ダメージ' },
  { id: 'heal', name: 'ヒール', power: 25, type: 'heal', desc: '味方単体を回復' },
  { id: 'quick', name: 'クイック', power: 16, type: 'attack', bonusSpeed: 12, desc: '先制しやすい攻撃' },
  { id: 'spark', name: 'スパーク', power: 22, type: 'attack', desc: '単体に魔法ダメージ' }
];

let selectedSkills = [];
let selectedAction = null;
let state = null;

function makeUnit(name, side, idx) {
  return {
    id: `${side}-${idx}`,
    name,
    side,
    hp: 100,
    maxHp: 100,
    speed: 10 + Math.floor(Math.random() * 10),
    alive: true
  };
}

function initSetup() {
  skillListEl.innerHTML = '';
  selectedSkills = [];
  startBtn.disabled = true;

  skillPool.forEach((skill) => {
    const btn = document.createElement('button');
    btn.className = 'skill';
    btn.innerHTML = `${skill.name}<small>${skill.desc}</small>`;
    btn.addEventListener('click', () => toggleSkill(skill.id, btn));
    skillListEl.appendChild(btn);
  });
}

function toggleSkill(skillId, btn) {
  const idx = selectedSkills.indexOf(skillId);
  if (idx >= 0) {
    selectedSkills.splice(idx, 1);
    btn.classList.remove('selected');
  } else if (selectedSkills.length < 3) {
    selectedSkills.push(skillId);
    btn.classList.add('selected');
  }
  startBtn.disabled = selectedSkills.length !== 3;
}

function startGame() {
  const allies = ['アッシュ', 'ミオ', 'レオ', 'ユナ'].map((n, i) => makeUnit(n, 'ally', i));
  const enemies = ['ゴブA', 'ゴブB', 'スライム', 'ウルフ'].map((n, i) => makeUnit(n, 'enemy', i));
  state = {
    allies,
    enemies,
    turn: 1,
    over: false,
    playerSkills: selectedSkills.map((id) => skillPool.find((s) => s.id === id))
  };

  setupSection.classList.add('hidden');
  battleSection.classList.remove('hidden');
  restartBtn.classList.add('hidden');
  logEl.innerHTML = '';

  render();
  appendLog('バトル開始！味方リーダーのコマンドを選択してください。');
}

function render() {
  renderUnits(allyAreaEl, state.allies);
  renderUnits(enemyAreaEl, state.enemies);
  renderCommandSkills();
  renderTargets();
}

function renderUnits(container, units) {
  container.innerHTML = '';
  units.forEach((u) => {
    const card = document.createElement('div');
    card.className = 'unit';
    const hpRate = Math.max(0, (u.hp / u.maxHp) * 100);
    card.innerHTML = `
      <strong>${u.name}${u.alive ? '' : ' (戦闘不能)'}</strong>
      <div>HP: ${Math.max(0, u.hp)} / ${u.maxHp}</div>
      <div class="hp-bar"><span style="width:${hpRate}%"></span></div>
    `;
    container.appendChild(card);
  });
}

function renderCommandSkills() {
  commandSkillsEl.innerHTML = '';
  state.playerSkills.forEach((skill) => {
    const btn = document.createElement('button');
    btn.className = 'skill';
    if (selectedAction?.id === skill.id) btn.classList.add('selected');
    btn.innerHTML = `${skill.name}<small>${skill.desc}</small>`;
    btn.disabled = state.over;
    btn.addEventListener('click', () => {
      selectedAction = skill;
      renderCommandSkills();
      renderTargets();
      statusEl.textContent = `${skill.name} の対象を選んでください。`;
    });
    commandSkillsEl.appendChild(btn);
  });
}

function renderTargets() {
  targetAreaEl.innerHTML = '';
  if (!selectedAction || state.over) {
    targetAreaEl.textContent = 'スキルを選んでください。';
    return;
  }

  const targetList = selectedAction.type === 'heal'
    ? state.allies.filter((u) => u.alive)
    : state.enemies.filter((u) => u.alive);

  if (selectedAction.type === 'attack_all') {
    const allBtn = document.createElement('button');
    allBtn.textContent = '敵全体を対象';
    allBtn.addEventListener('click', () => executeTurn(selectedAction, null));
    targetAreaEl.appendChild(allBtn);
    return;
  }

  targetList.forEach((unit) => {
    const btn = document.createElement('button');
    btn.textContent = unit.name;
    btn.addEventListener('click', () => executeTurn(selectedAction, unit.id));
    targetAreaEl.appendChild(btn);
  });
}

function executeTurn(skill, targetId) {
  if (state.over) return;

  const leader = state.allies.find((u) => u.alive);
  if (!leader) return;

  const enemyActor = randomAlive(state.enemies);
  const enemySkill = [skillPool[0], skillPool[2], skillPool[5]][Math.floor(Math.random() * 3)];

  const order = [
    { actor: leader, skill, targetId, isPlayer: true },
    { actor: enemyActor, skill: enemySkill, targetId: randomAlive(state.allies)?.id, isPlayer: false }
  ].sort((a, b) => (b.actor.speed + (b.skill.bonusSpeed || 0)) - (a.actor.speed + (a.skill.bonusSpeed || 0)));

  order.forEach((action) => {
    if (state.over || !action.actor?.alive) return;
    applySkill(action.actor, action.skill, action.targetId, action.isPlayer);
    checkGameOver();
  });

  selectedAction = null;
  state.turn += 1;
  render();
}

function applySkill(actor, skill, targetId, isPlayer) {
  if (skill.type === 'attack_all') {
    const targets = (isPlayer ? state.enemies : state.allies).filter((u) => u.alive);
    targets.forEach((t) => dealDamage(actor, t, skill.power));
    appendLog(`${actor.name} の ${skill.name}！ 敵全体に ${skill.power} ダメージ。`, 'damage');
    return;
  }

  const targetGroup = skill.type === 'heal'
    ? (isPlayer ? state.allies : state.enemies)
    : (isPlayer ? state.enemies : state.allies);

  const target = targetGroup.find((u) => u.id === targetId && u.alive) || randomAlive(targetGroup);
  if (!target) return;

  if (skill.type === 'heal') {
    const heal = Math.min(skill.power, target.maxHp - target.hp);
    target.hp += heal;
    appendLog(`${actor.name} の ${skill.name}！ ${target.name} が ${heal} 回復。`, 'heal');
  } else {
    dealDamage(actor, target, skill.power);
    appendLog(`${actor.name} の ${skill.name}！ ${target.name} に ${skill.power} ダメージ。`, 'damage');
  }
}

function dealDamage(actor, target, amount) {
  const variance = Math.floor(Math.random() * 7) - 3;
  const finalDamage = Math.max(1, amount + variance);
  target.hp -= finalDamage;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    appendLog(`${target.name} は倒れた！`);
  }
}

function randomAlive(units) {
  const alive = units.filter((u) => u.alive);
  if (!alive.length) return null;
  return alive[Math.floor(Math.random() * alive.length)];
}

function checkGameOver() {
  const allyAlive = state.allies.some((u) => u.alive);
  const enemyAlive = state.enemies.some((u) => u.alive);

  if (!allyAlive || !enemyAlive) {
    state.over = true;
    restartBtn.classList.remove('hidden');
    statusEl.textContent = allyAlive ? '勝利！' : '敗北…';
    appendLog(allyAlive ? '敵チームを全滅させた！' : '味方チームが全滅した…。');
  } else {
    statusEl.textContent = `ターン ${state.turn}: 次の行動を選んでください。`;
  }
}

function appendLog(message, cls = '') {
  const line = document.createElement('div');
  line.className = `log-line ${cls}`.trim();
  line.textContent = message;
  logEl.prepend(line);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
  battleSection.classList.add('hidden');
  setupSection.classList.remove('hidden');
  initSetup();
});

initSetup();
