import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/Auth.css';

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();

    if (normalized === 'customer' || normalized === 'costumer') return 'customer';
    if (normalized === 'vendor') return 'vendor';
    if (normalized === 'admin') return 'admin';

    return 'customer';
};

const SignUp = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'Customer'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    role: formData.role
                })
            });

            const data = await response.json();

            if (data.success) {
                const role = normalizeRole(data.user?.role);

                // Set localStorage tokens so the frontend knows we are logged in
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', role);

                if (role === 'admin') {
                    navigate('/admin-dashboard');
                } else if (role === 'vendor') {
                    navigate('/vendor-dashboard');
                } else {
                    navigate('/customer-dashboard');
                }
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            console.error("SignUp Error:", err);
            setError(err.message || 'An error occurred. Please try again.');
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
                        <h1 className="auth-title">Sign up</h1>
                        <p className="auth-subtitle">Create your account and start using the platform in minutes.</p>
                    </div>

                    {error && <div className="form-error" role="alert">{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-form-grid">
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    type="text"
                                    id="fullName"
                                    placeholder="Your full name"
                                    required
                                    autoComplete="name"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    placeholder="Your phone number"
                                    required
                                    autoComplete="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="auth-form-grid">
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
                                <label htmlFor="role">Register As</label>
                                <select
                                    id="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                    className="auth-select"
                                >
                                    <option value="Customer">Customer (Book Vehicles)</option>
                                    <option value="Vendor">Vendor (List Vehicles)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    placeholder="Create a password"
                                    required
                                    autoComplete="new-password"
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

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="input-wrap">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    placeholder="Re-enter password"
                                    required
                                    autoComplete="new-password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword((value) => !value)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Signing Up...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className="auth-note">Choose a role now, and the app will send you to the right dashboard after signup.</p>

                    <div className="auth-footer">
                        Have an account? <Link to="/login"><strong>Log In</strong></Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
