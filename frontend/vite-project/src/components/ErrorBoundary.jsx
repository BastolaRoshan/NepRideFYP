import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('React Error Boundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f',
                    color: '#fff', padding: '2rem', textAlign: 'center'
                }}>
                    <h2 style={{ color: '#DBB33B', marginBottom: '1rem' }}>Something went wrong</h2>
                    <p style={{ color: '#a0a0a0', marginBottom: '1.5rem', maxWidth: '500px' }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                        style={{
                            background: '#DBB33B', color: '#0f0f0f', border: 'none',
                            padding: '0.75rem 2rem', borderRadius: '4px', cursor: 'pointer',
                            fontWeight: '600', fontSize: '1rem'
                        }}
                    >
                        Go to Home
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
