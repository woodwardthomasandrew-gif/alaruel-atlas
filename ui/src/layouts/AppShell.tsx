// ui/src/layouts/AppShell.tsx
//
// Persistent application chrome rendered when a campaign is open.
// Layout: fixed left sidebar | scrollable main content area.

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Icon }                          from '../components/ui/Icon';
import { useCampaignStore }              from '../store/campaign.store';
import { MODULE_REGISTRY }               from '../registry/module-registry';
import { atlas }                         from '../bridge/atlas';
import styles                            from './AppShell.module.css';

export function AppShell() {
  const navigate   = useNavigate();
  const campaign   = useCampaignStore(s => s.campaign);
  const setClosed  = useCampaignStore(s => s.setCampaignClosed);

  const campaignName = campaign
    ? ((campaign.name || campaign.filePath.split(/[\/]/).pop()?.replace(/\.db$/, '')) ?? 'Campaign')
    : '';

  async function handleClose() {
    await atlas.campaign.close();
    setClosed();
    navigate('/');
  }

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden>
            <Icon name="sword" size={16} />
          </div>
          <span className={styles.brandName}>Alaruel Atlas</span>
        </div>

        {/* Campaign name */}
        {campaign && (
          <div className={styles.campaignBlock}>
            <span className={styles.campaignLabel}>Campaign</span>
            <span className={styles.campaignName} title={campaign.filePath}>
              {campaignName}
            </span>
          </div>
        )}

        <div className={styles.navDivider} />

        {/* Dashboard link */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <Icon name="home" size={16} className={styles.navIcon} />
          <span>Dashboard</span>
        </NavLink>

        {/* Module links */}
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Modules</span>
          {MODULE_REGISTRY.map(entry => (
            <NavLink
              key={entry.id}
              to={entry.route}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon name={entry.icon as Parameters<typeof Icon>[0]['name']} size={16} className={styles.navIcon} />
              <span>{entry.displayName}</span>
            </NavLink>
          ))}
        </div>

        {/* Spacer + close */}
        <div className={styles.sidebarSpacer} />

        <div className={styles.navDivider} />

        <button className={styles.closeBtn} onClick={handleClose}>
          <Icon name="x" size={15} />
          <span>Close Campaign</span>
        </button>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
