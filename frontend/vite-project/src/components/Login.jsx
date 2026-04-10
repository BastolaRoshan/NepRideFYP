import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/Auth.css';
import { clearSessionAuth, normalizeRole, setSessionAuth } from '../utils/sessionAuth';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let timeoutId;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login response:', data);

      if (data.success) {
        const role = normalizeRole(data.user?.role);
        const isServiceAccessAllowed = Boolean(data.user?.isServiceAccessAllowed);

        clearSessionAuth();
        setSessionAuth({
          token: data.token,
          role,
          isServiceAccessAllowed,
          verificationStatus: data.user?.verificationStatus,
          userName: data.user?.name,
        });

        if (role === 'admin') {
          navigate('/admin-dashboard');
        } else if (role === 'vendor') {
          navigate('/vendor-dashboard');
        } else {
          navigate('/customer-dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
        console.error('Login failed:', data.message);
      }
    } catch (err) {
      console.error("Login Error:", err);
      const isAbortError = err?.name === 'AbortError';
      const isNetworkError =
        err instanceof TypeError &&
        /failed to fetch/i.test(err.message || '');

      if (isAbortError) {
        setError('Server took too long to respond. Please ensure backend is running on port 5001.');
      } else if (isNetworkError) {
        setError('Unable to reach server. Start backend on port 5001 and run frontend with npm run dev.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-brand">NepRide</h2>
            <h1 className="auth-title">Log in</h1>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <div className="remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember me</label>
              </div>
              <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="auth-note">Protected access for both riders and vendors.</p>

          <div className="auth-footer">
            Don&apos;t have an account? <Link to="/signup"><strong>Sign Up</strong></Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
