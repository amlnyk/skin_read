import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore, useAppStoreApi } from '@/store';
import { Chip } from '@/ui';
import styles from '../styles/settings.module.css';

// The start of the settings: which optional journal fields are shown, and the three subpages.
export function SettingsPage() {
  const store = useAppStoreApi();
  const settings = useAppStore((state) => state.settings);
  const update = store.getState().actions.settings.update;

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/profile">
        {t('settings.toProfile')}
      </Link>
      <h1>{t('settings.title')}</h1>

      <fieldset className={styles.group}>
        <legend>{t('settings.journalFieldsTitle')}</legend>
        <Chip
          kind="checkbox"
          name="setting-cycle"
          value="cycle"
          label={t('settings.cycleToggle')}
          selected={settings.cycleTrackingVisible}
          onChange={() => update({ cycleTrackingVisible: !settings.cycleTrackingVisible })}
        />
        <Chip
          kind="checkbox"
          name="setting-shaving"
          value="shaving"
          label={t('settings.shavingToggle')}
          selected={settings.showShavingField}
          onChange={() => update({ showShavingField: !settings.showShavingField })}
        />
      </fieldset>

      <ul className={styles.links}>
        <li>
          <Link className={styles.linkButton} to="/profile/settings/reminders">
            {t('settings.remindersLink')}
          </Link>
        </li>
        <li>
          <Link className={styles.linkButton} to="/profile/settings/consents">
            {t('settings.consentsLink')}
          </Link>
        </li>
        <li>
          <Link className={styles.linkButton} to="/profile/settings/data">
            {t('settings.dataLink')}
          </Link>
        </li>
      </ul>
    </section>
  );
}
