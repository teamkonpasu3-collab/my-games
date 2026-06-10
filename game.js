(function () {
  const DATA = window.GAME_DATA;
  const SAVE_KEY = 'command-rpg-save-v1';
  const STATUS_LABELS = { poison: '☠毒', attack_down: '▼攻', defense_down: '▼防', attack_up: '▲攻', defense_up: '▲防', taunt: '📣挑発', cover: '🛡かばう', iron_wall: '🧱鉄壁', charged: '🔥力溜め', defend: '🛡防御' };

  function baseSave() {
    const characters = {};
    DATA.characters.forEach((character) => { characters[character.id] = { level: 1, exp: 0 }; });
    return { clearedStages: [], gold: 0, items: { potion: 4, high_potion: 1, mana_potion: 2, antidote: 1, revive: 1 }, characters };
  }

  const SaveStore = {
    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
        const initial = baseSave();
        if (!saved) return initial;
        return {
          ...initial,
          ...saved,
          items: { ...initial.items, ...(saved.items || {}) },
          characters: { ...initial.characters, ...(saved.characters || {}) }
        };
      } catch (_) { return baseSave(); }
    },
    save(data) { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); },
    reset() { localStorage.removeItem(SAVE_KEY); return baseSave(); }
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const randomInt = (max) => Math.floor(Math.random() * max);
  const alive = (units) => units.filter((unit) => unit.hp > 0);

  function levelStats(base, level) {
    const n = level - 1;
    return {
      maxHp: base.maxHp + n * 8,
      maxMp: base.maxMp + n * 2,
      attack: base.attack + n * 2,
      magic: base.magic + n * 2,
      defense: base.defense + n * 2,
      spirit: base.spirit + n * 2,
      speed: base.speed + Math.floor(n / 2)
    };
  }

  function learnedSkills(base, level) {
    const result = [...base.skills];
    Object.entries(base.learn || {}).forEach(([required, skillId]) => {
      if (level >= Number(required)) result.push(skillId);
    });
    return result;
  }

  function makeUnit(base, side, index, progression) {
    const level = progression?.level || 1;
    const stats = side === 'ally' ? levelStats(base, level) : base;
    return {
      ...clone(base), ...stats, uid: `${side}-${base.id}-${index}`, side, level,
      hp: stats.maxHp, mp: stats.maxMp || 0, statuses: {}, defending: false,
      usedOnce: [], delayed: 0, nextAction: null, defeated: false,
      skills: side === 'ally' ? learnedSkills(base, level) : undefined
    };
  }

  class BattleEngine {
    constructor(stageId, saveData, onChange) {
      this.stage = DATA.stages.find((stage) => stage.id === stageId) || DATA.stages[0];
      this.saveData = saveData;
      this.onChange = onChange || function () {};
      this.state = {
        phase: 'BATTLE_START', wave: 0, allies: [], enemies: [], queue: [], currentActorId: null,
        selectedCommand: null, selectedAction: null, selectedTargetId: null, logs: [], result: null,
        popups: [], animation: null, turnCount: 0, rewarded: false
      };
      this.state.allies = DATA.characters.map((base, index) => makeUnit(base, 'ally', index, saveData.characters[base.id]));
      this.log(`${this.stage.name}へ出撃！`, 'system');
      this.startWave();
    }

    emit() { this.onChange(this.state); }
    log(text, type = '') {
      this.state.logs.push({ id: Date.now() + Math.random(), text, type });
      if (this.state.logs.length > 60) this.state.logs.shift();
    }
    unit(uid) { return [...this.state.allies, ...this.state.enemies].find((unit) => unit.uid === uid); }
    currentActor() { return this.unit(this.state.currentActorId); }

    startWave() {
      this.state.phase = 'WAVE_START';
      this.state.wave += 1;
      const enemyIds = this.stage.waves[this.state.wave - 1];
      this.state.enemies = enemyIds.map((id, index) => makeUnit(DATA.enemies[id], 'enemy', index));
      this.state.enemies.forEach((enemy) => { enemy.nextAction = this.chooseEnemySkill(enemy); });
      this.state.queue = [];
      this.log(`Wave ${this.state.wave} / ${this.stage.waves.length}`, 'wave');
      this.buildRound();
    }

    buildRound() {
      this.state.turnCount += 1;
      [...alive(this.state.allies), ...alive(this.state.enemies)].forEach((unit) => { unit.defending = false; delete unit.statuses.defend; });
      this.state.queue = [...alive(this.state.allies), ...alive(this.state.enemies)]
        .map((unit) => ({ uid: unit.uid, value: unit.speed + randomInt(6) - (unit.delayed || 0) }))
        .sort((a, b) => b.value - a.value).map((entry) => entry.uid);
      [...this.state.allies, ...this.state.enemies].forEach((unit) => { unit.delayed = 0; });
      this.nextTurn();
    }

    nextTurn() {
      if (this.checkEnd()) return;
      if (!this.state.queue.length) return this.buildRound();
      const actor = this.unit(this.state.queue.shift());
      if (!actor || actor.hp <= 0) return this.nextTurn();
      this.state.currentActorId = actor.uid;
      this.state.selectedCommand = null;
      this.state.selectedAction = null;
      this.state.selectedTargetId = null;
      this.state.phase = 'TURN_START';
      this.applyPoison(actor);
      if (actor.hp <= 0) return this.finishTurn(actor);
      if (actor.side === 'ally') {
        this.state.phase = 'COMMAND_SELECT';
        this.log(`${actor.name}の行動`, 'turn');
        this.emit();
      } else {
        this.state.phase = 'ENEMY_ACTION';
        this.emit();
        window.setTimeout(() => this.enemyAct(actor), 520);
      }
    }

    applyPoison(unit) {
      if (!unit.statuses.poison) return;
      const amount = Math.max(1, Math.floor(unit.maxHp * 0.05));
      unit.hp = Math.max(0, unit.hp - amount);
      this.popup(unit.uid, `-${amount}`, 'damage');
      this.log(`${unit.name}は毒で${amount}ダメージ。`, 'damage');
    }

    selectCommand(command) {
      if (this.state.phase !== 'COMMAND_SELECT') return;
      this.state.selectedCommand = command;
      if (command === 'attack') this.selectAction({ kind: 'skill', id: 'attack' });
      else if (command === 'defend') this.executeDefend();
      else {
        this.state.phase = command === 'skill' ? 'SKILL_SELECT' : 'ITEM_SELECT';
        this.emit();
      }
    }

    selectAction(action) {
      const actor = this.currentActor();
      if (!actor || actor.side !== 'ally') return;
      const definition = action.kind === 'skill' ? DATA.skills[action.id] : DATA.items[action.id];
      if (!definition) return;
      if (action.kind === 'skill') {
        if ((definition.mpCost || 0) > actor.mp) return this.log('MPが足りません。', 'warning'), this.emit();
        if (definition.once && actor.usedOnce.includes(definition.id)) return this.log('この戦闘では使用済みです。', 'warning'), this.emit();
      } else if ((this.saveData.items[action.id] || 0) <= 0) return;
      this.state.selectedAction = action;
      const targetType = definition.target;
      if (targetType === 'self') return this.executeAction(actor.uid);
      if (targetType === 'all_enemies' || targetType === 'all_allies') return this.executeAction(null);
      this.state.phase = 'TARGET_SELECT';
      this.emit();
    }

    validTarget(uid) {
      if (this.state.phase !== 'TARGET_SELECT' || !this.state.selectedAction) return false;
      const target = this.unit(uid);
      if (!target) return false;
      const action = this.state.selectedAction;
      const def = action.kind === 'skill' ? DATA.skills[action.id] : DATA.items[action.id];
      if (def.target === 'single_enemy') return target.side === 'enemy' && target.hp > 0;
      if (def.target === 'single_ally') return target.side === 'ally' && target.hp > 0;
      if (def.target === 'dead_ally') return target.side === 'ally' && target.hp <= 0;
      return false;
    }

    chooseTarget(uid) {
      if (!this.validTarget(uid)) return;
      this.state.selectedTargetId = uid;
      this.executeAction(uid);
    }

    cancelSelection() {
      if (this.state.phase === 'TARGET_SELECT') {
        this.state.phase = this.state.selectedAction?.kind === 'item' ? 'ITEM_SELECT' : (this.state.selectedAction?.id === 'attack' ? 'COMMAND_SELECT' : 'SKILL_SELECT');
        this.state.selectedAction = null;
      } else if (['SKILL_SELECT', 'ITEM_SELECT'].includes(this.state.phase)) {
        this.state.phase = 'COMMAND_SELECT';
      }
      this.state.selectedTargetId = null;
      this.emit();
    }

    executeDefend() {
      const actor = this.currentActor();
      actor.defending = true;
      actor.statuses.defend = { turns: 1, fresh: true };
      this.log(`${actor.name}は身を守っている。`, 'buff');
      this.animate(actor.uid, [], []);
      this.finishTurn(actor);
    }

    executeAction(targetUid) {
      const actor = this.currentActor();
      const action = this.state.selectedAction;
      if (!actor || !action) return;
      this.state.phase = 'ACTION_EXECUTE';
      if (action.kind === 'item') this.useItem(actor, DATA.items[action.id], targetUid);
      else this.useSkill(actor, DATA.skills[action.id], targetUid);
      this.finishTurn(actor);
    }

    useItem(actor, item, targetUid) {
      const target = this.unit(targetUid);
      this.saveData.items[item.id] -= 1;
      if (item.effect === 'heal') this.heal(target, item.amount);
      if (item.effect === 'mp') {
        const gained = Math.min(item.amount, target.maxMp - target.mp); target.mp += gained;
        this.popup(target.uid, `MP+${gained}`, 'heal'); this.log(`${target.name}のMPが${gained}回復。`, 'heal');
      }
      if (item.effect === 'antidote') { delete target.statuses.poison; this.log(`${target.name}の毒が消えた。`, 'heal'); }
      if (item.effect === 'revive') {
        target.hp = Math.max(1, Math.floor(target.maxHp * item.amount)); target.defeated = false;
        this.popup(target.uid, `+${target.hp}`, 'heal'); this.log(`${target.name}が復活！`, 'heal');
      }
      SaveStore.save(this.saveData);
      this.log(`${actor.name}は${item.name}を使った。`, 'item');
      this.animate(actor.uid, [], target ? [target.uid] : []);
    }

    useSkill(actor, skill, targetUid) {
      actor.mp = Math.max(0, actor.mp - (skill.mpCost || 0));
      if (skill.once) actor.usedOnce.push(skill.id);
      const targets = this.targetsFor(actor, skill, targetUid);
      this.log(`${actor.name}の「${skill.name}」！`, actor.side === 'enemy' ? 'enemy' : 'action');
      const damaged = [], healed = [];
      if (['physical', 'magic'].includes(skill.type)) {
        const hits = skill.hits || 1;
        targets.forEach((originalTarget) => {
          for (let hit = 0; hit < hits; hit += 1) {
            if (originalTarget.hp <= 0) break;
            const target = actor.side === 'enemy' ? this.coverTarget(originalTarget) : originalTarget;
            this.damage(actor, target, skill); damaged.push(target.uid);
          }
        });
      } else if (skill.type === 'heal') {
        targets.forEach((target) => { this.heal(target, Math.floor(this.effective(actor, 'magic') * skill.power)); healed.push(target.uid); });
      } else if (skill.type === 'restore_mp') {
        const target = targets[0]; const gain = Math.min(skill.amount, target.maxMp - target.mp); target.mp += gain;
        this.popup(target.uid, `MP+${gain}`, 'heal'); this.log(`${target.name}のMPが${gain}回復。`, 'heal'); healed.push(target.uid);
      } else if (skill.type === 'status') {
        if (skill.status === 'cover') {
          actor.statuses.cover = { turns: skill.duration, targetUid: targets[0].uid, fresh: true };
        } else {
          targets.forEach((target) => { target.statuses[skill.status] = { turns: skill.duration, source: actor.uid, fresh: true }; });
        }
        this.log(`${targets.map((target) => target.name).join('・')}に${STATUS_LABELS[skill.status]}！`, 'buff');
      }
      if (skill.selfStatus) actor.statuses[skill.selfStatus] = { turns: skill.duration, source: actor.uid, fresh: true };
      if (skill.delay) targets.forEach((target) => { target.delayed += skill.delay; });
      this.animate(actor.uid, damaged, healed);
    }

    targetsFor(actor, skill, targetUid) {
      const opponents = actor.side === 'ally' ? this.state.enemies : this.state.allies;
      const friends = actor.side === 'ally' ? this.state.allies : this.state.enemies;
      if (skill.target === 'single_enemy') return [this.unit(targetUid) || this.enemyTarget(actor)];
      if (skill.target === 'all_enemies') return alive(opponents);
      if (skill.target === 'single_ally') return [this.unit(targetUid) || alive(friends)[0]];
      if (skill.target === 'all_allies') return alive(friends);
      return [actor];
    }

    effective(unit, stat) {
      let value = unit[stat];
      if (['attack', 'magic'].includes(stat)) {
        if (unit.statuses.attack_up) value *= 1.2;
        if (unit.statuses.attack_down) value *= 0.8;
      }
      if (['defense', 'spirit'].includes(stat)) {
        if (unit.statuses.defense_up) value *= 1.2;
        if (unit.statuses.defense_down) value *= 0.8;
      }
      return value;
    }

    damage(actor, target, skill) {
      const offense = this.effective(actor, skill.type === 'magic' ? 'magic' : 'attack');
      const defense = this.effective(target, skill.type === 'magic' ? 'spirit' : 'defense');
      let amount = Math.max(1, Math.floor(offense * (skill.power || 1) - defense));
      let affinity = '';
      if ((target.weaknesses || []).includes(skill.element)) { amount = Math.floor(amount * 1.5); affinity = 'weak'; }
      if ((target.resistances || []).includes(skill.element)) { amount = Math.max(1, Math.floor(amount * 0.5)); affinity = 'resist'; }
      if (target.defending || target.statuses.defend) amount = Math.max(1, Math.floor(amount * 0.5));
      if (target.statuses.iron_wall) amount = Math.max(1, Math.floor(amount * 0.4));
      if (actor.statuses.charged) amount = Math.floor(amount * 1.65);
      amount = Math.max(1, Math.floor(amount * (0.92 + Math.random() * 0.17)));
      target.hp = Math.max(0, target.hp - amount);
      this.popup(target.uid, `-${amount}`, affinity === 'weak' ? 'weak' : 'damage');
      this.log(`${target.name}に${amount}ダメージ${affinity === 'weak' ? '（弱点！）' : affinity === 'resist' ? '（耐性）' : ''}。`, affinity === 'weak' ? 'weak' : 'damage');
      if (target.hp === 0) { target.defeated = true; this.log(`${target.name}を倒した！`, 'defeat'); }
    }

    heal(target, amount) {
      if (!target || target.hp <= 0) return;
      const gained = Math.max(0, Math.min(amount, target.maxHp - target.hp));
      target.hp += gained; this.popup(target.uid, `+${gained}`, 'heal'); this.log(`${target.name}のHPが${gained}回復。`, 'heal');
    }

    coverTarget(target) {
      const guardian = alive(this.state.allies).find((unit) => unit.statuses.cover?.targetUid === target.uid);
      if (guardian && guardian.uid !== target.uid) { this.log(`${guardian.name}が${target.name}をかばった！`, 'buff'); return guardian; }
      return target;
    }

    enemyTarget(enemy) {
      const candidates = alive(this.state.allies);
      const taunts = candidates.filter((unit) => unit.statuses.taunt);
      const pool = taunts.length ? [...taunts, ...taunts, ...taunts, ...candidates] : candidates;
      if (enemy.id === 'ghost' && Math.random() < 0.35) return [...candidates].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      return pool[randomInt(pool.length)];
    }

    chooseEnemySkill(enemy) {
      let choices = enemy.actions;
      if (enemy.id === 'dragon' && enemy.statuses.charged) choices = [{ skillId: 'dragon_breath', weight: 70 }, { skillId: 'enemy_attack', weight: 30 }];
      let roll = Math.random() * choices.reduce((sum, action) => sum + action.weight, 0);
      for (const action of choices) { roll -= action.weight; if (roll <= 0) return action.skillId; }
      return choices[0].skillId;
    }

    enemyAct(actor) {
      if (this.state.result || actor.hp <= 0) return this.nextTurn();
      const skillId = actor.nextAction || this.chooseEnemySkill(actor);
      const skill = DATA.skills[skillId];
      const target = skill.target === 'single_enemy' ? this.enemyTarget(actor) : actor;
      this.useSkill(actor, skill, target?.uid);
      actor.nextAction = this.chooseEnemySkill(actor);
      this.finishTurn(actor);
    }

    finishTurn(actor) {
      this.state.phase = 'TURN_END';
      if (actor.statuses.charged && actor.side === 'enemy' && !this.state.logs.at(-1)?.text.includes('力をためる')) delete actor.statuses.charged;
      Object.keys(actor.statuses).forEach((key) => {
        if (key === 'defend') return;
        if (actor.statuses[key].fresh) { delete actor.statuses[key].fresh; return; }
        actor.statuses[key].turns -= 1;
        if (actor.statuses[key].turns <= 0) delete actor.statuses[key];
      });
      this.emit();
      window.setTimeout(() => {
        if (this.checkEnd()) return;
        this.nextTurn();
      }, 520);
    }

    checkEnd() {
      if (!alive(this.state.allies).length) { this.state.result = 'defeat'; this.state.phase = 'DEFEAT'; this.log('部隊は力尽きた……。', 'defeat'); this.emit(); return true; }
      if (!alive(this.state.enemies).length) {
        if (this.state.wave < this.stage.waves.length) {
          this.state.phase = 'WAVE_CLEAR'; this.log('Wave突破！ 次の敵が迫る。', 'wave'); this.emit();
          window.setTimeout(() => this.startWave(), 850); return true;
        }
        this.victory(); return true;
      }
      return false;
    }

    victory() {
      if (this.state.rewarded) return;
      this.state.rewarded = true; this.state.result = 'victory'; this.state.phase = 'VICTORY';
      const levelUps = [];
      this.saveData.gold += this.stage.rewards.gold;
      if (!this.saveData.clearedStages.includes(this.stage.id)) this.saveData.clearedStages.push(this.stage.id);
      DATA.characters.forEach((base) => {
        const progress = this.saveData.characters[base.id];
        progress.exp += this.stage.rewards.exp;
        while (progress.exp >= progress.level * 50) {
          progress.exp -= progress.level * 50; progress.level += 1;
          levelUps.push(`${base.name} Lv.${progress.level}`);
        }
      });
      SaveStore.save(this.saveData);
      this.state.reward = { ...this.stage.rewards, levelUps };
      this.log(`勝利！ EXP ${this.stage.rewards.exp} / ${this.stage.rewards.gold}G 獲得。`, 'victory');
      this.emit();
    }

    popup(uid, text, type) {
      const popup = { id: Date.now() + Math.random(), uid, text, type };
      this.state.popups.push(popup);
      window.setTimeout(() => { this.state.popups = this.state.popups.filter((item) => item.id !== popup.id); this.emit(); }, 700);
    }

    animate(actorUid, damaged, healed) {
      this.state.animation = { actorUid, damaged, healed };
      this.emit();
      window.setTimeout(() => { this.state.animation = null; this.emit(); }, 360);
    }
  }

  window.RPG = { BattleEngine, SaveStore, STATUS_LABELS, levelStats, learnedSkills };
}());
