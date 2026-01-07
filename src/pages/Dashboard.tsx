import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings } from 'lucide-react';
import { InterventionForm } from '../components/InterventionForm';
import { InterventionList } from '../components/InterventionList';
import { DashboardCharts } from '../components/DashboardCharts';
import { ComparisonTable } from '../components/ComparisonTable';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Intervention {
    id: string;
    type: string;
    clientName: string;
    date: Timestamp;
    amount: number;
    notes?: string;
}

import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [interventions, setInterventions] = useState<Intervention[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'interventions'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Intervention[];
            setInterventions(data);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <header style={{
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📊 Dashboard
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="hide-mobile">{user?.displayName}</span>
                    <button
                        className="btn"
                        onClick={() => navigate('/settings')}
                        style={{ border: '1px solid var(--border)', padding: '0.5rem' }}
                        title="Impostazioni"
                    >
                        <Settings size={18} />
                        <span className="hide-mobile">Settings</span>
                    </button>
                    <button className="btn" onClick={signOut} style={{ color: 'var(--danger)', border: '1px solid var(--border)', padding: '0.5rem' }} title="Esci">
                        <LogOut size={18} />
                        <span className="hide-mobile">Esci</span>
                    </button>
                </div>
            </header>

            <main className="container">
                <DashboardCharts interventions={interventions} />
                <ComparisonTable interventions={interventions} />

                <div style={{ marginBottom: '2rem' }}>
                    <InterventionForm />
                </div>

                <InterventionList />
            </main>
        </div>
    );
};
