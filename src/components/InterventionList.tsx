import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Trash2 } from 'lucide-react';

interface Intervention {
    id: string;
    type: string;
    clientName: string;
    date: Timestamp;
    amount: number;
    notes?: string;
}

export const InterventionList: React.FC = () => {
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'interventions'), orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const interventionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Intervention[];

            setInterventions(interventionsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching interventions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo intervento?')) {
            try {
                await deleteDoc(doc(db, 'interventions', id));
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert('Errore durante l\'eliminazione');
            }
        }
    };

    if (loading) {
        return <div className="card">Caricamento interventi...</div>;
    }

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📋 Interventi Recenti</h3>
            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Data</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Cliente</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Tipologia</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Importo</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Note</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interventions.map((intervention) => (
                            <tr key={intervention.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    {intervention.date.toDate().toLocaleDateString('it-IT')}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{intervention.clientName}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        background: '#e0e7ff',
                                        color: '#4338ca',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}>
                                        {intervention.type}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>€{intervention.amount.toFixed(2)}</td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {intervention.notes}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button
                                        onClick={() => handleDelete(intervention.id)}
                                        style={{
                                            background: '#fee2e2',
                                            border: 'none',
                                            color: 'var(--danger)',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            borderRadius: '0.375rem',
                                            transition: 'background 0.2s'
                                        }}
                                        title="Elimina"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {interventions.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                                    Nessun intervento trovato. Aggiungine uno sopra!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
