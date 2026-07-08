import { useLanguage } from '../i18n/LanguageContext.jsx';
import './Benefits.css';

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="var(--orange)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Benefits() {
  const { t } = useLanguage();
  const benefits = t('benefits.items');

  return (
    <section className="section benefits" id="solutions">
      <div className="container">
        <span className="eyebrow">{t('benefits.eyebrow')}</span>
        <h2 className="section-title">{t('benefits.title')}</h2>
        <p className="section-subtitle">
          {t('benefits.subtitle')}
        </p>

        <div className="benefits-grid">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="benefit-card">
              <span className="benefit-icon" aria-hidden="true">
                <CheckIcon />
              </span>
              <div>
                <h3 className="benefit-title">{benefit.title}</h3>
                <p className="benefit-description">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
