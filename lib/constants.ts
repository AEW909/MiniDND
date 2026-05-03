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
