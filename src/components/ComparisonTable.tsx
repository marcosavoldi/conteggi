import React, { useMemo, useState, useEffect } from 'react';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SeasonalityChart } from './SeasonalityChart';

interface Intervention {
    id: string;
    type: string;
    date: Timestamp;
    amount: number;
}

interface ComparisonTableProps {
    interventions: Intervention[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ interventions }) => {
    const currentYear = new Date().getFullYear();

    // Default to comparing current year vs previous year
    const [period1Start, setPeriod1Start] = useState(`${currentYear - 1}-01-01`);
    const [period1End, setPeriod1End] = useState(`${currentYear - 1}-12-31`);
    const [period2Start, setPeriod2Start] = useState(`${currentYear}-01-01`);
    const [period2End, setPeriod2End] = useState(`${currentYear}-12-31`);
    const [selectedType, setSelectedType] = useState('Tutti');

    const [firestoreTypes, setFirestoreTypes] = useState<string[]>([]);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const docRef = doc(db, 'settings', 'general');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFirestoreTypes(docSnap.data().interventionTypes || []);
                }
            } catch (error) {
                console.error("Error fetching types:", error);
            }
        };
        fetchTypes();
    }, []);

    const interventionTypes = useMemo(() => {
        // Helper to normalize type
        const normalizeType = (str: string) => {
            return str.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };

        const existingTypes = new Set(interventions.map(i => normalizeType(i.type)));
        const allTypes = new Set([...Array.from(existingTypes), ...firestoreTypes.map(t => normalizeType(t))]);
        return ['Tutti', ...Array.from(allTypes).sort()];
    }, [interventions, firestoreTypes]);

    const stats = useMemo(() => {
        const p1Start = new Date(period1Start).getTime();
        const p1End = new Date(period1End).getTime();
        const p2Start = new Date(period2Start).getTime();
        const p2End = new Date(period2End).getTime();

        const data: Record<string, { type: string; p1Amount: number; p2Amount: number; p1Count: number; p2Count: number }> = {};

        // Helper to normalize type
        const normalizeType = (str: string) => {
            return str.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };

        // Initialize data for all types found in the filtered range or all types if "Tutti"
        const relevantTypes = selectedType === 'Tutti'
            ? Array.from(new Set(interventions.map(i => normalizeType(i.type))))
            : [normalizeType(selectedType)];

        relevantTypes.forEach(type => {
            data[type] = { type, p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 };
        });

        interventions.forEach(intervention => {
            const date = intervention.date.toDate().getTime();
            const type = normalizeType(intervention.type);

            if (selectedType !== 'Tutti' && type !== normalizeType(selectedType)) return;
            if (!data[type]) {
                // Initialize if not present (e.g. if it wasn't in the initial set but appeared later)
                data[type] = { type, p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 };
            }

            if (date >= p1Start && date <= p1End) {
                data[type].p1Amount += intervention.amount;
                data[type].p1Count += 1;
            } else if (date >= p2Start && date <= p2End) {
                data[type].p2Amount += intervention.amount;
                data[type].p2Count += 1;
            }
        });

        return Object.values(data).sort((a, b) => a.type.localeCompare(b.type));
    }, [interventions, period1Start, period1End, period2Start, period2End, selectedType]);

    const totals = useMemo(() => {
        return stats.reduce((acc, curr) => ({
            p1Amount: acc.p1Amount + curr.p1Amount,
            p2Amount: acc.p2Amount + curr.p2Amount,
            p1Count: acc.p1Count + curr.p1Count,
            p2Count: acc.p2Count + curr.p2Count
        }), { p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 });
    }, [stats]);

    const chartData = [
        {
            name: 'Periodo 1',
            Fatturato: totals.p1Amount,
            Interventi: totals.p1Count
        },
        {
            name: 'Periodo 2',
            Fatturato: totals.p2Amount,
            Interventi: totals.p2Count
        }
    ];

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>⚖️ Confronto Avanzato</h3>

            {/* Filters */}
            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr', marginBottom: '2rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    <div>
                        <label className="label">Periodo 1</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                                type="date"
                                className="input"
                                style={{ flex: '1 1 130px' }}
                                value={period1Start}
                                onChange={(e) => setPeriod1Start(e.target.value)}
                            />
                            <input
                                type="date"
                                className="input"
                                style={{ flex: '1 1 130px' }}
                                value={period1End}
                                onChange={(e) => setPeriod1End(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Periodo 2</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                                type="date"
                                className="input"
                                style={{ flex: '1 1 130px' }}
                                value={period2Start}
                                onChange={(e) => setPeriod2Start(e.target.value)}
                            />
                            <input
                                type="date"
                                className="input"
                                style={{ flex: '1 1 130px' }}
                                value={period2End}
                                onChange={(e) => setPeriod2End(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Tipologia</label>
                        <select
                            className="input"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            disabled={interventionTypes.length <= 1}
                        >
                            {interventionTypes.length <= 1 ? (
                                <option value="Tutti">Nessun dato disponibile</option>
                            ) : (
                                interventionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ height: '300px' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Confronto Fatturato (€)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="Fatturato" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ height: '300px' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Confronto Numero Interventi</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Interventi" fill="var(--success)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Tipologia</th>
                            <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Periodo 1 (€)</th>
                            <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Periodo 2 (€)</th>
                            <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Diff (€)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(row => {
                            const diff = row.p2Amount - row.p1Amount;
                            return (
                                <tr key={row.type} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{row.type}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{row.p1Amount.toFixed(2)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{row.p2Amount.toFixed(2)}</td>
                                    <td style={{
                                        padding: '1rem',
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        color: diff >= 0 ? 'var(--success)' : 'var(--danger)'
                                    }}>
                                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr style={{ fontWeight: 'bold', background: 'var(--background)' }}>
                            <td style={{ padding: '1rem' }}>TOTALE</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{totals.p1Amount.toFixed(2)}</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{totals.p2Amount.toFixed(2)}</td>
                            <td style={{
                                padding: '1rem',
                                textAlign: 'right',
                                color: (totals.p2Amount - totals.p1Amount) >= 0 ? 'var(--success)' : 'var(--danger)'
                            }}>
                                {(totals.p2Amount - totals.p1Amount) > 0 ? '+' : ''}{(totals.p2Amount - totals.p1Amount).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <SeasonalityChart
                interventions={interventions}
                period1Start={period1Start}
                period1End={period1End}
                period2Start={period2Start}
                period2End={period2End}
                selectedType={selectedType}
            />
        </div>
    );
};
