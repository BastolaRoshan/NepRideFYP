import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, LogOut, Plus, Users } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { clearSessionAuth, getSessionToken, getStoredVerificationStatus, setSessionAuth } from '../utils/sessionAuth';

const palette = {
  bg: '#F6F1E8',
  shell: '#FFFDFC',
  card: '#FFFFFF',
  border: '#E7DFD0',
  accent: '#D4AF37',
  accentDark: '#A87A12',
  accentSoft: '#FFF6DD',
  text: '#171717',
  textSecondary: '#667085',
  approved: '#15803D',
  underReview: '#B45309',
  rejected: '#B91C1C',
  muted: '#94A3B8',
  surface: '#FBF8F1',
};

const VERIFICATION_STATUS_META = {
  NotSubmitted: { label: 'Unverified', bg: '#FFF7ED', text: '#B45309', border: '#FDBA74' },
  UnderReview: { label: 'Under Review', bg: '#FFF7ED', text: '#B45309', border: '#FDBA74' },
  Approved: { label: 'Approved', bg: '#ECFDF3', text: '#15803D', border: '#86EFAC' },
  Rejected: { label: 'Rejected', bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5' },
};

const VerificationPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [documentFiles, setDocumentFiles] = useState({});

  const currentStatus = verification?.verificationStatus || 'NotSubmitted';
  const statusMeta = VERIFICATION_STATUS_META[currentStatus] || VERIFICATION_STATUS_META.NotSubmitted;

  const getDocumentFieldName = (title) => {
    const normalized = String(title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const legacyLicensePattern = /drivinglicen[cs]e|licen[cs]e/;

    if (
      normalized.includes('citizenshipfront') ||
      normalized.includes('nagariktafront') ||
      normalized.includes('citizenshipf')
    ) {
      return 'citizenship_front';
    }

    if (
      normalized.includes('citizenshipback') ||
      normalized.includes('nagariktaback') ||
      normalized.includes('citizenshipb')
    ) {
      return 'citizenship_back';
    }

    if (legacyLicensePattern.test(normalized) || normalized.includes('license')) {
      return 'driving_license';
    }

    if (normalized.includes('bluebook') || normalized.includes('bluebok')) {
      return 'bluebook';
    }

    if (normalized.includes('citizenship') || normalized.includes('nagarikta') || normalized.includes('nagari')) {
      if (normalized.includes('back') || normalized.includes('rear') || normalized.includes('reverse')) {
        return 'citizenship_back';
      }
      return 'citizenship_front';
    }

    return normalized || 'document';
  };

  const fetchVerificationStatus = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [verificationResponse, profileResponse] = await Promise.all([
        apiFetch('/api/user/verification-status', {
          method: 'GET',
        }),
        apiFetch('/api/user/data', {
          method: 'GET',
        }),
      ]);

      const [verificationData, profileData] = await Promise.all([
        verificationResponse.json(),
        profileResponse.json(),
      ]);

      if (!verificationResponse.ok || !verificationData.success) {
        throw new Error(verificationData.message || 'Failed to fetch verification status');
      }

      const payload = verificationData.verification || null;
      setVerification(payload);
      setSessionAuth({
        token: getSessionToken(),
        verificationStatus: payload?.verificationStatus || 'NotSubmitted',
        isServiceAccessAllowed: Boolean(payload?.isServiceAccessAllowed),
      });

      if (profileResponse.ok && profileData?.success && profileData?.getAllUser) {
        const profile = profileData.getAllUser;
        const nextRole = String(profile.role || '').toLowerCase();

        setUserProfile({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          role: profile.role || '',
        });
        setSessionAuth({
          token: getSessionToken(),
          role: nextRole,
          verificationStatus: payload?.verificationStatus || 'NotSubmitted',
          isServiceAccessAllowed: Boolean(payload?.isServiceAccessAllowed),
          userName: profile.name || '',
        });
      } else {
        setUserProfile(null);
      }

    } catch (fetchError) {
      setError(fetchError.message || 'Unable to fetch verification details');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  const requiredDocuments = useMemo(() => {
    return Array.isArray(verification?.requiredDocuments) ? verification.requiredDocuments : [];
  }, [verification]);

  const existingDocumentsByKey = useMemo(() => {
    const map = {};
    const documents = Array.isArray(verification?.documents) ? verification.documents : [];

    documents.forEach((document) => {
      const key = getDocumentFieldName(document?.title);
      if (!key) return;
      map[key] = document;
    });

    return map;
  }, [verification]);

  const citizenshipFrontTitle = useMemo(
    () => requiredDocuments.find((title) => getDocumentFieldName(title) === 'citizenship_front') || '',
    [requiredDocuments]
  );

  const citizenshipBackTitle = useMemo(
    () => requiredDocuments.find((title) => getDocumentFieldName(title) === 'citizenship_back') || '',
    [requiredDocuments]
  );

  const hasCitizenshipSection = Boolean(citizenshipFrontTitle || citizenshipBackTitle);

  const otherRequiredDocuments = useMemo(
    () => requiredDocuments.filter((title) => {
      const key = getDocumentFieldName(title);
      return key !== 'citizenship_front' && key !== 'citizenship_back';
    }),
    [requiredDocuments]
  );

  const handleFileChange = (documentTitle, file) => {
    setDocumentFiles((prev) => ({
      ...prev,
      [documentTitle]: file || null,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const documents = requiredDocuments
      .map((title) => ({
        title,
        file: documentFiles[title] || null,
      }))
      .filter((item) => item.file);

    if (documents.length === 0) {
      setError('Please upload required document file(s) before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      documents.forEach((item) => {
        formData.append(getDocumentFieldName(item.title), item.file);
      });

      const response = await apiFetch('/api/user/verification-submit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit verification documents');
      }

      setMessage('Documents submitted successfully. Admin will review and approve/reject your verification.');
      setVerification(data.verification || null);
      setDocumentFiles({});
      setSessionAuth({
        token: getSessionToken(),
        verificationStatus: data?.verification?.verificationStatus || 'UnderReview',
        isServiceAccessAllowed: false,
      });
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit documents');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await globalThis.fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // no-op
    } finally {
      clearSessionAuth();
      navigate('/login', { replace: true });
    }
  };

  const shellStyle = {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top left, rgba(212,175,55,0.18), transparent 32%), linear-gradient(180deg, #FCFAF5 0%, #F6F1E8 100%)',
    color: palette.text,
  };

  const cardStyle = {
    backgroundColor: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: '18px',
    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.05)',
  };

  const badgeStyle = (meta) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    borderRadius: '999px',
    border: `1px solid ${meta.border}`,
    backgroundColor: meta.bg,
    color: meta.text,
    padding: '0.35rem 0.7rem',
    fontSize: '0.78rem',
    fontWeight: 700,
  });

  const actionButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    borderRadius: '12px',
    border: `1px solid ${palette.accent}`,
    backgroundColor: palette.accentSoft,
    color: palette.accentDark,
    padding: '0.68rem 1rem',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
  };

  return (
    <div style={shellStyle}>
      <nav
        style={{
          backgroundColor: palette.card,
          borderBottom: `1px solid ${palette.border}`,
          padding: '0.85rem 1.25rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #E9C96A 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#1A1A1A',
                flexShrink: 0,
              }}
            >
              <Car size={17} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', color: palette.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
              NepRide Vendor
            </h1>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'vehicles', label: 'Vehicles' },
              { key: 'bookings', label: 'Bookings' },
              { key: 'add_vehicle', label: 'Add Vehicle' },
            ].map((tab) => {
              const onClick = () => {
                if (tab.key === 'dashboard') navigate('/vendor-dashboard', { state: { activeTab: 'overview' } });
                if (tab.key === 'vehicles') navigate('/vendor-dashboard', { state: { activeTab: 'vehicles' } });
                if (tab.key === 'bookings') navigate('/vendor-dashboard', { state: { activeTab: 'bookings' } });
                if (tab.key === 'add_vehicle') navigate('/vendor-dashboard/add-vehicle');
              };

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={onClick}
                  style={{
                    border: tab.key === 'add_vehicle' ? '1px solid #D4AF37' : 'none',
                    borderRadius: '999px',
                    minHeight: '40px',
                    padding: '0.62rem 1rem',
                    backgroundColor: tab.key === 'add_vehicle' ? '#FFFFFF' : 'transparent',
                    color: tab.key === 'add_vehicle' ? '#A87A12' : '#6B7280',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.38rem',
                  }}
                >
                  {tab.key === 'add_vehicle' ? <Plus size={13} /> : null}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'nowrap' }}>
            <button
              type="button"
              style={{
                border: `1px solid ${palette.accentDark}`,
                backgroundColor: palette.accent,
                color: '#1A1A1A',
                borderRadius: '999px',
                minHeight: '40px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.38rem',
                cursor: 'default',
                boxShadow: '0 0 0 2px rgba(212,175,55,0.12) inset',
              }}
            >
              <Users size={13} /> Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: '1px solid #F3B0B0',
                backgroundColor: '#FFF7F7',
                color: palette.rejected,
                borderRadius: '999px',
                minHeight: '40px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.38rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem' }}>
        {loading ? (
          <div
            style={{
              ...cardStyle,
              padding: '2rem',
              textAlign: 'center',
              color: palette.textSecondary,
              marginBottom: '1rem',
            }}
          >
            Loading verification status...
          </div>
        ) : null}

        <section
          style={{
            ...cardStyle,
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF9EB 100%)',
          }}
        >
          <div style={{ marginBottom: '0.9rem' }}>
            <span style={badgeStyle({ bg: palette.accentSoft, text: palette.accentDark, border: '#F2D88C' })}>
              Profile
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: '2rem', lineHeight: 1.15, color: palette.text }}>Complete verification</h2>
          <p style={{ margin: '0.75rem 0 0', color: palette.textSecondary, fontSize: '0.98rem', maxWidth: '58rem' }}>
            You can register and login, but services remain locked until admin approval.
          </p>

        <div style={{ marginTop: 16, padding: '0.95rem 1rem', backgroundColor: palette.surface, borderRadius: 14, border: `1px solid ${palette.border}`, display: 'grid', gap: 8 }}>
          <strong style={{ color: palette.text }}>Your Account Details</strong>
          <span style={{ color: palette.textSecondary, fontSize: '0.92rem' }}>
            Name: {userProfile?.name || '-'}
          </span>
          <span style={{ color: palette.textSecondary, fontSize: '0.92rem' }}>
            Email: {userProfile?.email || '-'}
          </span>
          <span style={{ color: palette.textSecondary, fontSize: '0.92rem' }}>
            Phone: {userProfile?.phone || '-'}
          </span>
          <span style={{ color: palette.textSecondary, fontSize: '0.92rem' }}>
            Role: {userProfile?.role || '-'}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: '0.95rem 1rem',
            background: statusMeta.bg,
            color: statusMeta.text,
            borderRadius: 14,
            border: `1px solid ${statusMeta.border}`,
            display: 'grid',
            gap: 8,
          }}
        >
          <strong>Current Status: {statusMeta.label}</strong>
          {verification?.verificationSubmittedAt && (
            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Submitted on {new Date(verification.verificationSubmittedAt).toLocaleString()}
            </span>
          )}
        </div>

        {verification?.rejectedDocuments?.length > 0 && (
          <div style={{ marginTop: 12, padding: '0.85rem 1rem', background: '#FEF2F2', color: palette.rejected, borderRadius: 14, border: '1px solid #FCA5A5' }}>
            Rejected: {verification.rejectedDocuments.join(', ')}
          </div>
        )}

        {message && (
          <div style={{ marginTop: 12, padding: '0.85rem 1rem', background: '#ECFDF3', color: palette.approved, borderRadius: 14, border: '1px solid #86EFAC' }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '0.85rem 1rem', background: '#FEF2F2', color: palette.rejected, borderRadius: 14, border: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          {requiredDocuments.length === 0 ? (
            <p style={{ color: palette.textSecondary }}>No verification documents required for this role.</p>
          ) : (
            <>
              {otherRequiredDocuments.map((title) => {
                const key = getDocumentFieldName(title);
                const hasExisting = Boolean(existingDocumentsByKey[key]);

                return (
                  <div key={title} style={{ display: 'grid', gap: 6 }}>
                    <label htmlFor={title} style={{ fontWeight: 600, color: palette.text }}>{title}</label>
                    <input
                      id={title}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      required={!hasExisting}
                      onChange={(event) => handleFileChange(title, event.target.files?.[0] || null)}
                      style={{
                        width: '100%',
                        borderRadius: 10,
                        border: `1px solid ${palette.border}`,
                        background: '#FFFFFF',
                        color: palette.text,
                        padding: '0.7rem 0.8rem',
                      }}
                    />
                    {hasExisting && !documentFiles[title] && (
                      <span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
                        Existing file available: {existingDocumentsByKey[key]?.title}
                      </span>
                    )}
                    {documentFiles[title] && (
                      <span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>Selected: {documentFiles[title].name}</span>
                    )}
                  </div>
                );
              })}

              {hasCitizenshipSection && (
                <section
                  style={{
                    marginTop: 6,
                    padding: '1rem',
                    borderRadius: 12,
                    border: `1px solid ${palette.border}`,
                    background: palette.surface,
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', color: palette.text }}>Citizenship / Nagarikta</h2>
                    <p style={{ marginTop: 6, color: palette.textSecondary, fontSize: '0.9rem' }}>
                      Upload both front and back sides for identity verification.
                    </p>
                  </div>

                  {citizenshipFrontTitle && (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label htmlFor={citizenshipFrontTitle} style={{ fontWeight: 600 }}>
                        Front Side
                      </label>
                      <input
                        id={citizenshipFrontTitle}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        required={!existingDocumentsByKey.citizenship_front}
                        onChange={(event) => handleFileChange(citizenshipFrontTitle, event.target.files?.[0] || null)}
                        style={{
                          width: '100%',
                          borderRadius: 10,
                          border: `1px solid ${palette.border}`,
                          background: '#FFFFFF',
                          color: palette.text,
                          padding: '0.7rem 0.8rem',
                        }}
                      />
                      {existingDocumentsByKey.citizenship_front && !documentFiles[citizenshipFrontTitle] && (
                        <span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
                          Existing file available: {existingDocumentsByKey.citizenship_front?.title}
                        </span>
                      )}
                      {documentFiles[citizenshipFrontTitle] && (
                        <span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
                          Selected: {documentFiles[citizenshipFrontTitle].name}
                        </span>
                      )}
                    </div>
                  )}

                  {citizenshipBackTitle && (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label htmlFor={citizenshipBackTitle} style={{ fontWeight: 600 }}>
                        Back Side
                      </label>
                      <input
                        id={citizenshipBackTitle}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        required={!existingDocumentsByKey.citizenship_back}
                        onChange={(event) => handleFileChange(citizenshipBackTitle, event.target.files?.[0] || null)}
                        style={{
                          width: '100%',
                          borderRadius: 10,
                          border: `1px solid ${palette.border}`,
                          background: '#FFFFFF',
                          color: palette.text,
                          padding: '0.7rem 0.8rem',
                        }}
                      />
                      {existingDocumentsByKey.citizenship_back && !documentFiles[citizenshipBackTitle] && (
                        <span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
                          Existing file available: {existingDocumentsByKey.citizenship_back?.title}
                        </span>
                      )}
                      {documentFiles[citizenshipBackTitle] && (
                        <span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
                          Selected: {documentFiles[citizenshipBackTitle].name}
                        </span>
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={submitting || requiredDocuments.length === 0}
            style={{
              marginTop: 4,
              border: `1px solid ${palette.accentDark}`,
              borderRadius: 10,
              background: palette.accent,
              color: '#1A1A1A',
              padding: '0.7rem 0.9rem',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit verification documents'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 10,
            borderRadius: 8,
            border: `1px solid ${palette.rejected}`,
            background: '#FEF2F2',
            color: palette.rejected,
            padding: '0.5rem 0.8rem',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
        </section>
      </main>
    </div>
  );
};

export default VerificationPage;
