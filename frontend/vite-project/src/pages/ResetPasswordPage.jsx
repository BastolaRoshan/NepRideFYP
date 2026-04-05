import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = useMemo(() => {
    const token = location.state?.resetToken;
    return typeof token === 'string' ? token : '';
  }, [location.state]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!resetToken) {
      setError('Reset session is missing or expired. Please verify OTP again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to reset password.');
      }

      setSuccessMessage(data.message || 'Password has been reset successfully.');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset password. Please try again.');
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
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Set a new secure password for your account.</p>
          </div>

          {!resetToken && (
            <div className="form-info" role="status">
              Reset session is not available. Please verify your OTP first.
            </div>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}
          {successMessage && <div className="form-success" role="status">{successMessage}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                minLength={6}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                minLength={6}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !resetToken}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login"><strong>Back to Login</strong></Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
