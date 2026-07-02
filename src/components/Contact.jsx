import './Contact.css';

export default function Contact() {
  return (
    <section className="section contact" id="contact">
      <div className="container">
        <div className="contact-card" id="about">
          <span className="eyebrow">Contact</span>
          <h2 className="section-title">Ready when you are</h2>
          <p className="contact-statement">
            Have questions before sharing your address? Reach out, and a member
            of our team will walk you through our cash purchase process. There
            is no pressure and no obligation.
          </p>

          <div className="contact-details">
            <div className="contact-item">
              <span className="contact-label">Phone</span>
              <a href="tel:+17372050102" className="contact-value">
                (+1) 737 205 0102
              </a>
            </div>
            <div className="contact-item">
              <span className="contact-label">Email</span>
              <a href="mailto:chsmadesimple@gmail.com" className="contact-value">
                chsmadesimple@gmail.com
              </a>
            </div>
          </div>

          <a href="#address-form" className="btn-primary contact-cta">
            Get Your Offer
          </a>
        </div>
      </div>
    </section>
  );
}
