export interface Party {
  id: string
  name: string
  pin: string
  background_url: string | null
  icon_key: string | null
  theme: string | null
  simplified_skills: boolean
  simplified_creation: boolean
  skills_sort: string
  created_at: string
}

export interface Character {
  id: string
  party_id: string
  name: string
  avatar_key: string
  class: string
  subclass: string | null
  level: number
  speed: number
  max_hp: number
  current_hp: number
  temp_hp: number
  ac: number
  str_score: number
  dex_score: number
  con_score: number
  int_score: number
  wis_score: number
  cha_score: number
  species: string | null
  use_spell_slots: boolean
  str_save_prof: boolean
  dex_save_prof: boolean
  con_save_prof: boolean
  int_save_prof: boolean
  wis_save_prof: boolean
  cha_save_prof: boolean
  conditions: string[]
  sort_order: number
  created_at: string
}

export interface CharacterSkill {
  id: string
  character_id: string
  skill_name: string
  ability: string
  is_proficient: boolean
  is_expert: boolean
}

export interface CharacterAttack {
  id: string
  character_id: string
  name: string
  description: string | null
  notation: string | null
  damage_type: string | null
  to_hit: string | null
  sort_order: number
  created_at: string
}

export interface CharacterSpell {
  id: string
  character_id: string
  name: string
  description: string | null
  notation: string | null
  damage_type: string | null
  to_hit: string | null
  spell_level: number
  sort_order: number
  created_at: string
}

export interface CharacterSpellSlot {
  id: string
  character_id: string
  slot_level: number
  max_slots: number
  used_slots: number
}

export interface CharacterInventory {
  id: string
  character_id: string
  name: string
  quantity: number
  sort_order: number
  created_at: string
}

export interface CharacterOther {
  id: string
  character_id: string
  name: string
  description: string | null
  notation: string | null
  to_hit: string | null
  has_slots: boolean
  max_slots: number
  used_slots: number
  sort_order: number
  created_at: string
}
