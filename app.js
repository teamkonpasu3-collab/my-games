(function () {
  const DATA = window.GAME_DATA;
  const { BattleEngine, SaveStore, STATUS_LABELS, levelStats, learnedSkills } = window.RPG;
  const app = document.getElementById('app');
  let saveData = SaveStore.load();
  let screen = 'home';
  let battle = null;

  const elementNames = { slash: '斬', fire: '炎', ice: '氷', holy: '聖', lightning: '雷', none: '無' };
  const escapeHtml = (text) => String(text).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const percent = (value, max) => `${Math.max(0, Math.min(100, (value / max) * 100))}%`;

  function progressFor(character) { return saveData.characters[character.id] || { level: 1, exp: 0 }; }
  function isStageUnlocked(index) { return index === 0 || saveData.clearedStages.includes(DATA.stages[index - 1].id); }

  function render() {
    if (screen === 'home') renderHome();
    else if (screen === 'stages') renderStages();
    else renderBattle();
  }

  function renderHeader(title, kicker, backAction) {
    return `<header class="screen-header">
      ${backAction ? `<button class="icon-button" data-action="${backAction}" aria-label="戻る">‹</button>` : '<div class="brand-mark">B</div>'}
      <div class="header-copy"><span>${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1></div>
      <div class="gold-pill"><span>Ｇ</span>${saveData.gold}</div>
    </header>`;
  }

  function renderHome() {
    const cleared = saveData.clearedStages.length;
    app.innerHTML = `<main class="screen home-screen">
      ${renderHeader('BRAVE COMMAND', 'MOBILE TACTICAL RPG')}
      <section class="hero-panel">
        <div class="hero-sun"></div><div class="hero-hills"></div>
        <div class="hero-copy"><p>CHAPTER 1</p><h2>草原戦線</h2><span>小さな部隊の、大きな反撃。</span></div>
        <div class="hero-party" aria-hidden="true"><span>⚔️</span><span>🧙</span><span>🛡️</span><span>🏰</span></div>
      </section>
      <section class="home-card progress-card">
        <div><span class="eyebrow">MISSION PROGRESS</span><h3>進行度 ${cleared} / ${DATA.stages.length}</h3></div>
        <div class="chapter-progress"><i style="width:${cleared / DATA.stages.length * 100}%"></i></div>
        <p>${cleared === DATA.stages.length ? '全ステージ制覇！ 何度でも再挑戦できます。' : '次の戦場へ進み、草原の平和を取り戻そう。'}</p>
      </section>
      <button class="primary-cta" data-action="stages"><span>出撃する</span><small>ステージを選択</small><b>›</b></button>
      <section class="party-preview">
        <div class="section-title"><div><span class="eyebrow">YOUR SQUAD</span><h3>第七遊撃隊</h3></div><span>4 / 4</span></div>
        <div class="party-grid">${DATA.characters.map((character) => {
          const progress = progressFor(character); const stats = levelStats(character, progress.level);
          return `<article class="member-card"><div class="portrait ${character.id}">${character.icon}</div><div><b>${character.name}</b><small>Lv.${progress.level} · ${character.role}</small><div class="mini-hp"><i style="width:100%"></i></div><span>HP ${stats.maxHp}</span></div></article>`;
        }).join('')}</div>
      </section>
      <footer class="home-footer"><button data-action="reset-save">データを初期化</button><span>端末内に自動保存</span></footer>
    </main>`;
  }

  function renderStages() {
    app.innerHTML = `<main class="screen stage-screen">
      ${renderHeader('ステージ選択', 'CHAPTER 1 · 草原戦線', 'home')}
      <section class="stage-intro"><div><span class="eyebrow">AREA MAP</span><h2>進路を選択</h2></div><p>各ステージは3 Wave。<br>勝利して次の戦場を解放しよう。</p></section>
      <div class="stage-list">${DATA.stages.map((stage, index) => {
        const unlocked = isStageUnlocked(index); const cleared = saveData.clearedStages.includes(stage.id);
        const enemies = [...new Set(stage.waves.flat())].map((id) => DATA.enemies[id].icon).join('');
        return `<button class="stage-card ${unlocked ? '' : 'locked'} ${cleared ? 'cleared' : ''}" data-stage="${stage.id}" ${unlocked ? '' : 'disabled'}>
          <div class="stage-number"><span>${stage.number}</span>${cleared ? '<b>✓</b>' : unlocked ? '<b>!</b>' : '<b>🔒</b>'}</div>
          <div class="stage-info"><span>${cleared ? 'CLEARED' : unlocked ? 'NEW MISSION' : 'LOCKED'}</span><h3>${stage.name}</h3><p>${stage.subtitle}</p><div class="stage-meta"><em>WAVE 3</em><em>EXP ${stage.rewards.exp}</em><em>${stage.rewards.gold} G</em></div></div>
          <div class="enemy-icons">${enemies}</div>
        </button>`;
      }).join('')}</div>
      <div class="inventory-strip"><b>所持品</b>${Object.values(DATA.items).map((item) => `<span>${item.icon} ${item.name} ×${saveData.items[item.id] || 0}</span>`).join('')}</div>
    </main>`;
  }

  function unitCard(unit) {
    const isCurrent = unit.uid === battle.state.currentActorId;
    const selected = unit.uid === battle.state.selectedTargetId;
    const selectable = battle.validTarget(unit.uid);
    const animation = battle.state.animation || {};
    const classes = [unit.side === 'ally' ? 'ally-unit' : 'enemy-unit', isCurrent ? 'active' : '', selected ? 'selected' : '', selectable ? 'selectable' : '', unit.hp <= 0 ? 'dead' : '', animation.actorUid === unit.uid ? 'acting' : '', (animation.damaged || []).includes(unit.uid) ? 'damaged' : '', (animation.healed || []).includes(unit.uid) ? 'healed' : ''].filter(Boolean).join(' ');
    const statuses = Object.keys(unit.statuses).map((key) => `<span title="${key}">${STATUS_LABELS[key] || key}</span>`).join('');
    const popups = battle.state.popups.filter((popup) => popup.uid === unit.uid).map((popup) => `<i class="float-number ${popup.type}">${popup.type === 'weak' ? '<small>弱点！</small>' : ''}${popup.text}</i>`).join('');
    const weakness = unit.side === 'enemy' ? `<div class="weakness">弱点 ${(unit.weaknesses || []).map((key) => `<b>${elementNames[key]}</b>`).join(' ') || 'なし'}</div>` : '';
    const prediction = unit.side === 'enemy' && unit.id === 'dragon' && unit.hp > 0 ? `<div class="prediction">次：${DATA.skills[unit.nextAction]?.name || '攻撃'}</div>` : '';
    return `<button class="unit-card ${classes}" data-target="${unit.uid}" ${selectable ? '' : 'disabled'}>
      ${popups}<div class="unit-portrait">${unit.icon}<span>Lv.${unit.level || 1}</span></div>
      <div class="unit-body"><div class="unit-name"><b>${unit.name}</b>${isCurrent ? '<em>行動中</em>' : ''}</div>
        <div class="bar-row"><span>HP</span><div class="meter hp"><i style="width:${percent(unit.hp, unit.maxHp)}"></i></div><small>${unit.hp}/${unit.maxHp}</small></div>
        ${unit.side === 'ally' ? `<div class="bar-row"><span>MP</span><div class="meter mp"><i style="width:${percent(unit.mp, unit.maxMp)}"></i></div><small>${unit.mp}/${unit.maxMp}</small></div>` : ''}
        <div class="status-row">${statuses || '<span class="quiet">正常</span>'}</div>${weakness}${prediction}
      </div>
    </button>`;
  }

  function commandPanel() {
    const state = battle.state;
    const actor = battle.currentActor();
    if (state.result) return '';
    if (!actor || actor.side !== 'ally' || !['COMMAND_SELECT', 'SKILL_SELECT', 'ITEM_SELECT', 'TARGET_SELECT'].includes(state.phase)) {
      return `<div class="waiting-panel"><span class="spinner"></span><b>${state.phase === 'WAVE_CLEAR' ? '次のWaveへ…' : '敵の行動を待っています'}</b></div>`;
    }
    let body = '';
    if (state.phase === 'COMMAND_SELECT') {
      body = `<div class="command-grid">
        <button data-command="attack"><span>⚔</span><b>攻撃</b><small>ATTACK</small></button>
        <button data-command="skill"><span>✦</span><b>スキル</b><small>SKILL</small></button>
        <button data-command="defend"><span>⬟</span><b>防御</b><small>GUARD</small></button>
        <button data-command="item"><span>◆</span><b>道具</b><small>ITEM</small></button>
      </div>`;
    } else if (state.phase === 'SKILL_SELECT') {
      body = `<div class="list-command">${actor.skills.map((id) => {
        const skill = DATA.skills[id]; const disabled = actor.mp < skill.mpCost || (skill.once && actor.usedOnce.includes(id));
        return `<button data-skill="${id}" ${disabled ? 'disabled' : ''}><span class="skill-icon">${skill.type === 'heal' ? '✚' : skill.type === 'status' ? '⬆' : '✦'}</span><div><b>${skill.name}</b><small>${skill.description}</small></div><em>MP ${skill.mpCost}</em></button>`;
      }).join('')}</div>`;
    } else if (state.phase === 'ITEM_SELECT') {
      body = `<div class="list-command item-list">${Object.values(DATA.items).map((item) => `<button data-item="${item.id}" ${(saveData.items[item.id] || 0) <= 0 ? 'disabled' : ''}><span class="skill-icon">${item.icon}</span><div><b>${item.name}</b><small>${item.description}</small></div><em>×${saveData.items[item.id] || 0}</em></button>`).join('')}</div>`;
    } else {
      const action = state.selectedAction.kind === 'skill' ? DATA.skills[state.selectedAction.id] : DATA.items[state.selectedAction.id];
      body = `<div class="target-message"><span>◎</span><div><b>対象を選んでください</b><small>${action.name} · 光っている対象をタップ</small></div></div>`;
    }
    return `<section class="command-panel"><div class="command-head"><div><span>NOW ACTING</span><b>${actor.icon} ${actor.name}</b></div><p>${state.phase === 'COMMAND_SELECT' ? 'コマンドを選択' : state.phase === 'SKILL_SELECT' ? 'スキルを選択' : state.phase === 'ITEM_SELECT' ? '道具を選択' : '対象選択中'}</p>${state.phase !== 'COMMAND_SELECT' ? '<button data-action="cancel">× 戻る</button>' : ''}</div>${body}</section>`;
  }

  function resultModal() {
    const state = battle.state;
    if (!state.result) return '';
    if (state.result === 'victory') {
      return `<div class="modal-backdrop"><section class="result-modal victory-modal"><div class="result-emblem">★</div><span>STAGE CLEAR</span><h2>作戦成功！</h2><p>${battle.stage.name}を突破しました</p>
        <div class="reward-box"><div><small>獲得EXP</small><b>+${state.reward.exp}</b></div><div><small>獲得ゴールド</small><b>+${state.reward.gold} G</b></div></div>
        ${state.reward.levelUps.length ? `<div class="level-up"><b>LEVEL UP!</b>${state.reward.levelUps.join(' / ')}</div>` : ''}
        <button class="result-primary" data-action="stages">ステージ選択へ</button><button class="result-secondary" data-action="retry">もう一度挑戦</button>
      </section></div>`;
    }
    return `<div class="modal-backdrop"><section class="result-modal defeat-modal"><div class="result-emblem">×</div><span>MISSION FAILED</span><h2>部隊壊滅</h2><p>編成とコマンドを見直して再挑戦しよう</p><button class="result-primary" data-action="retry">再挑戦</button><button class="result-secondary" data-action="stages">ステージ選択へ</button></section></div>`;
  }

  function renderBattle() {
    const state = battle.state;
    const current = battle.currentActor();
    app.innerHTML = `<main class="battle-screen">
      <header class="battle-header"><div><span>${battle.stage.number}</span><h1>${battle.stage.name}</h1></div><div class="wave-label"><small>WAVE</small><b>${state.wave}<i>/</i>${battle.stage.waves.length}</b></div><button data-action="quit" aria-label="撤退">☰</button></header>
      <section class="battle-arena">
        <div class="sky"><i></i><i></i></div><div class="ground-lines"></div>
        <div class="turn-banner">${current ? `<span>${current.icon}</span><b>${current.name}</b><small>${current.side === 'ally' ? 'のターン' : 'が行動中'}</small>` : '戦闘開始'}</div>
        <div class="formation ally-formation"><h2><span>ALLY</span>味方部隊</h2>${state.allies.map(unitCard).join('')}</div>
        <div class="versus-mark">TURN <b>${state.turnCount}</b></div>
        <div class="formation enemy-formation"><h2><span>ENEMY</span>敵部隊</h2>${state.enemies.map(unitCard).join('')}</div>
      </section>
      <section class="battle-bottom">
        <div class="battle-log"><div class="log-title"><span>戦況ログ</span><i></i></div><div class="log-lines">${state.logs.slice(-4).reverse().map((entry, index) => `<p class="${entry.type} ${index === 0 ? 'latest' : ''}">${escapeHtml(entry.text)}</p>`).join('')}</div></div>
        ${commandPanel()}
      </section>${resultModal()}
    </main>`;
  }

  function startBattle(stageId) {
    screen = 'battle';
    battle = new BattleEngine(stageId, saveData, () => {});
    battle.onChange = render;
    render();
  }

  app.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === 'home') { screen = 'home'; battle = null; render(); }
      if (action === 'stages') { screen = 'stages'; battle = null; render(); }
      if (action === 'cancel') battle.cancelSelection();
      if (action === 'retry') startBattle(battle.stage.id);
      if (action === 'quit' && window.confirm('戦闘を中断してステージ選択へ戻りますか？')) { screen = 'stages'; battle = null; render(); }
      if (action === 'reset-save' && window.confirm('セーブデータを初期化しますか？')) { saveData = SaveStore.reset(); render(); }
      return;
    }
    const stageButton = event.target.closest('[data-stage]');
    if (stageButton && !stageButton.disabled) return startBattle(stageButton.dataset.stage);
    const command = event.target.closest('[data-command]');
    if (command) return battle.selectCommand(command.dataset.command);
    const skill = event.target.closest('[data-skill]');
    if (skill && !skill.disabled) return battle.selectAction({ kind: 'skill', id: skill.dataset.skill });
    const item = event.target.closest('[data-item]');
    if (item && !item.disabled) return battle.selectAction({ kind: 'item', id: item.dataset.item });
    const target = event.target.closest('[data-target]');
    if (target && !target.disabled) battle.chooseTarget(target.dataset.target);
  });

  render();
}());
