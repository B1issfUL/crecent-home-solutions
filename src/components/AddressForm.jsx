import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import './AddressForm.css';

const PHONE_DISPLAY = '(+1) 737 205 0102';
const PHONE_HREF = 'tel:+17372050102';
const FORM_SUBJECT = 'New Cash Home Seller Lead';
const SUBMISSION_COOLDOWN_MS = 60_000;
const MIN_REVIEW_TIME_MS = 2_000;
const ADDRESS_INCOMPLETE_MESSAGE =
  'Please select a complete property address from the suggestions.';
const ADDRESS_UNAVAILABLE_MESSAGE =
  'Address search is temporarily unavailable. Please try again or call (+1) 737 205 0102.';
const ADDRESS_SUGGESTIONS_ID = 'property-address-suggestions';

const FORM_DEFAULTS = {
  name: '',
  phone: '',
  email: '',
  preferred_contact: 'Phone Call',
  property_details: '',
  contact_consent: false,
  _gotcha: '',
};

let googleMapsPromise;

function LocationIcon() {
  return (
    <svg
      className="input-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-chs-google-maps]');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const callbackName = '__chsGoogleMapsLoaded';
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
        libraries: 'places',
        callback: callbackName,
      });
      const timeout = window.setTimeout(() => {
        reject(new Error('Google Maps did not finish loading.'));
      }, 12000);

      window[callbackName] = () => {
        window.clearTimeout(timeout);
        delete window[callbackName];
        resolve(window.google);
      };

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.dataset.chsGoogleMaps = 'true';
      script.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeout);
          delete window[callbackName];
          reject(new Error('Google Maps could not load.'));
        },
        { once: true },
      );
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

function getAddressComponent(components, type, key = 'longText') {
  const component = components.find((item) => item.types?.includes(type));
  return component?.[key] || component?.long_name || component?.short_name || '';
}

function normalizePlace(place) {
  const addressComponents = Array.from(place.addressComponents || place.address_components || []);
  const countryShort = getAddressComponent(addressComponents, 'country', 'shortText');
  const city =
    getAddressComponent(addressComponents, 'locality') ||
    getAddressComponent(addressComponents, 'postal_town') ||
    getAddressComponent(addressComponents, 'sublocality') ||
    getAddressComponent(addressComponents, 'administrative_area_level_2') ||
    getAddressComponent(addressComponents, 'administrative_area_level_3');
  const latitude =
    typeof place.location?.lat === 'function'
      ? place.location.lat()
      : place.location?.lat || place.location?.latitude;
  const longitude =
    typeof place.location?.lng === 'function'
      ? place.location.lng()
      : place.location?.lng || place.location?.longitude;

  const normalized = {
    formattedAddress: place.formattedAddress || place.formatted_address || '',
    placeId: place.id || place.placeId || place.place_id || '',
    streetNumber: getAddressComponent(addressComponents, 'street_number'),
    streetName: getAddressComponent(addressComponents, 'route'),
    city,
    state: getAddressComponent(addressComponents, 'administrative_area_level_1', 'shortText'),
    zip: getAddressComponent(addressComponents, 'postal_code'),
    country: countryShort,
    latitude: latitude ?? '',
    longitude: longitude ?? '',
  };

  normalized.isValid =
    Boolean(normalized.formattedAddress) &&
    Boolean(normalized.placeId) &&
    normalized.country === 'US' &&
    Boolean(normalized.streetNumber) &&
    Boolean(normalized.streetName) &&
    Boolean(normalized.city) &&
    Boolean(normalized.state) &&
    Boolean(normalized.zip);

  return normalized;
}

function getPredictionText(prediction) {
  return (
    prediction?.text?.toString?.() ||
    prediction?.structuredFormat?.mainText?.toString?.() ||
    prediction?.description ||
    ''
  );
}

function getDigits(value) {
  return value.replace(/\D/g, '');
}

