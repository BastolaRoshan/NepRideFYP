import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();

    if (normalized === 'customer' || normalized === 'costumer') return 'customer';
    if (normalized === 'vendor') return 'vendor';
    if (normalized === 'admin') return 'admin';

    return '';
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const [status, setStatus] = useState('loading');
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/isAuthenticated', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });

                const data = await response.json();

                if (response.ok && data.success && data.role) {
                    setUserRole(normalizeRole(data.role));
                    setStatus('ok');
                } else {
                    setStatus('unauthorized');
                }
            } catch (err) {
                console.error('[ProtectedRoute] fetch error:', err);
                setStatus('unauthorized');
            }
        };

        checkAuth();
    }, []);

    if (status === 'loading') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: '#0f0f0f',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    zIndex: 9999
                }}
            >
                Checking auth...
            </div>
        );
    }

    if (status === 'unauthorized') {
        return <Navigate to="/login" replace />;
    }

    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole)) {
        if (userRole === 'admin') {
            return <Navigate to="/admin-dashboard" replace />;
        } else if (userRole === 'vendor') {
            return <Navigate to="/vendor-dashboard" replace />;
        } else if (userRole === 'customer') {
            return <Navigate to="/customer-dashboard" replace />;
        } else {
            // Unrecognized role, send to home page instead of infinitely looping
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;