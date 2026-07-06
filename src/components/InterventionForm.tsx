import { ActionIcon, Button, Card, Group, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { collection, doc, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { PlusCircle, Save, Trash } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';

interface InterventionFormProps {
    onSuccess?: () => void;
}

interface InterventionRow {
    id: string;
    type: string;
    clientName: string;
    amount: string;
    notes: string;
}

export const InterventionForm: React.FC<InterventionFormProps> = ({ onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState<InterventionRow[]>([{
        id: crypto.randomUUID(),
        type: '',
        clientName: '',
        amount: '',
        notes: ''
    }]);

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

    const addRow = () => {
        const lastRow = rows[rows.length - 1];
        setRows([...rows, {
            id: crypto.randomUUID(),
            type: lastRow ? lastRow.type : '',
            clientName: '',
            amount: '',
            notes: ''
        }]);
    };

    const removeRow = (id: string) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        }
    };

    const updateRow = (id: string, field: keyof InterventionRow, value: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (rows.some(r => !r.type || !r.clientName || !r.amount)) {
            notifications.show({
                title: 'Errore',
                message: 'Compila tutti i campi obbligatori per ogni riga',
                color: 'red',
            });
            return;
        }

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const interventionsRef = collection(db, 'interventions');

            rows.forEach(row => {
                const newDocRef = doc(interventionsRef);
                batch.set(newDocRef, {
                    userId: user.uid,
                    type: row.type,
                    clientName: row.clientName,
                    date: Timestamp.fromDate(new Date(globalDate)),
                    amount: parseFloat(row.amount),
                    notes: row.notes,
                    createdAt: Timestamp.now()
                });
            });

            await batch.commit();

            setRows([{ id: crypto.randomUUID(), type: '', clientName: '', amount: '', notes: '' }]);

            if (onSuccess) onSuccess();
            notifications.show({
                title: 'Successo',
                message: `${rows.length} ${rows.length === 1 ? 'intervento aggiunto' : 'interventi aggiunti'} con successo!`,
                color: 'green',
            });
        } catch (error) {
            console.error("Error adding documents: ", error);
            notifications.show({
                title: 'Errore',
                message: 'Errore durante l\'aggiunta degli interventi',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card shadow="sm" radius="md" withBorder>
            <Title order={3} mb="lg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={24} style={{ color: 'var(--mantine-color-blue-6)' }} />
                Inserimento Multiplo
            </Title>
            
            <form onSubmit={handleSubmit}>
                <Card withBorder p="sm" mb="md" bg="var(--mantine-color-gray-0)">
                    <TextInput
                        label="Data Interventi 📅"
                        description="Questa data verrà applicata a tutti gli interventi inseriti"
                        type="date"
                        value={globalDate}
                        onChange={(e) => setGlobalDate(e.target.value)}
                        required
                        maw={300}
                    />
                </Card>

                <Stack gap="sm">
                    {rows.map((row, index) => (
                        <Card key={row.id} withBorder p="sm" radius="sm">
                            <Group justify="space-between" mb="sm">
                                <Text fw={600} size="sm" c="dimmed">Intervento #{index + 1}</Text>
                                {rows.length > 1 && (
                                    <ActionIcon color="red" variant="subtle" onClick={() => removeRow(row.id)}>
                                        <Trash size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                                <Select
                                    label="Tipologia 🛠️"
                                    placeholder="Seleziona Tipo"
                                    data={interventionTypes}
                                    value={row.type}
                                    onChange={(value) => updateRow(row.id, 'type', value || '')}
                                    required
                                    searchable
                                />

                                <TextInput
                                    label="Cliente 👤"
                                    placeholder="Nome del cliente"
                                    value={row.clientName}
                                    onChange={(e) => updateRow(row.id, 'clientName', e.target.value)}
                                    required
                                />

                                <NumberInput
                                    label="Importo (€) 💰"
                                    placeholder="0.00"
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="€ "
                                    value={row.amount}
                                    onChange={(value) => updateRow(row.id, 'amount', value.toString())}
                                    required
                                    hideControls
                                />

                                <TextInput
                                    label="Note 📝"
                                    placeholder="Eventuali note..."
                                    value={row.notes}
                                    onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                                />
                            </SimpleGrid>
                        </Card>
                    ))}
                </Stack>

                <Group mt="md" justify="space-between">
                    <Button
                        variant="light"
                        leftSection={<PlusCircle size={16} />}
                        onClick={addRow}
                        type="button"
                    >
                        Aggiungi Riga
                    </Button>

                    <Button
                        type="submit"
                        loading={loading}
                        leftSection={<Save size={20} />}
                    >
                        Salva {rows.length > 1 ? `Tutti (${rows.length})` : 'Intervento'}
                    </Button>
                </Group>
            </form>
        </Card>
    );
};
