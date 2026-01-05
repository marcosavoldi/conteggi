import React, { useState, useEffect } from 'react';
import { addDoc, collection, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Save } from 'lucide-react';

interface InterventionFormProps {
    onSuccess?: () => void;
}

export const InterventionForm: React.FC<InterventionFormProps> = ({ onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: '',
        clientName: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        notes: ''
    });

    const [interventionTypes, setInterventionTypes] = useState<string[]>([]);

    useEffect(() => {
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
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'interventions'), {
                userId: user.uid,
                type: formData.type,
                clientName: formData.clientName,
                date: Timestamp.fromDate(new Date(formData.date)),
                amount: parseFloat(formData.amount),
                notes: formData.notes,
                createdAt: Timestamp.now()
            });

            setFormData({
                type: '',
                clientName: '',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                notes: ''
            });

            if (onSuccess) onSuccess();
            alert('Intervento aggiunto con successo!');
        } catch (error) {
            console.error("Error adding document: ", error);
            alert('Errore durante l\'aggiunta dell\'intervento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <PlusCircle size={24} className="text-primary" style={{ color: 'var(--primary)' }} />
                Nuovo Intervento
            </h3>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div>
                    <label className="label">Tipologia 🛠️</label>
                    <select
                        className="input"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        required
                    >
                        <option value="">Seleziona Tipo</option>
                        {interventionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="label">Cliente 👤</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Nome del cliente"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="label">Data 📅</label>
                    <input
                        type="date"
                        className="input"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="label">Importo (€) 💰</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <label className="label">Note 📝</label>
                <textarea
                    className="input"
                    placeholder="Eventuali note aggiuntive..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                />
            </div>

            <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem' }}
                disabled={loading}
            >
                <Save size={20} />
                {loading ? 'Salvataggio...' : 'Salva Intervento'}
            </button>
        </form>
    );
};
