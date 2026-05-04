export const PARTY_ICONS = [
  { key: 'shield',   emoji: '🛡️', label: 'Shield' },
  { key: 'swords',   emoji: '⚔️', label: 'Swords' },
  { key: 'castle',   emoji: '🏰', label: 'Castle' },
  { key: 'dragon',   emoji: '🐉', label: 'Dragon' },
  { key: 'map',      emoji: '🗺️', label: 'Map' },
  { key: 'crown',    emoji: '👑', label: 'Crown' },
  { key: 'skull',    emoji: '💀', label: 'Skull' },
  { key: 'fire',     emoji: '🔥', label: 'Fire' },
  { key: 'lightning',emoji: '⚡', label: 'Lightning' },
  { key: 'moon',     emoji: '🌙', label: 'Moon' },
  { key: 'sun',      emoji: '☀️', label: 'Sun' },
  { key: 'leaf',     emoji: '🌿', label: 'Leaf' },
  { key: 'wave',     emoji: '🌊', label: 'Wave' },
  { key: 'wand',     emoji: '🪄', label: 'Wand' },
  { key: 'dagger',   emoji: '🗡️', label: 'Dagger' },
  { key: 'bow',      emoji: '🏹', label: 'Bow' },
  { key: 'gem',      emoji: '💎', label: 'Gem' },
  { key: 'crystal',  emoji: '🔮', label: 'Crystal' },
  { key: 'axe',      emoji: '🪓', label: 'Axe' },
  { key: 'star',     emoji: '⭐', label: 'Star' },
  { key: 'comet',    emoji: '☄️', label: 'Comet' },
  { key: 'potion',   emoji: '🧪', label: 'Potion' },
  { key: 'scroll',   emoji: '📜', label: 'Scroll' },
  { key: 'tent',     emoji: '⛺', label: 'Camp' },
]

export function getPartyIcon(key: string | null | undefined): string {
  if (!key) return '🛡️'
  return PARTY_ICONS.find(i => i.key === key)?.emoji ?? '🛡️'
}

export const SPECIES = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn',
  'Aasimar', 'Firbolg', 'Goliath', 'Kenku', 'Lizardfolk',
  'Tabaxi', 'Triton', 'Warforged', 'Yuan-ti Pureblood',
]

export const SKILLS = [
  { name: 'Athletics', ability: 'STR' },
  { name: 'Acrobatics', ability: 'DEX' },
  { name: 'Sleight of Hand', ability: 'DEX' },
  { name: 'Stealth', ability: 'DEX' },
  { name: 'Arcana', ability: 'INT' },
  { name: 'History', ability: 'INT' },
  { name: 'Investigation', ability: 'INT' },
  { name: 'Nature', ability: 'INT' },
  { name: 'Religion', ability: 'INT' },
  { name: 'Animal Handling', ability: 'WIS' },
  { name: 'Insight', ability: 'WIS' },
  { name: 'Medicine', ability: 'WIS' },
  { name: 'Perception', ability: 'WIS' },
  { name: 'Survival', ability: 'WIS' },
  { name: 'Deception', ability: 'CHA' },
  { name: 'Intimidation', ability: 'CHA' },
  { name: 'Performance', ability: 'CHA' },
  { name: 'Persuasion', ability: 'CHA' },
]

export const ABILITY_LABELS: Record<string, string> = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
}

