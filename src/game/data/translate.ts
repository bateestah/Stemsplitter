import { DataRegistry, type SupportedLocale } from './DataRegistry';

export function translate(id: string, locale?: SupportedLocale): string {
  const registry = DataRegistry.getInstance();
  return locale ? registry.translate(id, locale) : registry.translate(id);
}
