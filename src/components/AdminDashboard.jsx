import { useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../lib/firebase.js';
import { DEFAULT_HOME_STATS, normalizeHomepageStats, toWholeNumber } from '../lib/homepageStats.js';
import './AdminDashboard.css';

const AUTHORIZED_ADMIN_EMAIL = 'chsmadesimple@gmail.com';
const SUCCESS_MESSAGE = 'Stats updated successfully.';
const FAILURE_MESSAGE = 'Could not update stats. Please try again.';

function getInitialFormValues() {
  return {
    propertiesReviewed: '0',
    estimatedTimelineDays: '0',
    estimatedCashOffer: '0',
    reviewCompletePercent: '0',
  };
}

function statsToFormValues(stats) {
  const normalizedStats = normalizeHomepageStats(stats);

  return {
    propertiesReviewed: String(normalizedStats.propertiesReviewed),
    estimatedTimelineDays: String(normalizedStats.estimatedTimelineDays),
    estimatedCashOffer: String(normalizedStats.estimatedCashOffer),
    reviewCompletePercent: String(normalizedStats.reviewCompletePercent),
  };
}

function sanitizeIntegerInput(value, maxValue) {
  const digitsOnly = value.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  const wholeNumber = toWholeNumber(digitsOnly);
  return String(typeof maxValue === 'number' ? Math.min(maxValue, wholeNumber) : wholeNumber);
}

function parseFormValues(values) {
  return {
    propertiesReviewed: toWholeNumber(values.propertiesReviewed),
    estimatedTimelineDays: toWholeNumber(values.estimatedTimelineDays),
    estimatedCashOffer: toWholeNumber(values.estimatedCashOffer),
    reviewCompletePercent: Math.min(100, toWholeNumber(values.reviewCompletePercent)),
  };
}

export default function AdminDashboard() {
  const services = useMemo(() => getFirebaseServices(), []);
  const configured = isFirebaseConfigured();
  const [authReady, setAuthReady] = useState(!configured);
  const [user, setUser] = useState(null);
  const [formValues, setFormValues] = useState(getInitialFormValues);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const authorized = Boolean(user?.email && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL);
  const statsRef = useMemo(
    () => (services?.db ? doc(services.db, 'siteSettings', 'homepageStats') : null),
    [services?.db],
  );

  useEffect(() => {
    if (!services?.auth) {
      return undefined;
    }

    return onAuthStateChanged(services.auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, [services?.auth]);

  useEffect(() => {
    if (!statsRef || !authorized) {
      return undefined;
    }

    return onSnapshot(
      statsRef,
      (snapshot) => {
        if (isDirty) return;

        const nextStats = snapshot.exists() ? normalizeHomepageStats(snapshot.data()) : DEFAULT_HOME_STATS;
        setFormValues(statsToFormValues(nextStats));
      },
      () => {
        if (!isDirty) {
          setFormValues(statsToFormValues(DEFAULT_HOME_STATS));
        }
      },
    );
  }, [authorized, isDirty, statsRef]);

  const handleSignIn = async () => {
    if (!services?.auth) return;

    setMessage('');

    try {
      await signInWithPopup(services.auth, new GoogleAuthProvider());
    } catch {
      setMessage('Could not sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    if (!services?.auth) return;

    await signOut(services.auth);
    setMessage('');
    setIsDirty(false);
    setFormValues(getInitialFormValues());
  };

  const handleFieldChange = (event) => {
    const { name, value, max } = event.target;
    const maxValue = max ? Number(max) : undefined;

    setFormValues((current) => ({
      ...current,
      [name]: sanitizeIntegerInput(value, maxValue),
    }));
    setMessage('');
    setIsDirty(true);
  };

  const saveStats = async (nextStats) => {
    if (!statsRef || !authorized || !user?.email) return;

    setIsSaving(true);
    setMessage('');

    try {
      await setDoc(
        statsRef,
        {
          ...nextStats,
          updatedAt: serverTimestamp(),
          updatedBy: user.email,
        },
        { merge: true },
      );
      setFormValues(statsToFormValues(nextStats));
      setIsDirty(false);
      setMessage(SUCCESS_MESSAGE);
    } catch {
      setMessage(FAILURE_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveStats(parseFormValues(formValues));
  };

  const handleReset = () => {
    saveStats(DEFAULT_HOME_STATS);
  };

  return (
    <main className="admin-page" id="top">
      <section className="admin-shell" aria-labelledby="admin-title">
        <div className="admin-header">
          <span className="eyebrow">Private Dashboard</span>
          <h1 id="admin-title">Cornerstone Admin</h1>
          <p>Update homepage stats</p>
        </div>

        {!configured && (
          <div className="admin-panel" role="status">
            <p className="admin-message error">
              Firebase is not configured yet. Add the Firebase environment variables to enable this
              dashboard.
            </p>
          </div>
        )}

        {configured && !authReady && (
          <div className="admin-panel" role="status">
            <p className="admin-message">Checking sign-in status...</p>
          </div>
        )}

        {configured && authReady && !user && (
          <div className="admin-panel">
            <p className="admin-copy">
              Sign in with Google to access the private admin dashboard.
            </p>
            <button type="button" className="btn-primary" onClick={handleSignIn}>
              Sign In With Google
            </button>
            {message && (
              <p className="admin-message error" aria-live="polite">
                {message}
              </p>
            )}
          </div>
        )}

        {configured && authReady && user && !authorized && (
          <div className="admin-panel">
            <p className="admin-message error" role="alert">
              You are not authorized to access this dashboard.
            </p>
            <button type="button" className="admin-secondary-button" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        )}

        {configured && authReady && user && authorized && (
          <form className="admin-panel admin-form" onSubmit={handleSubmit}>
            <div className="admin-account-row">
              <span>Signed in as {user.email}</span>
              <button type="button" className="admin-secondary-button" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>

            <label className="admin-field" htmlFor="propertiesReviewed">
              <span>Properties Reviewed</span>
              <input
                id="propertiesReviewed"
                name="propertiesReviewed"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={formValues.propertiesReviewed}
                onChange={handleFieldChange}
              />
            </label>

            <label className="admin-field" htmlFor="estimatedTimelineDays">
              <span>Estimated Timeline Days</span>
              <input
                id="estimatedTimelineDays"
                name="estimatedTimelineDays"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={formValues.estimatedTimelineDays}
                onChange={handleFieldChange}
              />
            </label>

            <label className="admin-field" htmlFor="estimatedCashOffer">
              <span>Estimated Cash Offer</span>
              <input
                id="estimatedCashOffer"
                name="estimatedCashOffer"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={formValues.estimatedCashOffer}
                onChange={handleFieldChange}
              />
            </label>

            <label className="admin-field" htmlFor="reviewCompletePercent">
              <span>Review Complete Percent</span>
              <input
                id="reviewCompletePercent"
                name="reviewCompletePercent"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="1"
                value={formValues.reviewCompletePercent}
                onChange={handleFieldChange}
              />
            </label>

            {message && (
              <p
                className={`admin-message ${message === SUCCESS_MESSAGE ? 'success' : 'error'}`}
                aria-live="polite"
              >
                {message}
              </p>
            )}

            <div className="admin-actions">
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset to Zero
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
