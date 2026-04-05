import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

const OtpVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = useMemo(() => {
    const stateEmail = location.state?.email;
    return typeof stateEmail === 'string' ? stateEmail : '';
  }, [location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!OTP_PATTERN.test(trimmedOtp)) {
      setError('OTP must be exactly 6 digits.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          otp: trimmedOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.resetToken) {
        throw new Error(data.message || 'OTP verification failed.');
      }

      navigate('/reset-password', {
        state: {
          email: trimmedEmail,
          resetToken: data.resetToken,
        },
      });
    } catch (requestError) {
      setError(requestError.message || 'Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-brand">NepRide</h2>
            <h1 className="auth-title">Verify OTP</h1>
            <p className="auth-subtitle">Enter the 6-digit OTP sent to your email to continue.</p>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="otp">OTP Code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying OTP...' : 'Verify OTP'}
            </button>
          </form>

          <div className="auth-footer">
            Didn&apos;t receive OTP? <Link to="/forgot-password"><strong>Request Again</strong></Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;
