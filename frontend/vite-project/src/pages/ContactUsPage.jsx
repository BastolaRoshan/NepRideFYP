import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Send } from 'lucide-react';
import CustomerPortalHeader from '../components/CustomerPortalHeader';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

const ContactUsPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const validate = (values) => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!values.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!values.email.trim()) nextErrors.email = 'Email is required.';
    else if (!emailRegex.test(values.email.trim())) nextErrors.email = 'Enter a valid email address.';

    const phoneValue = values.phone.replace(/\D/g, '');
    if (!phoneValue) nextErrors.phone = 'Phone number is required.';
    else if (!phoneRegex.test(phoneValue)) nextErrors.phone = 'Phone number must be 10 digits.';

    if (!values.subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!values.message.trim()) nextErrors.message = 'Message is required.';
    else if (values.message.trim().length < 15) nextErrors.message = 'Message should be at least 15 characters.';

    return nextErrors;
  };

  const isFormComplete = useMemo(() => {
    return Object.values(formData).every((value) => String(value).trim().length > 0);
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus({ type: 'error', message: 'Please fix the highlighted fields and try again.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatus({ type: '', message: '' });

      // Placeholder async submit to keep UX realistic until API endpoint is introduced.
      await new Promise((resolve) => setTimeout(resolve, 900));

      setStatus({ type: 'success', message: 'Your message has been sent successfully. We will contact you soon.' });
      setFormData(initialForm);
      setErrors({});
    } catch {
      setStatus({ type: 'error', message: 'Failed to send your message. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToProfile = () => {
    navigate('/verification');
  };

  const handleLogout = async () => {
    try {
      await globalThis.fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #353535',
    backgroundColor: '#141414',
    color: '#f4f4f4',
    padding: '0.78rem 0.85rem',
    fontSize: '0.95rem',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#101010', color: '#f5f5f5', padding: '1.2rem' }}>
      <CustomerPortalHeader activeTab="contact" onProfile={handleGoToProfile} onLogout={handleLogout} />
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.8rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Contact Us</h1>
            <p style={{ margin: '0.45rem 0 0', color: '#b2b2b2' }}>Have a question or issue? Send us a message.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/customer-dashboard')}
            style={{
              border: '1px solid #3a3524',
              backgroundColor: '#171717',
              color: '#DBB33B',
              borderRadius: '999px',
              padding: '0.58rem 0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Back to Dashboard
          </button>
        </div>

        <div
          className="contact-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
            gap: '1rem',
          }}
        >
          <section style={{ border: '1px solid #2b2b2b', borderRadius: '14px', backgroundColor: '#0f0f0f', padding: '1rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#DBB33B' }}>Send a Message</h2>

            {status.message && (
              <div
                style={{
                  marginBottom: '0.9rem',
                  borderRadius: '10px',
                  padding: '0.75rem 0.85rem',
                  border: status.type === 'success' ? '1px solid #166534' : '1px solid #7f1d1d',
                  backgroundColor: status.type === 'success' ? '#052e16' : '#3f1010',
                  color: status.type === 'success' ? '#bbf7d0' : '#fecaca',
                }}
              >
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label htmlFor="fullName" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Full Name</label>
                <input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} style={inputStyle} />
                {errors.fullName && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{errors.fullName}</p>}
              </div>

              <div className="contact-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Email</label>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} style={inputStyle} />
                  {errors.email && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Phone Number</label>
                  <input id="phone" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
                  {errors.phone && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="subject" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Subject</label>
                <input id="subject" name="subject" value={formData.subject} onChange={handleChange} style={inputStyle} />
                {errors.subject && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{errors.subject}</p>}
              </div>

              <div>
                <label htmlFor="message" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '140px' }}
                />
                {errors.message && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting || !isFormComplete}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: submitting || !isFormComplete ? '#6b5c2b' : '#DBB33B',
                  color: '#111111',
                  fontWeight: 800,
                  padding: '0.8rem 1rem',
                  cursor: submitting || !isFormComplete ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Send size={16} /> {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </section>

          <aside style={{ border: '1px solid #2b2b2b', borderRadius: '14px', backgroundColor: '#0f0f0f', padding: '1rem', height: 'fit-content' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#DBB33B' }}>Contact Information</h2>
            <p style={{ margin: '0 0 1rem', color: '#b2b2b2' }}>
              Our support team will respond as soon as possible.
            </p>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ border: '1px solid #2f2a1f', backgroundColor: '#17140d', borderRadius: '10px', padding: '0.8rem' }}>
                <p style={{ margin: '0 0 0.35rem', color: '#d6d6d6', fontWeight: 700 }}>Support Email</p>
                <a href="mailto:roshanbastola02@gmail.com" style={{ color: '#DBB33B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Mail size={15} /> roshanbastola02@gmail.com
                </a>
              </div>

              <div style={{ border: '1px solid #2f2a1f', backgroundColor: '#17140d', borderRadius: '10px', padding: '0.8rem' }}>
                <p style={{ margin: '0 0 0.35rem', color: '#d6d6d6', fontWeight: 700 }}>Support Phone</p>
                <a href="tel:9816622940" style={{ color: '#DBB33B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Phone size={15} /> 9816622940
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .contact-layout {
            grid-template-columns: 1fr !important;
          }

          .contact-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactUsPage;