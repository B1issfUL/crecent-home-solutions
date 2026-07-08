import { useLanguage } from '../i18n/LanguageContext.jsx';
import './Contact.css';

export default function Contact() {
  const { t } = useLanguage();

  return (
    <section className="section contact" id="contact">
      <div className="container">
        <div className="contact-card" id="about">
          <span className="eyebrow">{t('contact.eyebrow')}</span>
          <h2 className="section-title">{t('contact.title')}</h2>
          <p className="contact-statement">
            {t('contact.statement')}
          </p>

          <div className="contact-details">
            <div className="contact-item">
              <span className="contact-label">{t('common.phone')}</span>
              <a href="tel:+17372050102" className="contact-value">
                (+1) 737 205 0102
              </a>
            </div>
            <div className="contact-item">
              <span className="contact-label">{t('common.email')}</span>
              <a href="mailto:chsmadesimple@gmail.com" className="contact-value">
                chsmadesimple@gmail.com
              </a>
            </div>
          </div>

          <a href="#address-form" className="btn-primary contact-cta">
            {t('common.getYourOffer')}
          </a>
        </div>
      </div>
    </section>
  );
}