function isValidPhone(value) {
  const trimmed = value.trim();
  const digits = getDigits(trimmed);
  return (
    digits.length >= 10 &&
    digits.length <= 15 &&
    !/[A-Za-z]/.test(trimmed) &&
    /^[+()\-\s.\d]+$/.test(trimmed)
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
}

function FormspreeLeadModal(props) {
  const [state, handleFormspreeSubmit, resetFormspree] = useForm(props.formspreeFormId);

  return (
    <LeadModal
      {...props}
      formspreeConfigured
      formspreeState={state}
      handleFormspreeSubmit={handleFormspreeSubmit}
      resetFormspree={resetFormspree}
    />
  );
}

function LeadModal(props) {
  const {
    verifiedAddress,
    initialPhone,
    initialEmail,
    onClose,
    onChangeAddress,
    onSuccess,
    formspreeConfigured = false,
    formspreeState = { errors: null, submitting: false, succeeded: false },
    handleFormspreeSubmit,
    resetFormspree,
  } = props;

  const [fields, setFields] = useState({
    ...FORM_DEFAULTS,
    phone: initialPhone,
    email: initialEmail,
  });
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [reviewReady, setReviewReady] = useState(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const fieldRefs = {
    name: firstInputRef,
    phone: useRef(null),
    email: useRef(null),
    preferred_contact: useRef(null),
    contact_consent: useRef(null),
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setReviewReady(true), MIN_REVIEW_TIME_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!formspreeState.succeeded) return;

    resetFormspree?.();
    setFields({ ...FORM_DEFAULTS });
    onSuccess();
  }, [formspreeState.succeeded, onSuccess, resetFormspree]);

  useEffect(() => {
    if (formspreeState.errors) {
      setSubmitMessage('send_failed');
    }
  }, [formspreeState.errors]);

  const handleFieldChange = (event) => {
    const { name, type, value, checked } = event.target;

    setFields((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitMessage('');
  };

  const validateLead = () => {
    const nextErrors = {};

    if (!verifiedAddress?.isValid) {
      nextErrors.property_address = ADDRESS_INCOMPLETE_MESSAGE;
    }

    if (fields.name.trim().length < 2) {
      nextErrors.name = 'Please enter your full name.';
    }

    if (!isValidPhone(fields.phone)) {
      nextErrors.phone = 'Please enter a valid phone number with at least 10 digits.';
    }

    if (!isValidEmail(fields.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!fields.preferred_contact) {
      nextErrors.preferred_contact = 'Please choose how you prefer to be contacted.';
    }

    if (!fields.contact_consent) {
      nextErrors.contact_consent =
        'Please agree that Crescent Home Solutions may contact you about this property.';
    }

    return nextErrors;
  };

  const focusFirstLeadError = (nextErrors) => {
    const firstErrorField = [
      'name',
      'phone',
      'email',
      'preferred_contact',
      'contact_consent',
    ].find((field) => nextErrors[field]);

    if (firstErrorField) {
      fieldRefs[firstErrorField]?.current?.focus();
    }
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();

    if (formspreeState.submitting) return;

    const nextErrors = validateLead();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstLeadError(nextErrors);
      return;
    }

    if (!reviewReady) {
      setSubmitMessage('Please take a moment to review your information before submitting.');
      return;
    }

    const now = Date.now();
    const lastSubmission = Number(window.sessionStorage.getItem('chs_last_submission_at') || 0);

    if (lastSubmission && now - lastSubmission < SUBMISSION_COOLDOWN_MS) {
      setSubmitMessage('Please wait before sending another request.');
      return;
    }

    if (!formspreeConfigured || !handleFormspreeSubmit) {
      setSubmitMessage('send_failed');
      return;
    }

    window.sessionStorage.setItem('chs_last_submission_at', String(now));
    await handleFormspreeSubmit(event);
  };

  const submitDisabled = formspreeState.submitting || !reviewReady || !formspreeConfigured;

  return (
    <div className="lead-modal-backdrop" role="presentation">
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        ref={modalRef}
      >
        <div className="lead-modal-header">
          <div>
            <span className="lead-modal-kicker">Next Step</span>
            <h2 id="lead-modal-title">Where should we contact you?</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
            x
          </button>
        </div>

        <form className="lead-details-form" onSubmit={handleLeadSubmit} noValidate>
          <input type="hidden" name="subject" value={FORM_SUBJECT} />
          <input type="hidden" name="property_address" value={verifiedAddress.formattedAddress} />
          <input type="hidden" name="google_place_id" value={verifiedAddress.placeId} />
          <input type="hidden" name="address_street_number" value={verifiedAddress.streetNumber} />
          <input type="hidden" name="address_route" value={verifiedAddress.streetName} />
          <input type="hidden" name="address_city" value={verifiedAddress.city} />
          <input type="hidden" name="address_state" value={verifiedAddress.state} />
          <input type="hidden" name="address_postal_code" value={verifiedAddress.zip} />
          <input type="hidden" name="address_country" value={verifiedAddress.country} />
          <input type="hidden" name="address_latitude" value={verifiedAddress.latitude} />
          <input type="hidden" name="address_longitude" value={verifiedAddress.longitude} />

          <label className="lead-field">
            <span>Property Address</span>
            <input
              type="text"
              value={verifiedAddress.formattedAddress}
              readOnly
              aria-describedby="property-address-review-note"
            />
          </label>
          <p id="property-address-review-note" className="field-note">
            To change the address, choose a new suggestion from the address search.
          </p>
          <button type="button" className="text-button" onClick={onChangeAddress}>
            Change address
          </button>

          <label className="lead-field" htmlFor="lead-name">
            <span>Full Name</span>
            <input
              id="lead-name"
              ref={firstInputRef}
              name="name"
              type="text"
              required
              autoComplete="name"
              value={fields.name}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'lead-name-error' : undefined}
            />
          </label>
          {errors.name && (
            <p className="feedback-error" id="lead-name-error">
              {errors.name}
            </p>
          )}
          <ValidationError className="feedback-error" prefix="Name" field="name" errors={formspreeState.errors} />

          <label className="lead-field" htmlFor="lead-phone">
            <span>Phone Number</span>
            <input
              id="lead-phone"
              ref={fieldRefs.phone}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={fields.phone}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
            />
          </label>
          {errors.phone && (
            <p className="feedback-error" id="lead-phone-error">
              {errors.phone}
            </p>
          )}
          <ValidationError className="feedback-error" prefix="Phone" field="phone" errors={formspreeState.errors} />

          <label className="lead-field" htmlFor="lead-email">
            <span>Email Address</span>
            <input
              id="lead-email"
              ref={fieldRefs.email}
              name="email"
              type="email"
              required
              autoComplete="email"
              value={fields.email}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'lead-email-error' : undefined}
            />
          </label>
          {errors.email && (
            <p className="feedback-error" id="lead-email-error">
              {errors.email}
            </p>
          )}
          <ValidationError className="feedback-error" prefix="Email" field="email" errors={formspreeState.errors} />

          <label className="lead-field" htmlFor="preferred-contact">
            <span>Preferred Contact Method</span>
            <select
              id="preferred-contact"
              ref={fieldRefs.preferred_contact}
              name="preferred_contact"
              required
              value={fields.preferred_contact}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.preferred_contact)}
              aria-describedby={errors.preferred_contact ? 'preferred-contact-error' : undefined}
            >
              <option>Phone Call</option>
              <option>Text Message</option>
              <option>Email</option>
            </select>
          </label>
          {errors.preferred_contact && (
            <p className="feedback-error" id="preferred-contact-error">
              {errors.preferred_contact}
            </p>
          )}

          <label className="lead-field" htmlFor="property-details">
            <span>Additional Property Details</span>
            <textarea
              id="property-details"
              name="property_details"
              placeholder="Tell us anything we should know about the property."
              value={fields.property_details}
              onChange={handleFieldChange}
              rows="4"
            />
          </label>

          <input
            type="text"
            name="_gotcha"
            tabIndex="-1"
            autoComplete="off"
            className="honeypot-field"
            value={fields._gotcha}
            onChange={handleFieldChange}
          />

          <label className="consent-field" htmlFor="contact-consent">
            <input
              id="contact-consent"
              ref={fieldRefs.contact_consent}
              name="contact_consent"
              type="checkbox"
              required
              checked={fields.contact_consent}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.contact_consent)}
              aria-describedby={errors.contact_consent ? 'contact-consent-error' : undefined}
            />
            <span>
              I agree that Crescent Home Solutions may contact me about this property using the
              information I provided.
            </span>
          </label>
          {errors.contact_consent && (
            <p className="feedback-error" id="contact-consent-error">
              {errors.contact_consent}
            </p>
          )}

          {!formspreeConfigured && (
            <p className="feedback-error">
              Form submissions are not configured yet. Add the Formspree form ID before accepting
              leads.
            </p>
          )}

          {submitMessage && (
            <p className="feedback-error" aria-live="polite">
              {submitMessage === 'send_failed' ? (
                <>
                  We could not send your information. Please try again or call{' '}
                  <a href={PHONE_HREF} className="inline-link">
                    {PHONE_DISPLAY}
                  </a>
                  .
                </>
              ) : (
                submitMessage
              )}
            </p>
          )}

          {formspreeState.errors && submitMessage !== 'send_failed' && (
            <p className="feedback-error" aria-live="polite">
              We could not send your information. Please try again or call{' '}
              <a href={PHONE_HREF} className="inline-link">
                {PHONE_DISPLAY}
              </a>
              .
            </p>
          )}

          <ValidationError className="feedback-error" errors={formspreeState.errors} />

          <button
            type="submit"
            className="btn-primary modal-submit"
            disabled={submitDisabled}
            aria-disabled={submitDisabled ? 'true' : 'false'}
          >
            {formspreeState.submitting ? 'Sending...' : 'Submit Information'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AddressForm() {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const formspreeFormId = import.meta.env.VITE_FORMSPREE_FORM_ID;
  const [mapsStatus, setMapsStatus] = useState(googleMapsApiKey ? 'loading' : 'error');
  const [placesLibrary, setPlacesLibrary] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [verifiedAddress, setVerifiedAddress] = useState(null);
  const [addressTouched, setAddressTouched] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [addressSelecting, setAddressSelecting] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState({ phone: false, email: false });
  const [startAttempted, setStartAttempted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const addressInputRef = useRef(null);
  const addressFieldWrapRef = useRef(null);
  const autocompleteSessionRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const getOfferButtonRef = useRef(null);

  const phoneValid = useMemo(() => isValidPhone(phone), [phone]);
  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const addressValid = Boolean(verifiedAddress?.isValid);
  const canContinue = mapsStatus === 'ready' && addressValid && phoneValid && emailValid;

  useEffect(() => {
    if (!googleMapsApiKey) {
      setMapsStatus('error');
      return;
    }

    let cancelled = false;

    loadGoogleMaps(googleMapsApiKey)
      .then(async () => {
        const places = await window.google.maps.importLibrary('places');
        if (cancelled) return;
        setPlacesLibrary(places);
        setMapsStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setMapsStatus('error');
        setPlacesLibrary(null);
        setSuggestions([]);
        setSuggestionsOpen(false);
      });

    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey]);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (!addressFieldWrapRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('touchstart', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('touchstart', handleDocumentMouseDown);
    };
  }, []);

  useEffect(() => {
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    const query = addressText.trim();

    if (
      mapsStatus !== 'ready' ||
      !placesLibrary?.AutocompleteSuggestion ||
      !query ||
      query.length < 3 ||
      (addressValid && verifiedAddress?.formattedAddress === addressText)
    ) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      setSuggestionsLoading(false);
      return undefined;
    }

    setSuggestionsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        if (!autocompleteSessionRef.current && placesLibrary.AutocompleteSessionToken) {
          autocompleteSessionRef.current = new placesLibrary.AutocompleteSessionToken();
        }

        const response =
          await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ['us'],
            includedPrimaryTypes: ['street_address'],
            sessionToken: autocompleteSessionRef.current,
          });

        if (requestSequenceRef.current !== requestId) return;

        const nextSuggestions = (response?.suggestions || [])
          .map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            const text = getPredictionText(prediction);

            return prediction && text
              ? {
                  id: prediction.placeId || `address-suggestion-${requestId}-${index}`,
                  prediction,
                  text,
                }
              : null;
          })
          .filter(Boolean);

        setSuggestions(nextSuggestions);
        setSuggestionsOpen(nextSuggestions.length > 0);
        setActiveSuggestionIndex(nextSuggestions.length > 0 ? 0 : -1);
        setAddressError('');
      } catch {
        if (requestSequenceRef.current !== requestId) return;
        setSuggestions([]);
        setSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
        setAddressError(ADDRESS_UNAVAILABLE_MESSAGE);
      } finally {
        if (requestSequenceRef.current === requestId) {
          setSuggestionsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [addressText, addressValid, mapsStatus, placesLibrary, verifiedAddress]);

  const phoneError =
    (touched.phone || startAttempted) && !phoneValid
      ? 'Please enter a valid phone number with at least 10 digits.'
      : '';
  const emailError =
    (touched.email || startAttempted) && !emailValid ? 'Please enter a valid email address.' : '';

  const addressSearchUnavailable = addressError === ADDRESS_UNAVAILABLE_MESSAGE || mapsStatus === 'error';
  const displayedAddressError =
    addressSearchUnavailable && (addressTouched || startAttempted || addressText.trim())
      ? ADDRESS_UNAVAILABLE_MESSAGE
      : addressError ||
        ((addressTouched || startAttempted) && !addressValid ? ADDRESS_INCOMPLETE_MESSAGE : '');
  const activeSuggestionId =
    suggestionsOpen && activeSuggestionIndex >= 0
      ? `address-suggestion-${activeSuggestionIndex}`
      : undefined;
  const addressDescribedBy = [
    displayedAddressError ? 'address-error' : '',
    mapsStatus === 'loading' ? 'address-status' : '',
    addressSelecting ? 'address-verifying' : '',
    'privacy-note',
  ]
    .filter(Boolean)
    .join(' ');

  const focusFirstInvalidField = () => {
    if (!addressValid) {
      addressInputRef.current?.focus();
      return;
    }

    if (!phoneValid) {
      phoneRef.current?.focus();
      return;
    }

    if (!emailValid) {
      emailRef.current?.focus();
    }
  };

  const handleAddressChange = (event) => {
    const nextValue = event.target.value;
    setAddressText(nextValue);
    setSuccessMessageVisible(false);
    setAddressError('');
    setAddressTouched(false);

    if (verifiedAddress) {
      setVerifiedAddress(null);
      autocompleteSessionRef.current = null;
    }
  };

  const handleAddressBlur = () => {
    setAddressTouched(true);
  };

  const handleAddressFocus = () => {
    if (suggestions.length > 0 && !addressValid) {
      setSuggestionsOpen(true);
    }
  };

  const selectSuggestion = async (suggestion) => {
    if (!suggestion?.prediction) return;

    requestSequenceRef.current += 1;
    setAddressSelecting(true);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setAddressError('');

    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'formattedAddress', 'addressComponents', 'location'],
      });

      const normalizedPlace = normalizePlace(place);

      if (!normalizedPlace.isValid) {
        setVerifiedAddress(null);
        setAddressTouched(true);
        setAddressError(ADDRESS_INCOMPLETE_MESSAGE);
        return;
      }

      setVerifiedAddress(normalizedPlace);
      setAddressText(normalizedPlace.formattedAddress);
      setAddressTouched(true);
      setAddressError('');
      setSuggestions([]);
      autocompleteSessionRef.current = null;
    } catch {
      setVerifiedAddress(null);
      setAddressTouched(true);
      setAddressError(ADDRESS_UNAVAILABLE_MESSAGE);
    } finally {
      setAddressSelecting(false);
    }
  };

  const handleAddressKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (!suggestionsOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestionIndex]);
    }
  };

  const handleStartSubmit = (event) => {
    event.preventDefault();
    setStartAttempted(true);
    setSuccessMessageVisible(false);

    if (!canContinue) {
      focusFirstInvalidField();
      return;
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    window.setTimeout(() => getOfferButtonRef.current?.focus(), 0);
  };

  const handleChangeAddress = () => {
    closeModal();
    window.setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setSuccessMessageVisible(true);
    setAddressText('');
    setVerifiedAddress(null);
    setAddressTouched(false);
    setAddressError('');
    setPhone('');
    setEmail('');
    setTouched({ phone: false, email: false });
    setStartAttempted(false);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    autocompleteSessionRef.current = null;
    window.setTimeout(() => getOfferButtonRef.current?.focus(), 0);
  };

  return (
    <div className="address-form-wrap" id="address-form">
      <form className="address-form lead-intake-form" onSubmit={handleStartSubmit} noValidate>
        <div className="lead-intake-grid">
          <div className="lead-field lead-address-field">
            <label htmlFor="property-address">Property Address</label>
            <div ref={addressFieldWrapRef} className="address-field-wrap">
              <div
                className={`input-shell places-shell ${displayedAddressError ? 'input-shell-error' : ''}`}
              >
                <LocationIcon />
                <input
                  id="property-address"
                  ref={addressInputRef}
                  className="address-input"
                  name="property_address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Enter your property address"
                  value={addressText}
                  onBlur={handleAddressBlur}
                  onChange={handleAddressChange}
                  onFocus={handleAddressFocus}
                  onKeyDown={handleAddressKeyDown}
                  aria-autocomplete="list"
                  aria-controls={ADDRESS_SUGGESTIONS_ID}
                  aria-expanded={suggestionsOpen ? 'true' : 'false'}
                  aria-activedescendant={activeSuggestionId}
                  aria-invalid={Boolean(displayedAddressError)}
                  aria-describedby={addressDescribedBy}
                />
              </div>

              {suggestionsOpen && suggestions.length > 0 && (
                <div
                  id={ADDRESS_SUGGESTIONS_ID}
                  className="address-suggestions"
                  role="listbox"
                  aria-label="Property address suggestions"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.id}-${suggestion.text}`}
                      id={`address-suggestion-${index}`}
                      type="button"
                      className={`address-suggestion ${
                        activeSuggestionIndex === index ? 'address-suggestion-active' : ''
                      }`}
                      role="option"
                      aria-selected={activeSuggestionIndex === index ? 'true' : 'false'}
                      tabIndex="-1"
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mapsStatus === 'loading' && (
              <p className="field-note address-status" id="address-status" role="status">
                Loading address search...
              </p>
            )}
            {suggestionsLoading && (
              <p className="field-note address-status" role="status">
                Searching addresses...
              </p>
            )}
            {addressSelecting && (
              <p className="field-note address-status" id="address-verifying" role="status">
                Verifying address...
              </p>
            )}
            {displayedAddressError && (
              <p className="feedback-error" id="address-error">
                {addressSearchUnavailable ? (
                  <>
                    Address search is temporarily unavailable. Please try again or call{' '}
                    <a href={PHONE_HREF} className="inline-link">
                      {PHONE_DISPLAY}
                    </a>
                    .
                  </>
                ) : (
                  displayedAddressError
                )}
              </p>
            )}
            {addressTouched && addressValid && (
              <p className="feedback-success compact">Address verified.</p>
            )}
          </div>

          <label className="lead-field" htmlFor="phone">
            <span>Phone Number</span>
            <input
              id="phone"
              ref={phoneRef}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
              onChange={(event) => {
                setPhone(event.target.value);
                setSuccessMessageVisible(false);
              }}
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? 'phone-error privacy-note' : 'privacy-note'}
            />
            {phoneError && (
              <p className="feedback-error" id="phone-error">
                {phoneError}
              </p>
            )}
          </label>

          <label className="lead-field" htmlFor="email">
            <span>Email Address</span>
            <input
              id="email"
              ref={emailRef}
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              onChange={(event) => {
                setEmail(event.target.value);
                setSuccessMessageVisible(false);
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'email-error privacy-note' : 'privacy-note'}
            />
            {emailError && (
              <p className="feedback-error" id="email-error">
                {emailError}
              </p>
            )}
          </label>
        </div>

        <p id="privacy-note" className="privacy-note">
          Your information will only be used to contact you about your property.
        </p>

        <button
          ref={getOfferButtonRef}
          type="submit"
          className="btn-primary form-submit"
          disabled={!canContinue}
          aria-disabled={!canContinue ? 'true' : 'false'}
        >
          Get My Offer
        </button>
      </form>

      <div id="form-feedback" role="status" aria-live="polite" className="form-feedback">
        {successMessageVisible && (
          <div className="feedback-success">
            <p>Thank you. We received your property information and will reach out soon.</p>
            <p>
              For immediate assistance, call{' '}
              <a href={PHONE_HREF} className="inline-link">
                {PHONE_DISPLAY}
              </a>
              .
            </p>
          </div>
        )}
      </div>

      {modalOpen && verifiedAddress && (
        formspreeFormId ? (
          <FormspreeLeadModal
            formspreeFormId={formspreeFormId}
            verifiedAddress={verifiedAddress}
            initialPhone={phone}
            initialEmail={email}
            onClose={closeModal}
            onChangeAddress={handleChangeAddress}
            onSuccess={handleSuccess}
          />
        ) : (
          <LeadModal
            verifiedAddress={verifiedAddress}
            initialPhone={phone}
            initialEmail={email}
            onClose={closeModal}
            onChangeAddress={handleChangeAddress}
            onSuccess={handleSuccess}
          />
        )
      )}
    </div>
  );
}
