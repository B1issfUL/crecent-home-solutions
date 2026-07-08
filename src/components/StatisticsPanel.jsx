import './StatisticsPanel.css';
import useHomepageStats from '../hooks/useHomepageStats.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { formatHomepageStats } from '../lib/homepageStats.js';

export default function StatisticsPanel() {
  const { t } = useLanguage();
  const { stats, status } = useHomepageStats();
  const formattedStats = formatHomepageStats(stats, t('stats.metrics'));
  const purchaseOptions = t('stats.purchaseOptions');

  return (
    <aside className="stats-panel" aria-label={t('stats.aria')}>
      <div className="stats-header">
        <h2 className="stats-title">{t('stats.title')}</h2>
        <span className="stats-status">
          <span className="status-dot" aria-hidden="true" />
          {status === 'loading' ? t('stats.syncing') : t('stats.ready')}
        </span>
      </div>

      <div className="stats-grid">
        {formattedStats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="stats-divider" role="presentation" />

      <h3 className="options-title">{t('stats.purchaseMethod')}</h3>
      <ul className="options-list">
        {purchaseOptions.map((option) => (
          <li key={option} className="option-tag">
            {option}
          </li>
        ))}
      </ul>
    </aside>
  );
}
