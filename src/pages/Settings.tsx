import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowLeft, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
    const navigate = useNavigate();
    const [types, setTypes] = useState<string[]>([]);
    const [newType, setNewType] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const docRef = doc(db, 'settings', 'general');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setTypes(docSnap.data().interventionTypes || []);
            } else {
                // Initialize with default types if not exists
                const defaultTypes = [
                    'Disinfestazione vespe',
                    'Derattizzazione',
                    'Blattella Germanica',
                    'Monitoraggio',
                    'Volatili',
                    'Taru',
                    'Pulizia Vetri',
                    'Cimici dei letti',
                    'Varie'
                ];
                await setDoc(docRef, { interventionTypes: defaultTypes });
                setTypes(defaultTypes);
            }
        } catch (error: any) {
            console.error("Error fetching types:", error);
            alert(`Errore caricamento impostazioni: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newType.trim()) return;

        try {
            const docRef = doc(db, 'settings', 'general');
            await updateDoc(docRef, {
                interventionTypes: arrayUnion(newType.trim())
            });
            setTypes([...types, newType.trim()]);
            setNewType('');
        } catch (error: any) {
            console.error("Error adding type:", error);
            alert(`Errore durante l'aggiunta della tipologia: ${error.message || error}`);
        }
    };

    const handleDeleteType = async (typeToDelete: string) => {
        if (!window.confirm(`Sei sicuro di voler eliminare "${typeToDelete}"?`)) return;

        try {
            const docRef = doc(db, 'settings', 'general');
            await updateDoc(docRef, {
                interventionTypes: arrayRemove(typeToDelete)
            });
            setTypes(types.filter(t => t !== typeToDelete));
        } catch (error) {
            console.error("Error deleting type:", error);
            alert("Errore durante l'eliminazione della tipologia");
        }
    };

    if (loading) return <div className="container">Caricamento...</div>;

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => navigate('/')} className="btn" style={{ background: 'transparent', padding: 0 }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SettingsIcon /> Impostazioni
                </h1>
            </header>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Gestione Tipologie Intervento</h2>

                <form onSubmit={handleAddType} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Nuova tipologia..."
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        style={{ marginTop: 0 }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!newType.trim()}>
                        <Plus size={20} />
                        Aggiungi
                    </button>
                </form>

                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {types.map((type) => (
                        <li key={type} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--background)',
                            marginBottom: '0.5rem',
                            borderRadius: 'var(--radius)'
                        }}>
                            <span style={{ fontWeight: 500 }}>{type}</span>
                            <button
                                onClick={() => handleDeleteType(type)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '0.5rem'
                                }}
                                title="Elimina"
                            >
                                <Trash2 size={18} />
                            </button>
                        </li>
                    ))}
                    {types.length === 0 && (
                        <li style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                            Nessuna tipologia presente. Aggiungine una!
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};
