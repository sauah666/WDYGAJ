

// Layer: DOMAIN
// Purpose: Registry of supported target sites for multi-site architecture.

// FIX: Import SiteDefinition from entities to share the type and avoid mismatches.
import { SiteDefinition } from './entities';

export type SiteId = string;

export const DEFAULT_SITE_ID: SiteId = 'hh.ru';

export const SiteRegistry: Record<SiteId, SiteDefinition> = {
  'hh.ru': {
    id: 'hh.ru',
    label: 'HeadHunter (hh.ru)',
    baseUrl: 'https://hh.ru',
    enabled: true,
    storageNamespace: 'hh.ru',
    searchEntrypoint: { kind: 'url', url: 'https://hh.ru/search/vacancy/advanced' }
  },
  // Placeholder for future expansion
  'linkedin': {
    id: 'linkedin',
    label: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    enabled: false,
    storageNamespace: 'linkedin',
    searchEntrypoint: { kind: 'url', url: 'https://www.linkedin.com/jobs/search' }
  }
};

export function getSite(siteId: SiteId): SiteDefinition | null {
  return SiteRegistry[siteId] || null;
}

export function listEnabledSites(): SiteDefinition[] {
  return Object.values(SiteRegistry).filter(s => s.enabled);
}
