// ui/src/views/dashboard/DashboardView.tsx
//
// Refactored fantasy dashboard — tiered hierarchy, hero panel, module identity.

import { useNavigate } from 'react-router-dom';
import { Icon }        from '../../components/ui/Icon';
import { useCampaignStore } from '../../store/campaign.store';
import { MODULE_REGISTRY }  from '../../registry/module-registry';
import { fileNameWithoutExtension } from '../../utils/pathDisplay';
import styles from './DashboardView.module.css';

// Module identity: maps module id → CSS custom property accent color
const MODULE_ACCENT: Record<string, string> = {
  party:          'var(--mod-party)',
  sessions:       'var(--mod-sessions)',
  quests:         'var(--mod-quests)',
  npcs:           'var(--mod-npcs)',
  factions:       'var(--mod-factions)',
  atlas:          'var(--mod-atlas)',
  timeline:       'var(--mod-timeline)',
  graph:          'var(--mod-graph)',
  bestiary:       'var(--mod-bestiary)',
  dungeon:        'var(--mod-dungeon)',
  assets:         'var(--mod-assets)',
  'mini-catalogue': 'var(--mod-mini)',
  generators:     'var(--mod-generators)',
  inspiration:    'var(--mod-inspiration)',
};

// Core modules (tier B) — larger cards, more visual weight
const CORE_MODULE_IDS = ['party', 'sessions', 'quests', 'npcs', 'factions'];

// Secondary modules (tier C)
const SECONDARY_MODULE_IDS = ['atlas', 'timeline', 'graph', 'bestiary', 'dungeon', 'assets', 'mini-catalogue', 'generators', 'inspiration'];

export function DashboardView() {
  const navigate   = useNavigate();
  const campaign   = useCampaignStore(s => s.campaign);
  const appVersion = useCampaignStore(s => s.appVersion);

  if (!campaign) {
    navigate('/');
    return null;
  }

  const campaignName = campaign.name
    || fileNameWithoutExtension(campaign.filePath, '.db')
    || 'Campaign';

  const coreModules      = MODULE_REGISTRY.filter(m => CORE_MODULE_IDS.includes(m.id));
  const secondaryModules = MODULE_REGISTRY.filter(m => SECONDARY_MODULE_IDS.includes(m.id));

  return (
    <div className={styles.root}>

      {/* ── TIER A: Hero Section ─────────────────────────────────────────── */}
      <section className={styles.hero}>
        {/* Decorative corner marks */}
        <span className={styles.cornerTL} aria-hidden />
        <span className={styles.cornerTR} aria-hidden />
        <span className={styles.cornerBL} aria-hidden />
        <span className={styles.cornerBR} aria-hidden />

        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <p className={styles.heroLabel}>Active Campaign</p>
            <h1 className={styles.heroTitle}>{campaignName}</h1>
            <div className={styles.heroDivider}>
              <span className={styles.heroDividerGlyph}>✦</span>
            </div>
            <p className={styles.heroSubtitle}>
              Your chronicle awaits. Where will the story take your heroes today?
            </p>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroQuickActions}>
              <button
                className={styles.heroAction}
                onClick={() => navigate('/sessions')}
              >
                <Icon name="calendar" size={18} />
                <span>Sessions</span>
              </button>
              <button
                className={styles.heroAction}
                onClick={() => navigate('/quests')}
              >
                <Icon name="scroll" size={18} />
                <span>Quests</span>
              </button>
              <button
                className={styles.heroAction}
                onClick={() => navigate('/party')}
              >
                <Icon name="users" size={18} />
                <span>Party</span>
              </button>
            </div>
            <span className={styles.versionBadge}>v{appVersion}</span>
          </div>
        </div>
      </section>

      {/* ── TIER B: Core Modules ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionRune}>⬡</span>
          <h2 className={styles.sectionTitle}>Core Systems</h2>
          <span className={styles.sectionLine} aria-hidden />
        </header>

        <div className={styles.coreGrid}>
          {coreModules.map(entry => {
            const accent = MODULE_ACCENT[entry.id] ?? 'var(--gold-500)';
            return (
              <button
                key={entry.id}
                className={styles.coreCard}
                style={{ '--module-accent': accent } as React.CSSProperties}
                onClick={() => navigate(entry.route)}
              >
                <div className={styles.coreCardGlow} aria-hidden />
                <div className={styles.coreCardTop}>
                  <div className={styles.coreCardIcon}>
                    <Icon name={entry.icon as Parameters<typeof Icon>[0]['name']} size={24} />
                  </div>
                </div>
                <div className={styles.coreCardBody}>
                  <span className={styles.coreCardName}>{entry.displayName}</span>
                  <Icon name="chevron-right" size={13} className={styles.coreCardArrow} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── TIER C: Secondary Modules ────────────────────────────────────── */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionRune}>◈</span>
          <h2 className={styles.sectionTitle}>Arcane Tools</h2>
          <span className={styles.sectionLine} aria-hidden />
        </header>

        <div className={styles.secondaryGrid}>
          {secondaryModules.map(entry => {
            const accent = MODULE_ACCENT[entry.id] ?? 'var(--ink-500)';
            return (
              <button
                key={entry.id}
                className={styles.secondaryCard}
                style={{ '--module-accent': accent } as React.CSSProperties}
                onClick={() => navigate(entry.route)}
              >
                <div className={styles.secondaryCardIcon}>
                  <Icon name={entry.icon as Parameters<typeof Icon>[0]['name']} size={16} />
                </div>
                <span className={styles.secondaryCardName}>{entry.displayName}</span>
                <Icon name="chevron-right" size={12} className={styles.secondaryCardArrow} />
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}
