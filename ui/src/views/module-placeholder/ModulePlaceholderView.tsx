// ui/src/views/module-placeholder/ModulePlaceholderView.tsx
//
// Temporary placeholder rendered for all feature modules until they are
// implemented. Reads the current route to display the correct module name.

import { useLocation, useNavigate } from 'react-router-dom';
import { Icon }    from '../../components/ui/Icon';
import { MODULE_REGISTRY } from '../../registry/module-registry';
import styles      from './ModulePlaceholderView.module.css';

export function ModulePlaceholderView() {
  const location = useLocation();
  const navigate = useNavigate();
  const entry    = MODULE_REGISTRY.find(m => m.route === location.pathname);

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.iconWrap} aria-hidden>
          {entry ? (
            <Icon name={entry.icon as Parameters<typeof Icon>[0]['name']} size={36} />
          ) : (
            <Icon name="scroll" size={36} />
          )}
        </div>
        <h2 className={styles.title}>{entry?.displayName ?? 'Module'}</h2>
        <p className={styles.body}>
          This module is not yet implemented. The framework, database schema,
          service layer, and event wiring are ready — only the UI and
          business logic remain.
        </p>
        <div className={styles.stack}>
          <span className={styles.badge}>repository.ts ✓</span>
          <span className={styles.badge}>service.ts ✓</span>
          <span className={styles.badge}>module.ts ✓</span>
          <span className={styles.badge}>events.ts ✓</span>
          <span className={`${styles.badge} ${styles.badgePending}`}>views/ ⏳</span>
        </div>
        <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
          <Icon name="home" size={15} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
