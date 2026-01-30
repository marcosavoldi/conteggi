import { ActionIcon, Button, Card, Container, Group, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ArrowLeft, Database, Plus, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';

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
            notifications.show({
                title: 'Errore',
                message: `Errore caricamento impostazioni: ${error.message || error}`,
                color: 'red',
            });
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
            notifications.show({
                title: 'Successo',
                message: 'Tipologia aggiunta con successo!',
                color: 'green',
            });
        } catch (error: any) {
            console.error("Error adding type:", error);
            notifications.show({
                title: 'Errore',
                message: `Errore durante l'aggiunta della tipologia: ${error.message || error}`,
                color: 'red',
            });
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
            notifications.show({
                title: 'Eliminato',
                message: 'Tipologia eliminata con successo',
                color: 'green',
            });
        } catch (error) {
            console.error("Error deleting type:", error);
            notifications.show({
                title: 'Errore',
                message: 'Errore durante l\'eliminazione della tipologia',
                color: 'red',
            });
        }
    };

    const handleClaimData = async () => {
        if (!user) return;
        if (!window.confirm("Vuoi recuperare tutti i dati esistenti e assegnarli al tuo utente?")) return;

        setLoading(true);
        try {
            const q = query(collection(db, 'interventions'));
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (!data.userId) {
                    batch.update(doc.ref, { userId: user.uid });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                notifications.show({
                    title: 'Successo',
                    message: `Hai recuperato con successo ${count} interventi!`,
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Info',
                    message: "Non ci sono interventi da recuperare (hanno già tutti un proprietario).",
                    color: 'blue',
                });
            }

        } catch (error: any) {
            console.error("Error claiming data:", error);
            notifications.show({
                title: 'Errore',
                message: `Errore durante il recupero: ${error.message}`,
                color: 'red',
            });
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
            notifications.show({
                title: 'Eliminato',
                message: "Tutti gli interventi sono stati eliminati.",
                color: 'green',
            });
        } catch (error: any) {
            console.error("Error deleting all:", error);
            notifications.show({
                title: 'Errore',
                message: `Errore durante l'eliminazione: ${error.message}`,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Container size="sm" py="xl"><Text ta="center">Caricamento...</Text></Container>;

    return (
        <Container size="sm" py="xl">
            <Group mb="xl">
                <ActionIcon variant="transparent" onClick={() => navigate('/')} color="dark">
                    <ArrowLeft size={24} />
                </ActionIcon>
                <Title order={2} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SettingsIcon /> Impostazioni
                </Title>
            </Group>

            <Card shadow="sm" radius="md" withBorder mb="lg">
                <Title order={3} size="h4" mb="md">Gestione Tipologie Intervento</Title>

                <form onSubmit={handleAddType}>
                    <Group mb="md">
                        <TextInput
                            placeholder="Nuova tipologia..."
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Button type="submit" disabled={!newType.trim()} leftSection={<Plus size={18} />}>
                            Aggiungi
                        </Button>
                    </Group>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {types.map((type) => (
                        <Card key={type} withBorder padding="sm" radius="sm">
                            <Group justify="space-between">
                                <Text fw={500}>{type}</Text>
                                <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteType(type)} title="Elimina">
                                    <Trash2 size={18} />
                                </ActionIcon>
                            </Group>
                        </Card>
                    ))}
                    {types.length === 0 && (
                        <Text ta="center" c="dimmed" py="md">
                            Nessuna tipologia presente. Aggiungine una!
                        </Text>
                    )}
                </div>
            </Card>

            <Card shadow="sm" radius="md" withBorder mb="lg" style={{ borderColor: 'var(--mantine-color-blue-6)' }}>
                <Title order={3} size="h4" mb="md" c="blue" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={20} /> Recupero Dati
                </Title>
                <Text c="dimmed" mb="md" size="sm">
                    Se non vedi i tuoi vecchi dati, usa questo pulsante per assegnare tutti gli interventi esistenti (senza proprietario) al tuo utente attuale.
                </Text>
                <Button onClick={handleClaimData} fullWidth>
                    Recupera Vecchi Dati
                </Button>
            </Card>

            <Card shadow="sm" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-6)', backgroundColor: 'var(--mantine-color-red-0)' }}>
                <Title order={3} size="h4" mb="md" c="red">Zona Pericolo</Title>
                <Text c="dimmed" mb="md" size="sm">
                    Questa azione eliminerà permanentemente tutti gli interventi salvati nel database. Usare con cautela.
                </Text>
                <Button onClick={handleDeleteAll} color="red" fullWidth leftSection={<Trash2 size={18} />}>
                    Elimina Tutto il Database
                </Button>
            </Card>
        </Container>
    );
};
