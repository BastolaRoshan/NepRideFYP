import { useState } from 'react';
import { ChevronRight, Search, X, Save } from 'lucide-react';

const palette = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  accent: '#D4AF37',
  text: '#111827',
  textSecondary: '#6B7280',
  approved: '#22C55E',
  underReview: '#F59E0B',
  rejected: '#EF4444',
  notSubmitted: '#9CA3AF',
};

const DocumentPreviewModal = ({
  user,
  onClose,
  onSaveVerification,
  loading,
  actionMessage,
}) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState(String(user?.documents?.[0]?._id || ''));
  const [verificationStatus, setVerificationStatus] = useState(user?.verificationStatus || 'NotSubmitted');
  const [verificationNote, setVerificationNote] = useState(user?.verificationNote || '');
  const [allowAccess, setAllowAccess] = useState(user?.isServiceAccessAllowed || false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const documents = Array.isArray(user?.documents) ? user.documents : [];
  const query = documentSearch.trim().toLowerCase();
  const filteredDocuments = query
    ? documents.filter((doc) => String(doc?.title || '').toLowerCase().includes(query))
    : documents;

  const selectedDocument =
    filteredDocuments.find((doc) => String(doc._id) === String(selectedDocumentId)) ||
    filteredDocuments[0] ||
    null;

  const normalizeDocumentUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : `/${raw}`;
  };

  const isImageDocument = (url) => {
    return /\.(jpg|jpeg|png|gif|webp|bmp|jfif)$/i.test(String(url || '').split('?')[0]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveVerification({
      userId: user._id,
      verificationStatus,
      verificationNote,
      shouldAllowAccess: allowAccess,
    });
    setSaving(false);
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '8px',
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.card,
    padding: '0.55rem 0.75rem',
    color: palette.text,
    fontSize: '0.85rem',
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return palette.approved;
      case 'Rejected':
        return palette.rejected;
      case 'UnderReview':
      case 'Pending':
        return palette.underReview;
      default:
        return palette.notSubmitted;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: '14px',
          maxWidth: '1120px',
          width: '100%',
          maxHeight: '90vh',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left Panel - Documents List */}
        <div style={{ borderRight: `1px solid ${palette.border}`, padding: '1.1rem', display: 'grid', gap: '0.85rem', gridAutoRows: 'max-content', backgroundColor: palette.card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: palette.text, fontSize: '1.9rem', fontWeight: 700 }}>User Documents</h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: palette.textSecondary,
                cursor: 'pointer',
                padding: '0.25rem',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <p style={{ margin: 0, color: palette.text, fontSize: '1.75rem', fontWeight: 700 }}>
              <strong>{user?.name}</strong>
            </p>
            <p style={{ margin: '0.2rem 0 0', color: palette.textSecondary, fontSize: '0.95rem' }}>
              {user?.email}
            </p>
            <p style={{ margin: '0.1rem 0 0', color: palette.textSecondary, fontSize: '0.95rem' }}>
              {user?.phone}
            </p>
          </div>

          <div
            style={{
              border: `1px solid ${palette.border}`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.65rem',
              backgroundColor: palette.card,
            }}
          >
            <Search size={15} color={palette.textSecondary} />
            <input
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder="Search by Name..."
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                backgroundColor: 'transparent',
                color: palette.text,
                fontSize: '0.9rem',
              }}
            />
          </div>

          {filteredDocuments.length === 0 ? (
            <div
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.border}`,
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                color: palette.textSecondary,
              }}
            >
              No documents submitted yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', overflowY: 'auto', maxHeight: '50vh', paddingRight: '0.15rem' }}>
              {filteredDocuments.map((doc) => {
                const isActive = String(selectedDocument?._id) === String(doc._id);
                const previewUrl = normalizeDocumentUrl(doc.url);
                const isImage = isImageDocument(previewUrl);

                return (
                  <button
                    key={doc._id}
                    onClick={() => setSelectedDocumentId(String(doc._id))}
                    style={{
                      backgroundColor: isActive ? '#FFF8E1' : palette.card,
                      border: isActive ? '1px solid #e5b949' : '1px solid #d6dae2',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      color: palette.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', minWidth: 0 }}>
                      {isImage ? (
                        <img
                          src={previewUrl}
                          alt={doc.title}
                          style={{
                            width: '52px',
                            height: '52px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid #d6dae2',
                            flexShrink: 0,
                          }}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '6px',
                            border: '1px solid #d6dae2',
                            backgroundColor: palette.bg,
                            display: 'grid',
                            placeItems: 'center',
                            color: palette.textSecondary,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          FILE
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: palette.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.title}
                        </p>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: getStatusColor(doc.status), fontWeight: 600 }}>
                          Status: {doc.status}
                        </p>
                      </div>
                    </div>

                    <ChevronRight size={16} color={isActive ? palette.accent : palette.textSecondary} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel - Preview & Controls */}
        <div
          style={{
            padding: '1.1rem',
            display: 'grid',
            gridTemplateRows: '1fr auto',
            gap: '0.8rem',
            overflowY: 'auto',
            backgroundColor: palette.card,
          }}
        >
          {/* Document Preview */}
          <div style={{ display: 'grid', gap: '1rem', overflowY: 'auto' }}>
            {selectedDocument ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: palette.text, fontSize: '1.55rem', fontWeight: 700 }}>
                    {selectedDocument.title}
                  </h3>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      color: getStatusColor(selectedDocument.status),
                      fontSize: '0.95rem',
                      fontWeight: 700,
                    }}
                  >
                    Status: {selectedDocument.status}
                  </p>
                </div>

                {/* Document Preview Container */}
                <div
                  style={{
                    backgroundColor: palette.bg,
                    border: `1px solid ${palette.border}`,
                    borderRadius: '8px',
                    padding: '0.85rem',
                    minHeight: '280px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflowY: 'auto',
                  }}
                >
                  {selectedDocument.url ? (
                    isImageDocument(normalizeDocumentUrl(selectedDocument.url)) ? (
                      <img
                        src={normalizeDocumentUrl(selectedDocument.url)}
                        alt={selectedDocument.title}
                        style={{
                          width: '100%',
                          maxHeight: '350px',
                          borderRadius: '8px',
                          objectFit: 'contain',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#fff',
                        }}
                      />
                    ) : (
                      <iframe
                        title={selectedDocument.title}
                        src={normalizeDocumentUrl(selectedDocument.url)}
                        style={{
                          width: '100%',
                          minHeight: '350px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          backgroundColor: '#fff',
                        }}
                      />
                    )
                  ) : (
                    <p style={{ color: palette.textSecondary }}>No document provided</p>
                  )}
                </div>

                {selectedDocument.note && (
                  <div
                    style={{
                      backgroundColor: palette.bg,
                      border: `1px solid ${palette.border}`,
                      borderRadius: '8px',
                      padding: '0.75rem',
                    }}
                  >
                    <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                      Admin Note:
                    </p>
                    <p style={{ margin: 0, color: palette.text, fontSize: '0.85rem' }}>
                      {selectedDocument.note}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px',
                  color: palette.textSecondary,
                  textAlign: 'center',
                }}
              >
                <p>Select a document to preview</p>
              </div>
            )}
          </div>

          {/* Verification Controls */}
          <div style={{ display: 'grid', gap: '0.75rem', borderTop: `1px solid ${palette.border}`, paddingTop: '0.9rem' }}>
            <div>
              <label style={{ color: palette.text, fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="NotSubmitted">Not Submitted</option>
                <option value="UnderReview">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label style={{ color: palette.text, fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Verification Note / Remarks
              </label>
              <textarea
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder="Add remarks for the user..."
                style={{
                  ...inputStyle,
                  minHeight: '64px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: palette.bg,
                border: `1px solid ${palette.border}`,
                borderRadius: '8px',
                padding: '0.75rem',
              }}
            >
              <input
                type="checkbox"
                id="allowAccess"
                checked={allowAccess}
                onChange={(e) => setAllowAccess(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="allowAccess"
                style={{ cursor: 'pointer', color: palette.text, fontSize: '0.9rem', margin: 0, fontWeight: 600 }}
              >
                Allow service access
              </label>
            </div>

            {actionMessage?.message && (
              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  border: actionMessage.isError ? `1px solid ${palette.rejected}60` : `1px solid ${palette.approved}60`,
                  backgroundColor: actionMessage.isError ? '#EF444415' : '#22C55E15',
                  color: actionMessage.isError ? palette.rejected : palette.approved,
                }}
              >
                {actionMessage.message}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                borderRadius: '8px',
                border: `1px solid ${palette.accent}`,
                backgroundColor: palette.accent,
                color: palette.text,
                padding: '0.6rem 0.9rem',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
