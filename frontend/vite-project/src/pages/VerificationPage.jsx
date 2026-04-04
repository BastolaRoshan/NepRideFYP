import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VERIFICATION_STATUS_META = {
  NotSubmitted: { label: 'Not Submitted', bg: '#1d2230', text: '#d3dcf8', border: '#2f3851' },
  UnderReview: { label: 'Under Review', bg: '#2b2210', text: '#ffd782', border: '#5b4a1e' },
  Approved: { label: 'Approved', bg: '#0d2a1a', text: '#b7ffd3', border: '#1f5f3e' },
  Rejected: { label: 'Rejected', bg: '#321019', text: '#ffdbe0', border: '#6a2838' },
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
        fetch('/api/user/verification-status', {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/api/user/data', {
          method: 'GET',
          credentials: 'include',
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
      localStorage.setItem('verificationStatus', payload?.verificationStatus || 'NotSubmitted');

      if (profileResponse.ok && profileData?.success && profileData?.getAllUser) {
        const profile = profileData.getAllUser;
        setUserProfile({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          role: profile.role || '',
        });
      } else {
        setUserProfile(null);
      }

      localStorage.setItem('isServiceAccessAllowed', payload?.isServiceAccessAllowed ? 'true' : 'false');
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

      const response = await fetch('/api/user/verification-submit', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit verification documents');
      }

      setMessage('Documents submitted successfully. Admin will review and approve/reject your verification.');
      setVerification(data.verification || null);
      setDocumentFiles({});
      localStorage.setItem('isServiceAccessAllowed', 'false');
      localStorage.setItem('verificationStatus', data?.verification?.verificationStatus || 'UnderReview');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit documents');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // no-op
    } finally {
      localStorage.removeItem('userRole');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('isServiceAccessAllowed');
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0f', color: '#fff', display: 'grid', placeItems: 'center' }}>
        Loading verification status...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0f', color: '#fff', padding: '2rem 1rem' }}>
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          background: '#111318',
          border: '1px solid #2a2d36',
          borderRadius: 14,
          padding: '1.25rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Complete verification</h1>
        <p style={{ marginTop: 8, color: '#b9bfd1' }}>
          You can register and login, but services remain locked until admin approval.
        </p>

        <div
          style={{
            marginTop: 12,
            padding: '0.8rem',
            background: '#0a0c11',
            borderRadius: 10,
            border: '1px solid #232733',
            display: 'grid',
            gap: 6,
          }}
        >
          <strong>Your Account Details</strong>
          <span style={{ color: '#d7dcef', fontSize: '0.9rem' }}>
            Name: {userProfile?.name || '-'}
          </span>
          <span style={{ color: '#d7dcef', fontSize: '0.9rem' }}>
            Email: {userProfile?.email || '-'}
          </span>
          <span style={{ color: '#d7dcef', fontSize: '0.9rem' }}>
            Phone: {userProfile?.phone || '-'}
          </span>
          <span style={{ color: '#d7dcef', fontSize: '0.9rem' }}>
            Role: {userProfile?.role || '-'}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: '0.8rem',
            background: statusMeta.bg,
            color: statusMeta.text,
            borderRadius: 10,
            border: `1px solid ${statusMeta.border}`,
            display: 'grid',
            gap: 6,
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
          <div style={{ marginTop: 12, padding: '0.7rem', background: '#2f0d14', color: '#ffd8dd', borderRadius: 10 }}>
            Rejected: {verification.rejectedDocuments.join(', ')}
          </div>
        )}

        {message && (
          <div style={{ marginTop: 12, padding: '0.7rem', background: '#0d2a1a', color: '#b7ffd3', borderRadius: 10 }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '0.7rem', background: '#321019', color: '#ffdbe0', borderRadius: 10 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          {requiredDocuments.length === 0 ? (
            <p style={{ color: '#b9bfd1' }}>No verification documents required for this role.</p>
          ) : (
            <>
              {otherRequiredDocuments.map((title) => {
                const key = getDocumentFieldName(title);
                const hasExisting = Boolean(existingDocumentsByKey[key]);

                return (
                  <div key={title} style={{ display: 'grid', gap: 6 }}>
                    <label htmlFor={title} style={{ fontWeight: 600 }}>{title}</label>
                    <input
                      id={title}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      required={!hasExisting}
                      onChange={(event) => handleFileChange(title, event.target.files?.[0] || null)}
                      style={{
                        width: '100%',
                        borderRadius: 10,
                        border: '1px solid #303544',
                        background: '#0b0d13',
                        color: '#fff',
                        padding: '0.7rem 0.8rem',
                      }}
                    />
                    {hasExisting && !documentFiles[title] && (
                      <span style={{ color: '#8cb3ff', fontSize: '0.85rem' }}>
                        Existing file available: {existingDocumentsByKey[key]?.title}
                      </span>
                    )}
                    {documentFiles[title] && (
                      <span style={{ color: '#b9bfd1', fontSize: '0.85rem' }}>Selected: {documentFiles[title].name}</span>
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
                    border: '1px solid #2d3342',
                    background: 'linear-gradient(135deg, #121824 0%, #0f131c 100%)',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Citizenship / Nagarikta</h2>
                    <p style={{ marginTop: 6, color: '#b9bfd1', fontSize: '0.9rem' }}>
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
                          border: '1px solid #303544',
                          background: '#0b0d13',
                          color: '#fff',
                          padding: '0.7rem 0.8rem',
                        }}
                      />
                      {existingDocumentsByKey.citizenship_front && !documentFiles[citizenshipFrontTitle] && (
                        <span style={{ color: '#8cb3ff', fontSize: '0.85rem' }}>
                          Existing file available: {existingDocumentsByKey.citizenship_front?.title}
                        </span>
                      )}
                      {documentFiles[citizenshipFrontTitle] && (
                        <span style={{ color: '#b9bfd1', fontSize: '0.85rem' }}>
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
                          border: '1px solid #303544',
                          background: '#0b0d13',
                          color: '#fff',
                          padding: '0.7rem 0.8rem',
                        }}
                      />
                      {existingDocumentsByKey.citizenship_back && !documentFiles[citizenshipBackTitle] && (
                        <span style={{ color: '#8cb3ff', fontSize: '0.85rem' }}>
                          Existing file available: {existingDocumentsByKey.citizenship_back?.title}
                        </span>
                      )}
                      {documentFiles[citizenshipBackTitle] && (
                        <span style={{ color: '#b9bfd1', fontSize: '0.85rem' }}>
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
              border: 'none',
              borderRadius: 10,
              background: '#ffca2b',
              color: '#121212',
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
          onClick={fetchVerificationStatus}
          style={{
            marginTop: 10,
            marginRight: 10,
            borderRadius: 8,
            border: '1px solid #353b4b',
            background: 'transparent',
            color: '#d7dcef',
            padding: '0.5rem 0.8rem',
            cursor: 'pointer',
          }}
        >
          Refresh status
        </button>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 10,
            borderRadius: 8,
            border: '1px solid #5a2430',
            background: 'transparent',
            color: '#ffb8c3',
            padding: '0.5rem 0.8rem',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;
