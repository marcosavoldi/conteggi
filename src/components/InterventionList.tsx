import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Trash2, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    // Filter Logic
    const filteredInterventions = useMemo(() => {
        return interventions.filter(intervention => {
            const matchesSearch = intervention.clientName.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesDate = true;
            if (startDate || endDate) {
                const date = intervention.date.toDate();
                const start = startDate ? new Date(startDate) : new Date('1970-01-01');
                const end = endDate ? new Date(endDate) : new Date('2100-01-01');
                end.setHours(23, 59, 59, 999);
                matchesDate = date >= start && date <= end;
            }

            return matchesSearch && matchesDate;
        });
    }, [interventions, searchTerm, startDate, endDate]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredInterventions.length / itemsPerPage);
    const paginatedInterventions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInterventions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredInterventions, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate]);

    if (loading) {
        return <div className="card">Caricamento interventi...</div>;
    }

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>📋 Storico Interventi</h3>

                {/* Search & Filter Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Cerca cliente..."
                            className="input"
                            style={{ paddingLeft: '2.5rem', width: '200px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="date"
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="date"
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

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
                        {paginatedInterventions.map((intervention) => (
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
                        {paginatedInterventions.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                                    Nessun intervento trovato.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        className="btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '0.5rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                        Pagina {currentPage} di {totalPages}
                    </span>
                    <button
                        className="btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '0.5rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
