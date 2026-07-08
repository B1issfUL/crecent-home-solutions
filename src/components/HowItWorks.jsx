import { useLanguage } from '../i18n/LanguageContext.jsx';
import './HowItWorks.css';

export default function HowItWorks() {
  const { t } = useLanguage();
  const steps = t('howItWorks.steps');

  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container">
        <span className="eyebrow">{t('howItWorks.eyebrow')}</span>
        <h2 className="section-title">{t('howItWorks.title')}</h2>
        <p className="section-subtitle">
          {t('howItWorks.subtitle')}
        </p>

        <ol className="steps-grid">
          {steps.map((step, index) => (
            <li key={step.title} className="step-card">
              <span className="step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
