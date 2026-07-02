import './Benefits.css';

const BENEFITS = [
  {
    title: 'Sell As-Is',
    description:
      'No repairs, no cleaning, no staging. We buy properties for cash in their current condition.',
  },
  {
    title: 'Choose Your Closing Date',
    description:
      'Close in weeks or take the time you need. The timeline is always up to you.',
  },
  {
    title: 'No Agent Commissions',
    description:
      'Work with us directly and keep more of your money. There are no listing fees.',
  },
  {
    title: 'Simple Process',
    description:
      'One address, one review, one cash offer. No open houses and no drawn-out negotiations.',
  },
];

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
  return (
    <section className="section benefits" id="solutions">
      <div className="container">
        <span className="eyebrow">Solutions</span>
        <h2 className="section-title">Why Choose Us</h2>
        <p className="section-subtitle">
          A direct sale built around what works for you, not the market.
        </p>

        <div className="benefits-grid">
          {BENEFITS.map((benefit) => (
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
