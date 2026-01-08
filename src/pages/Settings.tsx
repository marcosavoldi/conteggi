import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowLeft, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { Database } from 'lucide-react';

export const Settings: React.FC = () => {
    const { user } = useAuth();
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

    const handleClaimData = async () => {
        if (!user) return;
        if (!window.confirm("Vuoi recuperare tutti i dati esistenti e assegnarli al tuo utente?")) return;

        setLoading(true);
        try {
            // Fetch ALL interventions (this might be heavy if lots of data, but ok for now)
            const q = query(collection(db, 'interventions'));
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                // If userId is missing or different (though we probably only want missing ones)
                if (!data.userId) {
                    batch.update(doc.ref, { userId: user.uid });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                alert(`Hai recuperato con successo ${count} interventi!`);
            } else {
                alert("Non ci sono interventi da recuperare (hanno già tutti un proprietario).");
            }

        } catch (error: any) {
            console.error("Error claiming data:", error);
            alert(`Errore durante il recupero: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm("ATTENZIONE: Stai per eliminare TUTTI gli interventi dal database. Questa azione è irreversibile. Sei sicuro?")) return;
        if (!window.confirm("Sei davvero sicuro? Tutti i dati andranno persi per sempre.")) return;

        setLoading(true);
        try {
            const q = query(collection(db, 'interventions'));
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert("Tutti gli interventi sono stati eliminati.");
        } catch (error: any) {
            console.error("Error deleting all:", error);
            alert(`Errore durante l'eliminazione: ${error.message}`);
        } finally {
            setLoading(false);
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

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', marginBottom: '2rem' }}>
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

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={20} /> Recupero Dati
                </h2>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Se non vedi i tuoi vecchi dati, usa questo pulsante per assegnare tutti gli interventi esistenti (senza proprietario) al tuo utente attuale.
                </p>
                <button
                    onClick={handleClaimData}
                    className="btn"
                    style={{
                        background: 'var(--primary)',
                        color: 'white',
                        width: '100%',
                        justifyContent: 'center'
                    }}
                >
                    Recupera Vecchi Dati
                </button>
            </div>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid var(--danger)', background: '#fff1f2' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--danger)' }}>Zona Pericolo</h2>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Questa azione eliminerà permanentemente tutti gli interventi salvati nel database. Usare con cautela.
                </p>
                <button
                    onClick={handleDeleteAll}
                    className="btn"
                    style={{
                        background: 'var(--danger)',
                        color: 'white',
                        width: '100%',
                        justifyContent: 'center'
                    }}
                >
                    <Trash2 size={18} />
                    Elimina Tutto il Database
                </button>
            </div>
        </div>
    );
};
