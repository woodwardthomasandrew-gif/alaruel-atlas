import { useEffect } from 'react';
import { atlas }     from '../bridge/atlas';
import { useCampaignStore } from '../store/campaign.store';

export function useAppVersion() {
  const setAppVersion = useCampaignStore(s => s.setAppVersion);
  useEffect(() => {
    atlas.app.getVersion().then(setAppVersion).catch(() => {});
  }, [setAppVersion]);
}
