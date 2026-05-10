// ui/src/views/welcome/WelcomeView.tsx
//
// The first screen the user sees. No campaign is open yet.
// Shows: app logo/title, New Campaign, Open Campaign, recent campaigns list.

import { useEffect, useState } from 'react';
import { useNavigate }          from 'react-router-dom';
import { Icon }                 from '../../components/ui/Icon';
import { useOpenCampaign,
         useCreateCampaign,
         useRecentCampaigns }   from '../../hooks/useBridge';
import { useCampaignStore }     from '../../store/campaign.store';
import { ROUTES }               from '../../router/routes';
import { compactPathLabel, fileNameWithoutExtension } from '../../utils/pathDisplay';
import styles                   from './WelcomeView.module.css';
import { atlas }               from '../../bridge/atlas';

export function WelcomeView() {
  const navigate    = useNavigate();
  const appVersion  = useCampaignStore(s => s.appVersion);
  const { recent, loading: recentLoading } = useRecentCampaigns();
  const { openCampaign, loading: opening, error: openError } = useOpenCampaign();
  const { createCampaign, loading: creating, error: createError } = useCreateCampaign();

  // New campaign form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newGm,       setNewGm]       = useState('');
  const [newSystem,   setNewSystem]   = useState('');

  const campaign = useCampaignStore(s => s.campaign);

  // Redirect after the campaign state settles to avoid render-phase navigation.
  useEffect(() => {
    if (campaign) navigate(ROUTES.dashboard, { replace: true });
  }, [campaign, navigate]);

  const busy = opening || creating;
  const error = openError ?? createError;

  if (campaign) return null;

  async function handleOpen() {
    const path = await atlas.campaign.pickFile();
    if (path) openCampaign(path);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCampaign({ name: newName.trim(), gmName: newGm.trim() || undefined, system: newSystem.trim() || undefined });
    setShowNewForm(false);
  }

  return (
    <div className={styles.root}>
      {/* Background runes decoration */}
      <div className={styles.runesBg} aria-hidden>
        {['☽','✦','⊕','⋆','✧','⊗','☿','⊙'].map((r, i) => (
          <span key={i} className={styles.rune} style={{ '--i': i } as React.CSSProperties}>{r}</span>
        ))}
      </div>

      <div className={styles.panel}>
        {/* Logo / title */}
        <header className={styles.header}>
          <div className={styles.logoMark} aria-hidden>
            <Icon name="sword" size={28} />
          </div>
          <h1 className={styles.title}>Alaruel Atlas</h1>
          <p className={styles.subtitle}>Campaign Management System</p>
          <span className={styles.version}>v{appVersion}</span>
        </header>

        {/* Divider */}
        <div className={styles.divider}><span>◈</span></div>

        {/* Error banner */}
        {error && (
          <div className={styles.errorBanner}>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Primary actions */}
        {!showNewForm ? (
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowNewForm(true)}
              disabled={busy}
            >
              <Icon name="plus" size={18} />
              New Campaign
            </button>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={handleOpen}
              disabled={busy}
            >
              {opening ? <Icon name="loader" size={18} className={styles.spin} /> : <Icon name="open" size={18} />}
              Open Campaign
            </button>
          </div>
        ) : (
          <form className={styles.newForm} onSubmit={handleCreate}>
            <h3 className={styles.formTitle}>New Campaign</h3>
            <label className={styles.label}>
              Campaign Name
              <input
                className={styles.input}
                type="text"
                placeholder="The Shattered Realm…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                required
              />
            </label>
            <div className={styles.formRow}>
              <label className={styles.label}>
                GM Name
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Optional"
                  value={newGm}
                  onChange={e => setNewGm(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                Game System
                <input
                  className={styles.input}
                  type="text"
                  placeholder="D&D 5e, PF2e…"
                  value={newSystem}
                  onChange={e => setNewSystem(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={busy || !newName.trim()}
              >
                {creating ? <Icon name="loader" size={16} className={styles.spin} /> : null}
                Create Campaign
              </button>
            </div>
          </form>
        )}

        {/* Recent campaigns */}
        {!showNewForm && (
          <section className={styles.recent}>
            <h3 className={styles.recentTitle}>Recent Campaigns</h3>
            {recentLoading ? (
              <p className={styles.hint}>Loading…</p>
            ) : recent.length === 0 ? (
              <p className={styles.hint}>No recent campaigns. Create or open one above.</p>
            ) : (
              <ul className={styles.recentList}>
                {recent.map(filePath => (
                  <li key={filePath}>
                    <button
                      className={styles.recentItem}
                      onClick={() => openCampaign(filePath)}
                      disabled={busy}
                      title={filePath}
                    >
                      <Icon name="scroll" size={15} className={styles.recentIcon} />
                      <span className={styles.recentName}>{fileNameWithoutExtension(filePath, '.db')}</span>
                      <span className={styles.recentPath}>{compactPathLabel(filePath)}</span>
                      <Icon name="chevron-right" size={14} className={styles.recentArrow} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
