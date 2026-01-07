import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings, Filter } from 'lucide-react';
import { InterventionForm } from '../components/InterventionForm';
import { InterventionList } from '../components/InterventionList';
import { DashboardCharts } from '../components/DashboardCharts';
import { ComparisonTable } from '../components/ComparisonTable';
import { collection, query, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

interface Intervention {
    id: string;
    type: string;
    clientName: string;
    date: Timestamp;
    amount: number;
    notes?: string;
}

export const Dashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [interventionTypes, setInterventionTypes] = useState<string[]>([]);

    // Filter States
    const [selectedType, setSelectedType] = useState('Tutti');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(0, 1); // Start of current year
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        return date.toISOString().split('T')[0];
    });

    useEffect(() => {
        const q = query(collection(db, 'interventions'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Intervention[];
            setInterventions(data);
        });

        // Fetch types
        const fetchTypes = async () => {
            try {
                const docRef = doc(db, 'settings', 'general');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setInterventionTypes(docSnap.data().interventionTypes || []);
                }
            } catch (error) {
                console.error("Error fetching types:", error);
            }
        };
        fetchTypes();

        return () => unsubscribe();
    }, []);

    // Filtered Data for Charts
    const filteredInterventions = useMemo(() => {
        return interventions.filter(intervention => {
            const date = intervention.date.toDate();
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end day

            const matchesType = selectedType === 'Tutti' || intervention.type === selectedType;
            const matchesDate = date >= start && date <= end;

            return matchesType && matchesDate;
        });
    }, [interventions, selectedType, startDate, endDate]);

    // Summary Statistics (Global, not filtered by the chart filters, but specifically for Year and Month as requested)
    const summaryStats = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let yearTotal = 0;
        let monthTotal = 0;

        interventions.forEach(i => {
            const date = i.date.toDate();
            if (date.getFullYear() === currentYear) {
                yearTotal += i.amount;
                if (date.getMonth() === currentMonth) {
                    monthTotal += i.amount;
                }
            }
        });

        return { yearTotal, monthTotal };
    }, [interventions]);

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
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
                        <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Incasso Anno Corrente</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>€{summaryStats.yearTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                        <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Incasso Mese Corrente</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>€{summaryStats.monthTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Filters for Charts */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Filter size={20} />
                        <h3>Filtri Analisi</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Tipologia</label>
                            <select
                                className="input"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="Tutti">Tutti</option>
                                {interventionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Da</label>
                            <input
                                type="date"
                                className="input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>A</label>
                            <input
                                type="date"
                                className="input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DashboardCharts interventions={filteredInterventions} />

                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: '3rem' }}>Confronto Periodi</h2>
                <ComparisonTable interventions={interventions} />

                <div style={{ marginBottom: '2rem', marginTop: '3rem' }}>
                    <InterventionForm />
                </div>

                <InterventionList />
            </main>
        </div>
    );
};
