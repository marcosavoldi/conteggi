import { ActionIcon, Badge, Card, Group, Pagination, Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { Calendar, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';

interface Intervention {
    id: string;
    type: string;
    clientName: string;
    date: Timestamp;
    amount: number;
    notes?: string;
}

export const InterventionList: React.FC = () => {
    const { user } = useAuth();
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [interventionTypes, setInterventionTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>('Tutti');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'interventions'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );

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

    const handleDelete = async (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo intervento?')) {
            try {
                await deleteDoc(doc(db, 'interventions', id));
                notifications.show({
                    title: 'Eliminato',
                    message: 'Intervento eliminato con successo',
                    color: 'green',
                });
            } catch (error) {
                console.error("Error deleting document: ", error);
                notifications.show({
                    title: 'Errore',
                    message: 'Errore durante l\'eliminazione',
                    color: 'red',
                });
            }
        }
    };

    // Filter Logic
    const filteredInterventions = useMemo(() => {
        return interventions.filter(intervention => {
            const matchesSearch = intervention.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = (selectedType === 'Tutti' || !selectedType) || intervention.type === selectedType;

            let matchesDate = true;
            if (startDate || endDate) {
                const date = intervention.date.toDate();
                const start = startDate ? new Date(startDate) : new Date('1970-01-01');
                const end = endDate ? new Date(endDate) : new Date('2100-01-01');
                end.setHours(23, 59, 59, 999);
                matchesDate = date >= start && date <= end;
            }

            return matchesSearch && matchesType && matchesDate;
        });
    }, [interventions, searchTerm, selectedType, startDate, endDate]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredInterventions.length / itemsPerPage);
    const paginatedInterventions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInterventions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredInterventions, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedType, startDate, endDate]);

    if (loading) {
        return <Card p="xl"><Text ta="center">Caricamento interventi...</Text></Card>;
    }

    return (
        <Card shadow="sm" radius="md" withBorder mt="xl">
            <Group justify="space-between" mb="lg">
                <Title order={3}>📋 Storico Interventi</Title>
            </Group>

            {/* Search & Filter Controls */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="lg">
                <TextInput
                    placeholder="Cerca cliente..."
                    leftSection={<Search size={16} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select
                    placeholder="Tutti i servizi"
                    data={['Tutti', ...interventionTypes]}
                    value={selectedType}
                    onChange={setSelectedType}
                />
                <TextInput
                    type="date"
                    leftSection={<Calendar size={16} />}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <TextInput
                    type="date"
                    leftSection={<Calendar size={16} />}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </SimpleGrid>

            {/* Desktop Table View */}
            <Table.ScrollContainer minWidth={800} visibleFrom="sm">
                <Table striped highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Data</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Tipologia</Table.Th>
                            <Table.Th>Importo</Table.Th>
                            <Table.Th>Note</Table.Th>
                            <Table.Th>Azioni</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {paginatedInterventions.map((intervention) => (
                            <Table.Tr key={intervention.id}>
                                <Table.Td>
                                    {intervention.date.toDate().toLocaleDateString('it-IT')}
                                </Table.Td>
                                <Table.Td fw={600}>{intervention.clientName}</Table.Td>
                                <Table.Td>
                                    <Badge variant="light" color="blue">
                                        {intervention.type}
                                    </Badge>
                                </Table.Td>
                                <Table.Td fw={500}>€{intervention.amount.toFixed(2)}</Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="dimmed" truncate style={{ maxWidth: '200px' }}>
                                        {intervention.notes}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => handleDelete(intervention.id)}
                                        title="Elimina"
                                    >
                                        <Trash2 size={18} />
                                    </ActionIcon>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                         {paginatedInterventions.length === 0 && (
                            <Table.Tr>
                                <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                                    <Text size="xl" mb="sm">📭</Text>
                                    <Text c="dimmed">Nessun intervento trovato.</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>

             {/* Mobile Card View */}
             <div className="mantine-hidden-from-sm">
                <Stack gap="xs">
                    {paginatedInterventions.map((intervention) => (
                        <Card key={intervention.id} shadow="sm" radius="md" withBorder p="sm">
                            <Group justify="space-between" align="center" mb={4} wrap="nowrap">
                                <Text fw={600} size="sm" truncate>{intervention.clientName}</Text>
                                <Text fw={700} size="sm">€{intervention.amount.toFixed(2)}</Text>
                            </Group>

                            <Group justify="space-between" align="center" wrap="nowrap">
                                <Group gap="xs">
                                    <Text size="xs" c="dimmed">
                                        {intervention.date.toDate().toLocaleDateString('it-IT')}
                                    </Text>
                                    <Badge variant="outline" color="blue" size="xs">
                                        {intervention.type}
                                    </Badge>
                                </Group>
                                <ActionIcon 
                                    color="red" 
                                    variant="subtle" 
                                    size="sm"
                                    onClick={() => handleDelete(intervention.id)}
                                >
                                    <Trash2 size={16} />
                                </ActionIcon>
                            </Group>

                            {intervention.notes && (
                                <Text size="xs" c="dimmed" lineClamp={1} mt={4} style={{ fontStyle: 'italic' }}>
                                    {intervention.notes}
                                </Text>
                            )}
                        </Card>
                    ))}
                    {paginatedInterventions.length === 0 && (
                        <Card p="md" withBorder>
                             <Text ta="center" size="sm" mb="xs">📭</Text>
                             <Text ta="center" size="xs" c="dimmed">Nessun intervento trovato.</Text>
                        </Card>
                    )}
                </Stack>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Group justify="center" mt="xl">
                    <Pagination
                        total={totalPages}
                        value={currentPage}
                        onChange={setCurrentPage}
                    />
                </Group>
            )}
        </Card>
    );
};
