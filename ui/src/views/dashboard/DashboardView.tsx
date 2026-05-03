// ui/src/views/dashboard/DashboardView.tsx
//
// Campaign overview screen. Shown immediately after a campaign is opened.
// Displays campaign metadata and quick-access tiles for each module.

import { useNavigate }   from 'react-router-dom';
import { Icon }          from '../../components/ui/Icon';
import { useCampaignStore } from '../../store/campaign.store';
import { MODULE_REGISTRY }  from '../../registry/module-registry';
import { compactPathLabel, fileNameFromPath, fileNameWithoutExtension } from '../../utils/pathDisplay';
import styles            from './DashboardView.module.css';

export function DashboardView() {
  const navigate  = useNavigate();
  const campaign  = useCampaignStore(s => s.campaign);
  const appVersion = useCampaignStore(s => s.appVersion);

  if (!campaign) {
    navigate('/');
    return null;
  }

  const campaignName = campaign.name || fileNameWithoutExtension(campaign.filePath, '.db') || 'Campaign';

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLabel}>Active Campaign</span>
          <h1 className={styles.campaignTitle}>{campaignName}</h1>
          {campaign.filePath && (
            <p className={styles.filePath} title={campaign.filePath}>
              Database: {compactPathLabel(campaign.filePath)}
            </p>
          )}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.versionBadge}>v{appVersion}</span>
        </div>
      </header>

      {/* Ornament */}
      <div className={styles.ornamentLine}>
        <span className={styles.ornamentGlyph}>⊕</span>
      </div>

      {/* Module tiles */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Modules</h2>
        <div className={styles.tileGrid}>
          {MODULE_REGISTRY.map(entry => (
            <button
              key={entry.id}
              className={styles.tile}
              onClick={() => navigate(entry.route)}
            >
              <div className={styles.tileIcon}>
                <Icon name={entry.icon as Parameters<typeof Icon>[0]['name']} size={26} />
              </div>
              <span className={styles.tileName}>{entry.displayName}</span>
              <Icon name="chevron-right" size={14} className={styles.tileArrow} />
            </button>
          ))}
        </div>
      </section>

      {/* Quick info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Campaign Info</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Campaign ID</span>
            <span className={styles.infoValue} title={campaign.id}>
              {campaign.id ? `${campaign.id.slice(0, 8)}…` : '—'}
            </span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Database File</span>
            <span className={styles.infoValue}>
              {campaign.filePath ? fileNameFromPath(campaign.filePath) : '—'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
