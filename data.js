(function () {
  const skills = {
    attack: { id: 'attack', name: '攻撃', type: 'physical', target: 'single_enemy', mpCost: 0, power: 1, element: 'slash', description: '敵1体を攻撃' },
    power_slash: { id: 'power_slash', name: '強斬り', type: 'physical', target: 'single_enemy', mpCost: 3, power: 1.6, element: 'slash', description: '敵1体に強力な斬撃' },
    double_slash: { id: 'double_slash', name: '二連斬り', type: 'physical', target: 'single_enemy', mpCost: 5, power: 0.9, hits: 2, element: 'slash', description: '0.9倍の斬撃を2回' },
    taunt_slash: { id: 'taunt_slash', name: '挑発斬り', type: 'physical', target: 'single_enemy', mpCost: 4, power: 1.1, element: 'slash', selfStatus: 'taunt', duration: 2, description: '攻撃し、狙われやすくなる' },
    fire: { id: 'fire', name: 'ファイア', type: 'magic', target: 'single_enemy', mpCost: 4, power: 1.5, element: 'fire', description: '敵1体に炎魔法' },
    ice: { id: 'ice', name: 'アイス', type: 'magic', target: 'single_enemy', mpCost: 4, power: 1.5, element: 'ice', description: '敵1体に氷魔法' },
    flame: { id: 'flame', name: 'フレイム', type: 'magic', target: 'all_enemies', mpCost: 8, power: 1.05, element: 'fire', description: '敵全体に炎魔法' },
    mana_restore: { id: 'mana_restore', name: 'マナ回復', type: 'restore_mp', target: 'self', mpCost: 0, amount: 12, once: true, description: '自身のMPを12回復（戦闘中1回）' },
    cover: { id: 'cover', name: 'かばう', type: 'status', target: 'single_ally', mpCost: 4, status: 'cover', duration: 1, description: '1ターン味方1人をかばう' },
    iron_wall: { id: 'iron_wall', name: '鉄壁', type: 'status', target: 'self', mpCost: 5, status: 'iron_wall', duration: 2, description: '被ダメージを大きく軽減' },
    shield_bash: { id: 'shield_bash', name: 'シールドバッシュ', type: 'physical', target: 'single_enemy', mpCost: 4, power: 0.75, element: 'none', delay: 4, description: '小ダメージ＋次の行動を遅延' },
    first_aid: { id: 'first_aid', name: '応急手当', type: 'heal', target: 'single_ally', mpCost: 4, power: 1.8, description: '味方1人のHPを回復' },
    group_supply: { id: 'group_supply', name: '全体補給', type: 'heal', target: 'all_allies', mpCost: 8, power: 0.85, description: '味方全体のHPを回復' },
    attack_order: { id: 'attack_order', name: '攻撃指令', type: 'status', target: 'single_ally', mpCost: 5, status: 'attack_up', duration: 2, description: '攻撃・魔力を2ターン上昇' },
    defense_order: { id: 'defense_order', name: '防衛指令', type: 'status', target: 'all_allies', mpCost: 5, status: 'defense_up', duration: 1, description: '味方全体の防御・精神を上昇' },

    enemy_attack: { id: 'enemy_attack', name: '攻撃', type: 'physical', target: 'single_enemy', power: 1, element: 'none' },
    slime_tackle: { id: 'slime_tackle', name: '体当たり', type: 'physical', target: 'single_enemy', power: 1.25, element: 'none' },
    bone_slash: { id: 'bone_slash', name: '骨斬り', type: 'physical', target: 'single_enemy', power: 1.35, element: 'slash' },
    ghost_bolt: { id: 'ghost_bolt', name: '霊弾', type: 'magic', target: 'single_enemy', power: 1.35, element: 'none' },
    curse: { id: 'curse', name: '呪い', type: 'status', target: 'single_enemy', status: 'attack_down', duration: 2 },
    dragon_breath: { id: 'dragon_breath', name: '火炎ブレス', type: 'magic', target: 'all_enemies', power: 1.1, element: 'fire' },
    dragon_charge: { id: 'dragon_charge', name: '力をためる', type: 'status', target: 'self', status: 'charged', duration: 2 }
  };

  const characters = [
    { id: 'warrior', name: '戦士', role: '単体攻撃', icon: '⚔️', maxHp: 126, maxMp: 20, attack: 23, magic: 5, defense: 13, spirit: 8, speed: 11, skills: ['power_slash'], learn: { 2: 'double_slash', 3: 'taunt_slash' } },
    { id: 'mage', name: '魔法使い', role: '属性魔法', icon: '🧙', maxHp: 82, maxMp: 34, attack: 7, magic: 24, defense: 7, spirit: 14, speed: 13, skills: ['fire', 'ice'], learn: { 2: 'flame', 3: 'mana_restore' } },
    { id: 'guardian', name: '盾役', role: '守護防御', icon: '🛡️', maxHp: 148, maxMp: 24, attack: 13, magic: 5, defense: 21, spirit: 15, speed: 7, skills: ['cover', 'iron_wall'], learn: { 2: 'shield_bash' } },
    { id: 'support', name: '支援拠点', role: '回復支援', icon: '🏰', maxHp: 104, maxMp: 32, attack: 7, magic: 19, defense: 11, spirit: 18, speed: 9, skills: ['first_aid', 'attack_order'], learn: { 2: 'group_supply', 3: 'defense_order' } }
  ];

  const enemies = {
    slime: { id: 'slime', name: 'スライム', icon: '🟢', maxHp: 44, maxMp: 0, attack: 11, magic: 2, defense: 4, spirit: 4, speed: 7, weaknesses: ['fire'], resistances: [], actions: [{ skillId: 'enemy_attack', weight: 70 }, { skillId: 'slime_tackle', weight: 30 }] },
    skeleton: { id: 'skeleton', name: '骸骨', icon: '💀', maxHp: 72, maxMp: 0, attack: 17, magic: 3, defense: 7, spirit: 6, speed: 10, weaknesses: ['holy', 'fire'], resistances: [], actions: [{ skillId: 'enemy_attack', weight: 55 }, { skillId: 'bone_slash', weight: 45 }] },
    ghost: { id: 'ghost', name: 'ゴースト', icon: '👻', maxHp: 62, maxMp: 0, attack: 7, magic: 19, defense: 12, spirit: 9, speed: 14, weaknesses: ['holy'], resistances: ['slash'], actions: [{ skillId: 'ghost_bolt', weight: 65 }, { skillId: 'curse', weight: 35 }] },
    dragon: { id: 'dragon', name: 'ドラゴン', icon: '🐉', maxHp: 260, maxMp: 0, attack: 25, magic: 23, defense: 15, spirit: 13, speed: 9, weaknesses: ['ice', 'lightning'], resistances: ['fire'], actions: [{ skillId: 'enemy_attack', weight: 50 }, { skillId: 'dragon_breath', weight: 25 }, { skillId: 'dragon_charge', weight: 25 }] }
  };

  const stages = [
    { id: 'stage_1_1', number: '1-1', name: 'はじまりの草原', subtitle: 'ぷるぷる注意報', waves: [['slime'], ['slime', 'slime'], ['slime', 'slime']], rewards: { exp: 30, gold: 20 } },
    { id: 'stage_1_2', number: '1-2', name: '骨鳴り街道', subtitle: '骸骨兵の足音', waves: [['slime', 'slime'], ['slime', 'skeleton'], ['skeleton']], rewards: { exp: 45, gold: 32 } },
    { id: 'stage_1_3', number: '1-3', name: '霧の墓地', subtitle: '見えない気配', waves: [['slime', 'slime'], ['skeleton', 'skeleton'], ['ghost']], rewards: { exp: 65, gold: 48 } },
    { id: 'stage_1_4', number: '1-4', name: '竜の火口', subtitle: '熱風の向こう側', waves: [['skeleton', 'slime'], ['ghost', 'slime'], ['dragon']], rewards: { exp: 95, gold: 75 } },
    { id: 'stage_1_5', number: '1-5', name: '災厄の巣', subtitle: '草原の最終決戦', waves: [['skeleton', 'skeleton'], ['ghost', 'ghost'], ['dragon', 'slime', 'slime']], rewards: { exp: 140, gold: 120 } }
  ];

  const items = {
    potion: { id: 'potion', name: 'ポーション', icon: '🧪', target: 'single_ally', effect: 'heal', amount: 50, description: 'HPを50回復' },
    high_potion: { id: 'high_potion', name: 'ハイポーション', icon: '🍷', target: 'single_ally', effect: 'heal', amount: 150, description: 'HPを150回復' },
    mana_potion: { id: 'mana_potion', name: 'マナ薬', icon: '💧', target: 'single_ally', effect: 'mp', amount: 20, description: 'MPを20回復' },
    antidote: { id: 'antidote', name: '毒消し', icon: '🌿', target: 'single_ally', effect: 'antidote', description: '毒を解除' },
    revive: { id: 'revive', name: '復活薬', icon: '✨', target: 'dead_ally', effect: 'revive', amount: 0.3, description: '戦闘不能からHP30%で復活' }
  };

  window.GAME_DATA = { skills, characters, enemies, stages, items };
}());