export const CLASSES: Record<string, string[]> = {
  Artificer: ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith'],
  Barbarian: [
    'Path of the Berserker', 'Path of the Totem Warrior', 'Path of Wild Magic',
    'Path of the Zealot', 'Path of the Beast', 'Path of the Storm Herald',
  ],
  Bard: [
    'College of Lore', 'College of Valor', 'College of Creation',
    'College of Eloquence', 'College of Glamour', 'College of Spirits',
    'College of Swords', 'College of Whispers',
  ],
  Cleric: [
    'Life Domain', 'Light Domain', 'Trickery Domain', 'Knowledge Domain',
    'War Domain', 'Nature Domain', 'Tempest Domain', 'Arcana Domain',
    'Death Domain', 'Forge Domain', 'Grave Domain', 'Order Domain',
    'Peace Domain', 'Twilight Domain',
  ],
  Druid: [
    'Circle of the Land', 'Circle of the Moon', 'Circle of Dreams',
    'Circle of the Shepherd', 'Circle of Spores', 'Circle of Stars', 'Circle of Wildfire',
  ],
  Fighter: [
    'Champion', 'Battle Master', 'Eldritch Knight', 'Arcane Archer',
    'Cavalier', 'Samurai', 'Echo Knight', 'Psi Warrior', 'Rune Knight',
    'Purple Dragon Knight',
  ],
  Monk: [
    'Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements',
    'Way of the Astral Self', 'Way of the Drunken Master', 'Way of the Kensei',
    'Way of the Long Death', 'Way of Mercy', 'Way of the Sun Soul',
  ],
  Paladin: [
    'Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance',
    'Oath of Conquest', 'Oath of the Crown', 'Oath of Glory',
    'Oath of Redemption', 'Oath of the Watchers', 'Oathbreaker',
  ],
  Ranger: [
    'Hunter', 'Beast Master', 'Fey Wanderer', 'Gloom Stalker',
    'Horizon Walker', 'Monster Slayer', 'Swarmkeeper',
  ],
  Rogue: [
    'Thief', 'Assassin', 'Arcane Trickster', 'Inquisitive', 'Mastermind',
    'Phantom', 'Scout', 'Soulknife', 'Swashbuckler',
  ],
  Sorcerer: [
    'Draconic Bloodline', 'Wild Magic', 'Aberrant Mind', 'Clockwork Soul',
    'Divine Soul', 'Shadow Magic', 'Storm Sorcery',
  ],
  Warlock: [
    'The Archfey', 'The Fiend', 'The Great Old One', 'The Celestial',
    'The Fathomless', 'The Genie', 'The Hexblade', 'The Undead', 'The Undying',
  ],
  Wizard: [
    'School of Abjuration', 'School of Conjuration', 'School of Divination',
    'School of Enchantment', 'School of Evocation', 'School of Illusion',
    'School of Necromancy', 'School of Transmutation', 'Bladesinging',
    'Chronurgy Magic', 'Graviturgy Magic', 'Order of Scribes', 'War Magic',
  ],
}

export const CLASS_NAMES = Object.keys(CLASSES)

export const DAMAGE_TYPES = [
  { key: 'slashing',    label: 'Slashing',    emoji: '⚔️',  color: '#a8836a' },
  { key: 'piercing',    label: 'Piercing',    emoji: '🗡️',  color: '#9aa3b0' },
  { key: 'bludgeoning', label: 'Bludgeoning', emoji: '🔨',  color: '#8a7560' },
  { key: 'fire',        label: 'Fire',        emoji: '🔥',  color: '#e8612c' },
  { key: 'cold',        label: 'Cold',        emoji: '❄️',  color: '#6ab0d4' },
  { key: 'lightning',   label: 'Lightning',   emoji: '⚡',  color: '#e8c832' },
  { key: 'thunder',     label: 'Thunder',     emoji: '💥',  color: '#a078c8' },
  { key: 'acid',        label: 'Acid',        emoji: '🧪',  color: '#78c840' },
  { key: 'poison',      label: 'Poison',      emoji: '☠️',  color: '#609050' },
  { key: 'radiant',     label: 'Radiant',     emoji: '✨',  color: '#e8d060' },
  { key: 'necrotic',    label: 'Necrotic',    emoji: '💀',  color: '#7858a0' },
  { key: 'psychic',     label: 'Psychic',     emoji: '🔮',  color: '#c060c0' },
  { key: 'force',       label: 'Force',       emoji: '💫',  color: '#6080e0' },
  { key: 'healing',     label: 'Healing',     emoji: '💚',  color: '#40b870' },
]

