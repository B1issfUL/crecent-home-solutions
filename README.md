# Crescent Home Solutions — Landing Page

A responsive, dark-themed landing page for a real-estate home-buying company.
Built with React + Vite, plain CSS, Google Places address verification, and Formspree lead delivery.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints.

To build for production:

```bash
npm run build
npm run preview
```

## Structure

```
crescent-home-solutions/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Page composition
    ├── index.css             # Design tokens, reset, shared styles
    └── components/
        ├── Header.jsx / .css          # Nav bar + mobile hamburger menu
        ├── Hero.jsx / .css            # Two-column hero
        ├── AddressForm.jsx / .css     # Validated address form
        ├── StatisticsPanel.jsx / .css # "Property Review Status" card
        ├── HowItWorks.jsx / .css      # Three numbered steps
        ├── Benefits.jsx / .css        # "Why Choose Us" grid
        ├── Contact.jsx / .css         # Contact card + CTA
        └── Footer.jsx / .css          # Legal links, disclaimer, copyright
```

## Form behavior

- The first step requires a Google Places verified property address, phone number, and email address.
- The "Get My Offer" button stays disabled until all three first-step fields are valid.
- The final Formspree submission includes the verified address, Google Place ID, phone, email, name, preferred contact method, property details, and consent.
- The success message appears only after Formspree confirms a successful submission.
- Feedback is announced to screen readers via an `aria-live` region.

## Environment

Copy `.env.example` to `.env.local` for local development and set:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
VITE_FORMSPREE_FORM_ID=your_formspree_form_id
```

## Accessibility

- Semantic landmarks (`header`, `main`, `section`, `footer`, `nav`)
- Labeled form field, visible focus styles, keyboard-navigable menu
- `aria-expanded` / `aria-controls` on the mobile menu toggle
- Respects `prefers-reduced-motion`
