# Cornerstone Home Solutions Landing Page

A responsive light and dark theme landing page for a real-estate home-buying company.
Built with React + Vite, plain CSS, Google Places address verification, Formspree lead delivery,
and Firebase-backed homepage stats.

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

```text
cornerstone-home-solutions/
|-- index.html
|-- package.json
|-- vite.config.js
|-- README.md
`-- src/
    |-- main.jsx              # React entry point
    |-- App.jsx               # Page composition and hash admin route
    |-- index.css             # Design tokens, reset, shared styles
    |-- hooks/
    |   `-- useHomepageStats.js       # Firestore stats subscription with zero fallback
    |-- lib/
    |   |-- firebase.js               # Firebase client setup
    |   `-- homepageStats.js          # Stats normalization and display formatting
    `-- components/
        |-- Header.jsx / .css          # Nav bar, theme selector, mobile menu
        |-- Hero.jsx / .css            # Two-column hero
        |-- AddressForm.jsx / .css     # Validated address form
        |-- AdminDashboard.jsx / .css  # Private Firebase admin dashboard
        |-- StatisticsPanel.jsx / .css # "Property Review Status" card
        |-- HowItWorks.jsx / .css      # Three numbered steps
        |-- Benefits.jsx / .css        # "Why Choose Us" grid
        |-- Contact.jsx / .css         # Contact card + CTA
        `-- Footer.jsx / .css          # Legal links, disclaimer, copyright
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
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## Admin dashboard

Admin URL:

```text
https://b1issful.github.io/cornerstone-home-solutions/#/admin
```

The dashboard uses Firebase Google sign-in and only allows this email to edit stats:

```text
chsmadesimple@gmail.com
```

The homepage reads this Firestore document:

```text
siteSettings/homepageStats
```

Fields:

```text
propertiesReviewed: number
estimatedTimelineDays: number
estimatedCashOffer: number
reviewCompletePercent: number
updatedAt: server timestamp
updatedBy: string
```

If Firebase is not configured, unavailable, or the document does not exist, the public homepage
falls back to zeros.

## Firestore rules

Paste the contents of `firestore.rules` into Firebase Console. The rules allow public reads for
`siteSettings/homepageStats` and writes only from `chsmadesimple@gmail.com`.

## Accessibility

- Semantic landmarks (`header`, `main`, `section`, `footer`, `nav`)
- Labeled form fields, visible focus styles, keyboard-navigable menu and theme selector
- `aria-expanded` / `aria-controls` on the mobile menu toggle
- Respects `prefers-reduced-motion`
