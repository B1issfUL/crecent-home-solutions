import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import './AddressForm.css';

const PHONE_DISPLAY = '(+1) 737 205 0102';
const PHONE_HREF = 'tel:+17372050102';
const FORM_SUBJECT = 'New Cash Home Seller Lead';
const SUBMISSION_COOLDOWN_MS = 60_000;
const MIN_REVIEW_TIME_MS = 2_000;

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

      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        libraries: 'places',
        v: 'weekly',
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.dataset.chsGoogleMaps = 'true';
      script.addEventListener('load', () => resolve(window.google), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

function getAddressComponent(components, type, key = 'longText') {
  const component = components.find((item) => item.types?.includes(type));
  return component?.[key] || '';
}

function normalizePlace(place) {
  const addressComponents = Array.from(place.addressComponents || []);
  const countryShort = getAddressComponent(addressComponents, 'country', 'shortText');
  const city =
    getAddressComponent(addressComponents, 'locality') ||
    getAddressComponent(addressComponents, 'postal_town') ||
    getAddressComponent(addressComponents, 'sublocality') ||
    getAddressComponent(addressComponents, 'administrative_area_level_3');
  const latitude =
    typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat;
  const longitude =
    typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng;

  const normalized = {
    formattedAddress: place.formattedAddress || '',
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
      nextErrors.property_address = 'Please select a complete property address from the suggestions.';
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
  const [verifiedAddress, setVerifiedAddress] = useState(null);
  const [addressTouched, setAddressTouched] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState({ phone: false, email: false });
  const [startAttempted, setStartAttempted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const autocompleteHostRef = useRef(null);
  const autocompleteElementRef = useRef(null);
  const selectionInProgressRef = useRef(false);
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
      setAddressError('Address search is temporarily unavailable. Please try again or call.');
      return;
    }

    let cancelled = false;
    let autocompleteElement;

    const clearVerifiedAddress = () => {
      if (selectionInProgressRef.current) return;
      setVerifiedAddress(null);
      setAddressTouched(true);
      setAddressError('Select your property address from the suggestions before continuing.');
    };

    const handlePlaceSelect = async (event) => {
      selectionInProgressRef.current = true;

      try {
        const prediction = event.placePrediction || event.detail?.placePrediction;
        const placeFromEvent = event.place || event.detail?.place;
        const place = prediction?.toPlace ? prediction.toPlace() : placeFromEvent;

        if (!place) {
          clearVerifiedAddress();
          return;
        }

        await place.fetchFields({
          fields: ['id', 'formattedAddress', 'addressComponents', 'location'],
        });

        if (cancelled) return;

        const normalizedPlace = normalizePlace(place);
        setVerifiedAddress(normalizedPlace.isValid ? normalizedPlace : null);
        setAddressTouched(true);
        setAddressError(
          normalizedPlace.isValid
            ? ''
            : 'Please select a complete property address from the suggestions.',
        );
      } catch {
        if (!cancelled) {
          setVerifiedAddress(null);
          setAddressError('Please select a complete property address from the suggestions.');
        }
      } finally {
        window.setTimeout(() => {
          selectionInProgressRef.current = false;
        }, 0);
      }
    };

    loadGoogleMaps(googleMapsApiKey)
      .then(async () => {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');

        if (cancelled || !autocompleteHostRef.current) return;

        autocompleteElement = new PlaceAutocompleteElement();
        autocompleteElement.id = 'property-address';
        autocompleteElement.setAttribute('aria-describedby', 'address-error privacy-note');
        autocompleteElement.setAttribute('aria-label', 'Property Address');
        autocompleteElement.setAttribute('placeholder', 'Enter your property address');
        autocompleteElement.includedRegionCodes = ['us'];
        autocompleteElement.includedPrimaryTypes = ['street_address', 'premise', 'subpremise'];

        autocompleteElement.addEventListener('input', clearVerifiedAddress);
        autocompleteElement.addEventListener('gmp-select', handlePlaceSelect);
        autocompleteElement.addEventListener('gmp-placeselect', handlePlaceSelect);

        autocompleteHostRef.current.replaceChildren(autocompleteElement);
        autocompleteElementRef.current = autocompleteElement;
        setMapsStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setMapsStatus('error');
        setAddressError('Address search is temporarily unavailable. Please try again or call.');
      });

    return () => {
      cancelled = true;
      autocompleteElement?.removeEventListener('input', clearVerifiedAddress);
      autocompleteElement?.removeEventListener('gmp-select', handlePlaceSelect);
      autocompleteElement?.removeEventListener('gmp-placeselect', handlePlaceSelect);
    };
  }, [googleMapsApiKey]);

  const phoneError =
    (touched.phone || startAttempted) && !phoneValid
      ? 'Please enter a valid phone number with at least 10 digits.'
      : '';
  const emailError =
    (touched.email || startAttempted) && !emailValid ? 'Please enter a valid email address.' : '';

  const displayedAddressError =
    addressError ||
    (startAttempted && !addressValid ? 'Please select a complete property address from the suggestions.' : '');
  const addressSearchUnavailable = displayedAddressError.startsWith('Address search is temporarily unavailable');

  const focusFirstInvalidField = () => {
    if (!addressValid) {
      autocompleteElementRef.current?.focus?.();
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
    window.setTimeout(() => autocompleteElementRef.current?.focus?.(), 0);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setSuccessMessageVisible(true);
    setVerifiedAddress(null);
    setAddressTouched(false);
    setAddressError('');
    setPhone('');
    setEmail('');
    setTouched({ phone: false, email: false });
    setStartAttempted(false);
    window.setTimeout(() => getOfferButtonRef.current?.focus(), 0);
  };

  return (
    <div className="address-form-wrap" id="address-form">
      <form className="address-form lead-intake-form" onSubmit={handleStartSubmit} noValidate>
        <div className="lead-intake-grid">
          <div className="lead-field lead-address-field">
            <label htmlFor="property-address">Property Address</label>
            <div
              className={`input-shell places-shell ${displayedAddressError ? 'input-shell-error' : ''}`}
            >
              <LocationIcon />
              <div className="places-autocomplete-host" ref={autocompleteHostRef}>
                <span className="places-loading">
                  {mapsStatus === 'loading' ? 'Loading address search...' : 'Address search unavailable'}
                </span>
              </div>
            </div>
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
