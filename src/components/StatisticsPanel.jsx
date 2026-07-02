import './StatisticsPanel.css';

// Placeholder values only. No property data is calculated or retrieved.
const STATS = [
  { value: '0', label: 'Properties Reviewed' },
  { value: '0 Days', label: 'Estimated Timeline' },
  { value: '$0', label: 'Estimated Cash Offer' },
  { value: '0%', label: 'Review Complete' },
];

const PURCHASE_OPTIONS = ['Cash Purchase'];

export default function StatisticsPanel() {
  return (
    <aside className="stats-panel" aria-label="Property review status">
      <div className="stats-header">
        <h2 className="stats-title">Property Review Status</h2>
        <span className="stats-status">
          <span className="status-dot" aria-hidden="true" />
          Ready
        </span>
      </div>

      <div className="stats-grid">
        {STATS.map((stat) => (
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
