export type StatName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface Stats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

export interface Character {
  name: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  inventory: Item[];
  skills: string[];
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  meta?: {
    type: 'roll' | 'narration' | 'dialogue';
    rollResult?: {
      dice: string;
      result: number;
      total: number;
    };
  };
}

export interface GameState {
  character: Character;
  chatHistory: Message[];
  isConfigured: boolean;
}
