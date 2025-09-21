import Phaser from 'phaser';
import { z } from 'zod';

import furnitureManifest from '../../assets/data/furniture.json';
import localizationEn from '../../assets/data/localization.en.json';
import npcManifest from '../../assets/data/npcs.json';
import tileManifest from '../../assets/data/tiles.json';
import type { FurnitureDefinition, NpcDefinition, TileDefinition } from './types';

const TILE_CACHE_KEY = 'data:tiles';
const FURNITURE_CACHE_KEY = 'data:furniture';
const NPC_CACHE_KEY = 'data:npcs';
const LOCALIZATION_CACHE_PREFIX = 'data:localization:';

const tileSchema = z.object({
  id: z.string(),
  name: z.string(),
  texture: z.string(),
  walkable: z.boolean(),
  elevation: z.number().optional()
});

const tilesSchema = z.array(tileSchema);

const furnitureSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  texture: z.string(),
  footprint: z.object({
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
    elevation: z.number().optional()
  }),
  interactable: z.boolean()
});

const furnitureArraySchema = z.array(furnitureSchema);

const npcSchema = z.object({
  id: z.string(),
  name: z.string(),
  texture: z.string(),
  behavior: z.object({
    type: z.enum(['idle', 'wander', 'scripted']),
    speed: z.number().nonnegative()
  }),
  dialogue: z.array(z.string()).optional()
});

const npcArraySchema = z.array(npcSchema);

const localizationEntrySchema = z.object({
  id: z.string(),
  value: z.string()
});

const localizationArraySchema = z.array(localizationEntrySchema);

const manifestData = {
  tiles: tileManifest,
  furniture: furnitureManifest,
  npcs: npcManifest,
  localization: {
    en: localizationEn
  }
} as const;

type SupportedLocale = keyof typeof manifestData.localization;

export class DataRegistry {
  private static instance: DataRegistry | null = null;

  private tiles = new Map<string, TileDefinition>();
  private furniture = new Map<string, FurnitureDefinition>();
  private npcs = new Map<string, NpcDefinition>();
  private localization = new Map<string, Map<string, string>>();
  private initialized = false;
  private queuedLocales = new Set<string>();

  private constructor(private readonly defaultLocale: SupportedLocale = 'en') {}

  static getInstance(): DataRegistry {
    if (!DataRegistry.instance) {
      DataRegistry.instance = new DataRegistry();
    }

    return DataRegistry.instance;
  }

  queuePreload(loader: Phaser.Loader.LoaderPlugin, locale: SupportedLocale = this.defaultLocale): void {
    if (!this.initialized) {
      loader.json(TILE_CACHE_KEY, undefined, manifestData.tiles);
      loader.json(FURNITURE_CACHE_KEY, undefined, manifestData.furniture);
      loader.json(NPC_CACHE_KEY, undefined, manifestData.npcs);
    }

    if (!this.queuedLocales.has(locale)) {
      const localizationData = manifestData.localization[locale];
      if (!localizationData) {
        throw new Error(`Unsupported locale: ${locale}`);
      }

      loader.json(`${LOCALIZATION_CACHE_PREFIX}${locale}`, undefined, localizationData);
      this.queuedLocales.add(locale);
    }
  }

  initialize(scene: Phaser.Scene, locale: SupportedLocale = this.defaultLocale): void {
    const jsonCache = scene.cache.json;

    if (!this.initialized) {
      const tiles = tilesSchema.parse(jsonCache.get(TILE_CACHE_KEY));
      const furniture = furnitureArraySchema.parse(jsonCache.get(FURNITURE_CACHE_KEY));
      const npcs = npcArraySchema.parse(jsonCache.get(NPC_CACHE_KEY));

      this.tiles = new Map(tiles.map((tile) => [tile.id, tile]));
      this.furniture = new Map(furniture.map((item) => [item.id, item]));
      this.npcs = new Map(npcs.map((npc) => [npc.id, npc]));
      this.initialized = true;
    }

    const localizationKey = `${LOCALIZATION_CACHE_PREFIX}${locale}`;
    const localizationEntries = localizationArraySchema.parse(jsonCache.get(localizationKey));

    this.localization.set(locale, new Map(localizationEntries.map((entry) => [entry.id, entry.value])));
  }

  getTile(id: string): TileDefinition | undefined {
    return this.tiles.get(id);
  }

  getTiles(): TileDefinition[] {
    return Array.from(this.tiles.values());
  }

  getFurniture(id: string): FurnitureDefinition | undefined {
    return this.furniture.get(id);
  }

  getFurnitureList(): FurnitureDefinition[] {
    return Array.from(this.furniture.values());
  }

  getNpc(id: string): NpcDefinition | undefined {
    return this.npcs.get(id);
  }

  getNpcList(): NpcDefinition[] {
    return Array.from(this.npcs.values());
  }

  translate(id: string, locale: SupportedLocale = this.defaultLocale): string {
    const localeMap = this.localization.get(locale) ?? this.localization.get(this.defaultLocale);
    return localeMap?.get(id) ?? id;
  }
}

export type { SupportedLocale };
