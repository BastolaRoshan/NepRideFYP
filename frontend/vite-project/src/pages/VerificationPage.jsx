import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VerificationPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState(null);
  const [documentFiles, setDocumentFiles] = useState({});

  const getDocumentFieldName = (title) => {
    const normalized = String(title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normalized.includes('drivinglicence') || normalized.includes('drivinglicense') || normalized.includes('licence') || normalized.includes('license')) {
      return 'driving_licence';
    }

    if (normalized.includes('bluebook') || normalized.includes('bluebok')) {
      return 'bluebook';
    }

    if (normalized.includes('citizenship') || normalized.includes('nagarikta') || normalized.includes('nagari')) {
      return 'citizenship';
    }

    return normalized || 'document';
  };

  const fetchVerificationStatus = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/verification-status', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch verification status');
      }

      const payload = data.verification || null;
      setVerification(payload);

      if (payload?.isServiceAccessAllowed) {
        localStorage.setItem('isServiceAccessAllowed', 'true');

        const role = String(payload?.role || '').toLowerCase();
        if (role === 'admin') {
          navigate('/admin-dashboard', { replace: true });
        } else if (role === 'vendor') {
          navigate('/vendor-dashboard', { replace: true });
        } else {
          navigate('/customer-dashboard', { replace: true });
        }
      } else {
        localStorage.setItem('isServiceAccessAllowed', 'false');
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

        <div style={{ marginTop: 12, padding: '0.7rem', background: '#0a0c11', borderRadius: 10, border: '1px solid #232733' }}>
          <strong>Status:</strong> {verification?.verificationStatus || 'NotSubmitted'}
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
            requiredDocuments.map((title) => (
              <div key={title} style={{ display: 'grid', gap: 6 }}>
                <label htmlFor={title} style={{ fontWeight: 600 }}>{title}</label>
                <input
                  id={title}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
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
                {documentFiles[title] && (
                  <span style={{ color: '#b9bfd1', fontSize: '0.85rem' }}>Selected: {documentFiles[title].name}</span>
                )}
              </div>
            ))
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
