import AddressForm from './AddressForm.jsx';
import StatisticsPanel from './StatisticsPanel.jsx';
import './Hero.css';

const HERO_BENEFITS = ['No Closing Costs', 'No Repairs Required', 'No Obligation'];

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Fast and Simple Home Sales</span>
          <h1 className="hero-headline">
            Sell your home <span className="hero-highlight">as-is.</span>
            <br />
            On your timeline.
          </h1>
          <p className="hero-paragraph">
            We buy homes for cash with no repairs, cleaning, commissions, or long
            waiting periods. Enter your address below, and our team will review
            the information for a cash offer.
          </p>

          <AddressForm />

          <ul className="hero-benefits" aria-label="Key benefits">
            {HERO_BENEFITS.map((benefit) => (
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
