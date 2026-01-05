import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const Login: React.FC = () => {
    const { user, signIn } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--background)'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐝</div>
                <h1 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>Gestione Interventi</h1>
                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    Accedi per gestire i tuoi interventi
                </p>
                <button className="btn btn-primary" onClick={signIn} style={{ width: '100%' }}>
                    <LogIn size={20} />
                    Accedi con Google
                </button>
            </div>
        </div>
    );
};
