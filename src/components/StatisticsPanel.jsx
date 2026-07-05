import './StatisticsPanel.css';
import useHomepageStats from '../hooks/useHomepageStats.js';
import { formatHomepageStats } from '../lib/homepageStats.js';

const PURCHASE_OPTIONS = ['Cash Purchase'];

export default function StatisticsPanel() {
  const { stats, status } = useHomepageStats();
  const formattedStats = formatHomepageStats(stats);

  return (
    <aside className="stats-panel" aria-label="Property review status">
      <div className="stats-header">
        <h2 className="stats-title">Property Review Status</h2>
        <span className="stats-status">
          <span className="status-dot" aria-hidden="true" />
          {status === 'loading' ? 'Syncing' : 'Ready'}
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

      <h3 className="options-title">Purchase Method</h3>
      <ul className="options-list">
        {PURCHASE_OPTIONS.map((option) => (
          <li key={option} className="option-tag">
            {option}
          </li>
        ))}
      </ul>
    </aside>
  );
}
