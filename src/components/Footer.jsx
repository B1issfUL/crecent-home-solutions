import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <span className="footer-brand">Cornerstone Home Solutions</span>
          <nav aria-label="Legal">
            <ul className="footer-links">
              <li>
                <a href="#top" className="footer-link">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#top" className="footer-link">
                  Terms
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="footer-disclaimer">
          Submitting an address does not guarantee an offer. Property
          information must be reviewed before any purchase terms are provided.
        </p>

        <p className="footer-copyright">
          &copy; {year} Cornerstone Home Solutions. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
