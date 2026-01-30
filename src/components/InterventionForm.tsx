import { Button, Card, NumberInput, Select, SimpleGrid, Textarea, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { addDoc, collection, doc, getDoc, Timestamp } from 'firebase/firestore';
import { PlusCircle, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';

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
            notifications.show({
                title: 'Successo',
                message: 'Intervento aggiunto con successo!',
                color: 'green',
            });
        } catch (error) {
            console.error("Error adding document: ", error);
            notifications.show({
                title: 'Errore',
                message: 'Errore durante l\'aggiunta dell\'intervento',
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
                Nuovo Intervento
            </Title>
            
            <form onSubmit={handleSubmit}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Select
                        label="Tipologia 🛠️"
                        placeholder="Seleziona Tipo"
                        data={interventionTypes}
                        value={formData.type}
                        onChange={(value) => setFormData({ ...formData, type: value || '' })}
                        required
                        searchable
                    />

                    <TextInput
                        label="Cliente 👤"
                        placeholder="Nome del cliente"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        required
                    />

                    <TextInput
                        label="Data 📅"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                    />

                    <NumberInput
                        label="Importo (€) 💰"
                        placeholder="0.00"
                        decimalScale={2}
                        fixedDecimalScale
                        prefix="€ "
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value.toString() })}
                        required
                        hideControls
                    />
                </SimpleGrid>

                <Textarea
                    label="Note 📝"
                    placeholder="Eventuali note aggiuntive..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    minRows={3}
                    mt="md"
                />

                <Button
                    type="submit"
                    fullWidth
                    mt="xl"
                    loading={loading}
                    leftSection={<Save size={20} />}
                >
                    Salva Intervento
                </Button>
            </form>
        </Card>
    );
};
