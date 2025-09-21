export interface TileDefinition {
  id: string;
  name: string;
  texture: string;
  walkable: boolean;
  elevation?: number;
}

export interface FurnitureFootprint {
  width: number;
  height: number;
  elevation?: number;
}

export interface FurnitureDefinition {
  id: string;
  name: string;
  category: string;
  texture: string;
  footprint: FurnitureFootprint;
  interactable: boolean;
}

export interface NpcBehaviorConfig {
  type: 'idle' | 'wander' | 'scripted';
  speed: number;
}

export interface NpcDefinition {
  id: string;
  name: string;
  texture: string;
  behavior: NpcBehaviorConfig;
  dialogue?: string[];
}

export interface LocalizationEntry {
  id: string;
  value: string;
}
