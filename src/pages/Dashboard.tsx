import { ActionIcon, Affix, AppShell, Box, Button, Card, Container, Group, Modal, Select, SimpleGrid, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, where, writeBatch } from 'firebase/firestore';
import { Filter, LogOut, Plus, Settings } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComparisonTable } from '../components/ComparisonTable';
import { DashboardCharts } from '../components/DashboardCharts';
import { InterventionForm } from '../components/InterventionForm';
import { InterventionList } from '../components/InterventionList';
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

export const Dashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [interventionTypes, setInterventionTypes] = useState<string[]>([]);
    const [opened, { open, close }] = useDisclosure(false);

    // Filter States
    const [selectedType, setSelectedType] = useState<string | null>('Tutti');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(0, 1); // Start of current year
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        return date.toISOString().split('T')[0];
    });

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'interventions'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Intervention[];
            setInterventions(data);
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

    // Filtered Data for Charts
    const filteredInterventions = useMemo(() => {
        return interventions.filter(intervention => {
            const date = intervention.date.toDate();
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end day

            const normalizedSelectedType = (selectedType || 'Tutti').trim().toLowerCase();
            const normalizedInterventionType = intervention.type.trim().toLowerCase();

            const matchesType = normalizedSelectedType === 'tutti' || normalizedInterventionType === normalizedSelectedType;
            const matchesDate = date >= start && date <= end;

            return matchesType && matchesDate;
        });
    }, [interventions, selectedType, startDate, endDate]);

    // Summary Statistics (Global)
    const summaryStats = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let yearTotal = 0;
        let monthTotal = 0;

        interventions.forEach(i => {
            const date = i.date.toDate();
            if (date.getFullYear() === currentYear) {
                yearTotal += i.amount;
                if (date.getMonth() === currentMonth) {
                    monthTotal += i.amount;
                }
            }
        });

        return { yearTotal, monthTotal };
    }, [interventions]);

    // Filtered Summary
    const filteredTotal = useMemo(() => {
        return filteredInterventions.reduce((sum, i) => sum + i.amount, 0);
    }, [filteredInterventions]);

    return (
        <AppShell
            header={{ height: 60 }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                    <Group wrap="nowrap">
                        <Title order={3} size="h4">📊 Dashboard</Title>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                        <Button
                             variant="default"
                             onClick={() => navigate('/settings')}
                             leftSection={<Settings size={16} />}
                             title="Impostazioni"
                             px="xs"
                        >
                            <Text span visibleFrom="sm" size="sm">Settings</Text>
                        </Button>
                        <Button
                            color="red"
                            variant="subtle"
                            onClick={signOut}
                            leftSection={<LogOut size={16} />}
                            title="Esci"
                            px="xs"
                        >
                            <Text span visibleFrom="sm" size="sm">Esci</Text>
                        </Button>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="xl">
                    <div style={{ marginBottom: '2rem' }}>
                        <Text size="lg" fw={500}>Bentornato,</Text>
                        <Text size="xl" fw={700} c="blue">{user?.displayName}</Text>
                    </div>

                    {/* Summary Cards */}
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
                        <Card shadow="sm" radius="md" p="md" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
                            <Text size="xs" tt="uppercase" fw={700} style={{ opacity: 0.9 }}>Incasso Anno Corrente</Text>
                            <Text size="xl" fw={700} style={{ fontSize: '2rem' }}>€{summaryStats.yearTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
                        </Card>
                        <Card shadow="sm" radius="md" p="md" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                            <Text size="xs" tt="uppercase" fw={700} style={{ opacity: 0.9 }}>Incasso Mese Corrente</Text>
                            <Text size="xl" fw={700} style={{ fontSize: '2rem' }}>€{summaryStats.monthTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
                        </Card>
                        <Card shadow="sm" radius="md" p="md" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                            <Text size="xs" tt="uppercase" fw={700} style={{ opacity: 0.9 }}>Incasso Periodo Selezionato</Text>
                            <Text size="xl" fw={700} style={{ fontSize: '2rem' }}>€{filteredTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
                        </Card>
                    </SimpleGrid>

                    {/* Filters for Charts */}
                    <Card shadow="sm" radius="md" withBorder mb="xl">
                        <Group mb="md">
                            <ThemeIcon variant="light" size="lg">
                                <Filter size={20} />
                            </ThemeIcon>
                            <Title order={4}>Filtri Analisi</Title>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 3 }}>
                            <Select
                                label="Tipologia"
                                data={['Tutti', ...interventionTypes]}
                                value={selectedType}
                                onChange={setSelectedType}
                            />
                            <TextInput
                                label="Da"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <TextInput
                                label="A"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </SimpleGrid>
                    </Card>

                    <DashboardCharts interventions={filteredInterventions} />

                    <Title order={2} mt={50} mb="md">Confronto Periodi</Title>
                    <ComparisonTable interventions={interventions} />

                    <Box visibleFrom="sm" style={{ marginBottom: '2rem', marginTop: '3rem' }}>
                        <InterventionForm />
                    </Box>

                    <Affix position={{ bottom: 20, right: 20 }} hiddenFrom="sm">
                        <ActionIcon 
                            onClick={open} 
                            radius="xl" 
                            size={60} 
                            color="blue" 
                            variant="filled" 
                            style={{ boxShadow: 'var(--mantine-shadow-xl)' }}
                        >
                            <Plus size={30} />
                        </ActionIcon>
                    </Affix>

                    <Modal 
                        opened={opened} 
                        onClose={close} 
                        title="Nuovo Intervento" 
                        centered
                        closeButtonProps={{
                            size: 'xl',
                            iconSize: 30,
                            radius: 'xl',
                            'aria-label': 'Chiudi modale',
                        }}
                    >
                        <InterventionForm onSuccess={close} />
                    </Modal>

                    <InterventionList />
                </Container>
            </AppShell.Main>
        </AppShell>
    );
};
