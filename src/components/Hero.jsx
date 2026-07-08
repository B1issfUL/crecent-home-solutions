import AddressForm from './AddressForm.jsx';
import StatisticsPanel from './StatisticsPanel.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import './Hero.css';

export default function Hero() {
  const { t } = useLanguage();
  const heroBenefits = t('hero.benefits');

  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">{t('hero.eyebrow')}</span>
          <h1 className="hero-headline">
            {t('hero.titlePrefix')} <span className="hero-highlight">{t('hero.titleHighlight')}</span>
            <br />
            {t('hero.titleSuffix')}
          </h1>
          <p className="hero-paragraph">
            {t('hero.paragraph')}
          </p>

          <AddressForm />

          <ul className="hero-benefits" aria-label={t('hero.benefitsAria')}>
            {heroBenefits.map((benefit) => (
              <li key={benefit} className="hero-benefit">
                <span className="benefit-dot" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <StatisticsPanel />
      </div>
    </section>
  );
}
