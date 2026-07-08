import { useLanguage } from '../i18n/LanguageContext.jsx';
import './Footer.css';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <span className="footer-brand">{t('common.brand')}</span>
          <nav aria-label={t('nav.legalAria')}>
            <ul className="footer-links">
              <li>
                <a href="#top" className="footer-link">
                  {t('footer.privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="#top" className="footer-link">
                  {t('footer.terms')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="footer-disclaimer">
          {t('footer.disclaimer')}
        </p>

        <p className="footer-copyright">
          &copy; {year} {t('common.brand')}. {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