export const AVATARS = [
  { key: 'warrior', emoji: '⚔️', label: 'Warrior' },
  { key: 'wizard', emoji: '🧙', label: 'Wizard' },
  { key: 'rogue', emoji: '🗡️', label: 'Rogue' },
  { key: 'cleric', emoji: '⛪', label: 'Cleric' },
  { key: 'ranger', emoji: '🏹', label: 'Ranger' },
  { key: 'bard', emoji: '🎵', label: 'Bard' },
  { key: 'druid', emoji: '🌿', label: 'Druid' },
  { key: 'monk', emoji: '☯️', label: 'Monk' },
  { key: 'paladin', emoji: '🛡️', label: 'Paladin' },
  { key: 'barbarian', emoji: '🪓', label: 'Barbarian' },
  { key: 'sorcerer', emoji: '💫', label: 'Sorcerer' },
  { key: 'warlock', emoji: '👁️', label: 'Warlock' },
  { key: 'artificer', emoji: '⚙️', label: 'Artificer' },
  { key: 'dragon', emoji: '🐉', label: 'Dragon' },
  { key: 'wolf', emoji: '🐺', label: 'Wolf' },
  { key: 'eagle', emoji: '🦅', label: 'Eagle' },
]

export function getAvatarEmoji(key: string): string {
  return AVATARS.find(a => a.key === key)?.emoji ?? '⚔️'
}

export function getDamageEmoji(type: string | null | undefined): string {
  if (!type) return ''
  return DAMAGE_TYPES.find(d => d.key === type)?.emoji ?? ''
}

export function getDamageColor(type: string | null | undefined): string {
  if (!type) return '#888'
  return DAMAGE_TYPES.find(d => d.key === type)?.color ?? '#888'
}

