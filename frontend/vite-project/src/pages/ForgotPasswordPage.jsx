import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to send reset OTP.');
      }

      setSuccessMessage(data.message || 'If the email is registered, an OTP has been sent.');
      navigate('/verify-reset-otp', {
        state: { email: trimmedEmail },
      });
    } catch (requestError) {
      setError(requestError.message || 'Unable to send reset OTP. Please try again.');
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
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">Enter your registered email to receive a one-time reset OTP.</p>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}
          {successMessage && <div className="form-success" role="status">{successMessage}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send Reset OTP'}
            </button>
          </form>

          <div className="auth-footer">
            Remember your password? <Link to="/login"><strong>Back to Login</strong></Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