export function getDamageLabel(type: string | null | undefined): string {
  if (!type) return ''
  return DAMAGE_TYPES.find(d => d.key === type)?.label ?? ''
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// SRD saving throw proficiencies per class
type SaveAb = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export const CLASS_SAVE_PROFS: Record<string, [SaveAb, SaveAb]> = {
  Artificer: ['con', 'int'],
  Barbarian: ['str', 'con'],
  Bard:      ['dex', 'cha'],
  Cleric:    ['wis', 'cha'],
  Druid:     ['int', 'wis'],
  Fighter:   ['str', 'con'],
  Monk:      ['str', 'dex'],
  Paladin:   ['wis', 'cha'],
  Ranger:    ['str', 'dex'],
  Rogue:     ['dex', 'int'],
  Sorcerer:  ['con', 'cha'],
  Warlock:   ['wis', 'cha'],
  Wizard:    ['int', 'wis'],
}

// Standard array (15,14,13,12,10,8) assigned to each class's ability priority
export const CLASS_ABILITY_SUGGESTIONS: Record<string, {
  str_score: number; dex_score: number; con_score: number
  int_score: number; wis_score: number; cha_score: number
}> = {
  Artificer:  { str_score: 8,  dex_score: 13, con_score: 14, int_score: 15, wis_score: 12, cha_score: 10 },
  Barbarian:  { str_score: 15, dex_score: 13, con_score: 14, int_score: 8,  wis_score: 12, cha_score: 10 },
  Bard:       { str_score: 8,  dex_score: 14, con_score: 13, int_score: 10, wis_score: 12, cha_score: 15 },
  Cleric:     { str_score: 14, dex_score: 8,  con_score: 13, int_score: 10, wis_score: 15, cha_score: 12 },
  Druid:      { str_score: 10, dex_score: 13, con_score: 14, int_score: 12, wis_score: 15, cha_score: 8  },
  Fighter:    { str_score: 15, dex_score: 13, con_score: 14, int_score: 8,  wis_score: 12, cha_score: 10 },
  Monk:       { str_score: 12, dex_score: 15, con_score: 13, int_score: 10, wis_score: 14, cha_score: 8  },
  Paladin:    { str_score: 15, dex_score: 10, con_score: 13, int_score: 8,  wis_score: 12, cha_score: 14 },
  Ranger:     { str_score: 12, dex_score: 15, con_score: 13, int_score: 10, wis_score: 14, cha_score: 8  },
  Rogue:      { str_score: 8,  dex_score: 15, con_score: 13, int_score: 14, wis_score: 12, cha_score: 10 },
  Sorcerer:   { str_score: 8,  dex_score: 13, con_score: 14, int_score: 10, wis_score: 12, cha_score: 15 },
  Warlock:    { str_score: 8,  dex_score: 13, con_score: 14, int_score: 10, wis_score: 12, cha_score: 15 },
  Wizard:     { str_score: 8,  dex_score: 14, con_score: 13, int_score: 15, wis_score: 12, cha_score: 10 },
}

export const CLASS_STARTER_GEAR: Record<string, {
  ac: number
  attacks: { name: string; notation: string | null; damage_type: string | null; to_hit: string | null }[]
  inventory: { name: string; quantity: number }[]
}> = {
  Artificer: {
    ac: 14,
    attacks: [{ name: 'Hand Crossbow', notation: '1d6', damage_type: 'piercing', to_hit: '+4' }],
    inventory: [{ name: "Thieves' Tools", quantity: 1 }, { name: "Tinker's Tools", quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Barbarian: {
    ac: 13,
    attacks: [{ name: 'Greataxe', notation: '1d12', damage_type: 'slashing', to_hit: '+5' }, { name: 'Handaxe', notation: '1d6', damage_type: 'slashing', to_hit: '+5' }],
    inventory: [{ name: 'Handaxe', quantity: 2 }, { name: 'Explorer\'s Pack', quantity: 1 }, { name: 'Javelin', quantity: 4 }],
  },
  Bard: {
    ac: 12,
    attacks: [{ name: 'Rapier', notation: '1d8', damage_type: 'piercing', to_hit: '+4' }],
    inventory: [{ name: 'Lute', quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Cleric: {
    ac: 18,
    attacks: [{ name: 'Mace', notation: '1d6', damage_type: 'bludgeoning', to_hit: '+4' }],
    inventory: [{ name: 'Chain Mail', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Holy Symbol', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Druid: {
    ac: 14,
    attacks: [{ name: 'Quarterstaff', notation: '1d6', damage_type: 'bludgeoning', to_hit: '+2' }],
    inventory: [{ name: 'Leather Armor', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Druidic Focus', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Fighter: {
    ac: 16,
    attacks: [{ name: 'Longsword', notation: '1d8', damage_type: 'slashing', to_hit: '+5' }],
    inventory: [{ name: 'Chain Mail', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Handaxe', quantity: 2 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Monk: {
    ac: 14,
    attacks: [{ name: 'Shortsword', notation: '1d6', damage_type: 'piercing', to_hit: '+4' }, { name: 'Unarmed Strike', notation: '1d4', damage_type: 'bludgeoning', to_hit: '+4' }],
    inventory: [{ name: 'Dart', quantity: 10 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Paladin: {
    ac: 18,
    attacks: [{ name: 'Longsword', notation: '1d8', damage_type: 'slashing', to_hit: '+5' }],
    inventory: [{ name: 'Plate Armor', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Holy Symbol', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Ranger: {
    ac: 14,
    attacks: [{ name: 'Longbow', notation: '1d8', damage_type: 'piercing', to_hit: '+5' }, { name: 'Shortsword', notation: '1d6', damage_type: 'piercing', to_hit: '+5' }],
    inventory: [{ name: 'Scale Mail', quantity: 1 }, { name: 'Quiver (20 arrows)', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Rogue: {
    ac: 13,
    attacks: [{ name: 'Rapier', notation: '1d8', damage_type: 'piercing', to_hit: '+5' }, { name: 'Shortbow', notation: '1d6', damage_type: 'piercing', to_hit: '+5' }],
    inventory: [{ name: "Thieves' Tools", quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Sorcerer: {
    ac: 12,
    attacks: [{ name: 'Dagger', notation: '1d4', damage_type: 'piercing', to_hit: '+4' }],
    inventory: [{ name: 'Component Pouch', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Warlock: {
    ac: 12,
    attacks: [{ name: 'Eldritch Blast', notation: '1d10', damage_type: 'force', to_hit: '+4' }, { name: 'Dagger', notation: '1d4', damage_type: 'piercing', to_hit: '+4' }],
    inventory: [{ name: 'Arcane Focus', quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
  Wizard: {
    ac: 12,
    attacks: [{ name: 'Quarterstaff', notation: '1d6', damage_type: 'bludgeoning', to_hit: '+2' }, { name: 'Fire Bolt', notation: '1d10', damage_type: 'fire', to_hit: '+4' }],
    inventory: [{ name: 'Spellbook', quantity: 1 }, { name: 'Arcane Focus', quantity: 1 }, { name: 'Backpack', quantity: 1 }, { name: 'Rations', quantity: 5 }],
  },
}
