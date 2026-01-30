import { Button, Card, Group, Select, SimpleGrid, Table, Text, TextInput, Title } from '@mantine/core';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../services/firebase';
import { SeasonalityChart } from './SeasonalityChart';

interface Intervention {
    id: string;
    type: string;
    date: Timestamp;
    amount: number;
}

interface ComparisonTableProps {
    interventions: Intervention[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ interventions }) => {
    const componentRef = useRef<HTMLDivElement>(null);
    // Default to empty to wait for user input
    const [period1Start, setPeriod1Start] = useState('');
    const [period1End, setPeriod1End] = useState('');
    const [period2Start, setPeriod2Start] = useState('');
    const [period2End, setPeriod2End] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>('Tutti');

    const [firestoreTypes, setFirestoreTypes] = useState<string[]>([]);

    const handleDownloadPDF = async () => {
        const chartsElement = document.getElementById('comparison-charts');
        const seasonalityElement = document.getElementById('seasonality-chart');
        const tableElement = document.getElementById('comparison-table');

        if (!chartsElement || !seasonalityElement || !tableElement) return;

        try {
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 297;
            const pageHeight = 210;
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);

            // Helper to add header
            const addHeader = (title: string) => {
                pdf.setFontSize(16);
                pdf.setTextColor(40, 40, 40);
                pdf.text(title, margin, margin + 5);

                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                const dateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                pdf.text(`Generato il: ${dateStr}`, pageWidth - margin, margin + 5, { align: 'right' });

                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, margin + 8, pageWidth - margin, margin + 8);
            };

            // Helper to add filter info
            const addFilters = (y: number) => {
                pdf.setFontSize(10);
                pdf.setTextColor(60, 60, 60);
                const text = `Periodo 1: ${new Date(period1Start).toLocaleDateString()} - ${new Date(period1End).toLocaleDateString()} | Periodo 2: ${new Date(period2Start).toLocaleDateString()} - ${new Date(period2End).toLocaleDateString()} | Tipologia: ${selectedType}`;
                pdf.text(text, margin, y);
                return y + 10;
            };

            // --- PAGE 1: Summary & Comparison Charts ---
            addHeader("Report Analisi Interventi");
            let yPos = margin + 15;
            yPos = addFilters(yPos);

            // Add Summary Text
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text("Riepilogo Totali:", margin, yPos);
            yPos += 7;

            pdf.setFontSize(10);
            pdf.text(`Periodo 1 (${new Date(period1Start).getFullYear()}): € ${totals.p1Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} (${totals.p1Count} interventi)`, margin, yPos);
            yPos += 5;
            pdf.text(`Periodo 2 (${new Date(period2Start).getFullYear()}): € ${totals.p2Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} (${totals.p2Count} interventi)`, margin, yPos);
            yPos += 10;

            // Capture Charts
            const canvas1 = await html2canvas(chartsElement, { scale: 2, useCORS: true, logging: false });
            const imgData1 = canvas1.toDataURL('image/png');
            const imgHeight1 = (canvas1.height * contentWidth) / canvas1.width;

            // Check if it fits, otherwise scale down or new page (it should fit easily on page 1)
            pdf.addImage(imgData1, 'PNG', margin, yPos, contentWidth, imgHeight1);

            // --- PAGE 2: Seasonality Chart ---
            pdf.addPage();
            addHeader("Analisi Stagionalità e Meteo");

            const canvas2 = await html2canvas(seasonalityElement, { scale: 2, useCORS: true, logging: false });
            const imgData2 = canvas2.toDataURL('image/png');
            const imgHeight2 = (canvas2.height * contentWidth) / canvas2.width;

            // Center vertically if possible, or just below header
            pdf.addImage(imgData2, 'PNG', margin, margin + 15, contentWidth, imgHeight2);

            // --- PAGE 3: Data Table ---
            pdf.addPage();
            addHeader("Dettaglio Dati");

            const canvas3 = await html2canvas(tableElement, { scale: 2, useCORS: true, logging: false });
            const imgData3 = canvas3.toDataURL('image/png');
            const imgHeight3 = (canvas3.height * contentWidth) / canvas3.width;

            // If table is very long, we might need to handle splitting, but for now just add it. 
            // If it's larger than page, jsPDF won't split automatically with addImage.
            // For a robust solution we'd need to slice the canvas or use autoTable, but let's try image first as requested.
            if (imgHeight3 > pageHeight - (margin * 2 + 15)) {
                // Simple handling: scale to fit height if too tall (might make text small)
                // OR just let it span multiple pages (complex). 
                // Let's try to fit width, and if height overflows, we crop? No, better to just print what fits or scale.
                // For now, let's just print it. If user complains about long tables, we'll implement autoTable.
                pdf.addImage(imgData3, 'PNG', margin, margin + 15, contentWidth, imgHeight3);
            } else {
                pdf.addImage(imgData3, 'PNG', margin, margin + 15, contentWidth, imgHeight3);
            }

            pdf.save('report-analisi-interventi.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Errore durante la generazione del PDF");
        }
    };

    // Helper for quick year selection
    const handleYearSelect = (year: number, period: 1 | 2) => {
        if (period === 1) {
            setPeriod1Start(`${year}-01-01`);
            setPeriod1End(`${year}-12-31`);
        } else {
            setPeriod2Start(`${year}-01-01`);
            setPeriod2End(`${year}-12-31`);
        }
    };

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear - 1);
        years.add(currentYear - 2);

        interventions.forEach(i => {
            years.add(i.date.toDate().getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [interventions]);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const docRef = doc(db, 'settings', 'general');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFirestoreTypes(docSnap.data().interventionTypes || []);
                }
            } catch (error) {
                console.error("Error fetching types:", error);
            }
        };
        fetchTypes();
    }, []);

    const interventionTypes = useMemo(() => {
        // Helper to normalize type
        const normalizeType = (str: string) => {
            return str.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };

        const existingTypes = new Set(interventions.map(i => normalizeType(i.type)));
        const allTypes = new Set([...Array.from(existingTypes), ...firestoreTypes.map(t => normalizeType(t))]);
        return ['Tutti', ...Array.from(allTypes).sort()];
    }, [interventions, firestoreTypes]);

    const stats = useMemo(() => {
        if (!period1Start || !period1End || !period2Start || !period2End) return [];

        const p1Start = new Date(period1Start).getTime();
        const p1End = new Date(period1End).getTime();
        const p2Start = new Date(period2Start).getTime();
        const p2End = new Date(period2End).getTime();

        const data: Record<string, { type: string; p1Amount: number; p2Amount: number; p1Count: number; p2Count: number }> = {};

        // Helper to normalize type
        const normalizeType = (str: string) => {
            return str.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };

        // Initialize data for all types found in the filtered range or all types if "Tutti"
        const relevantTypes = selectedType === 'Tutti'
            ? Array.from(new Set(interventions.map(i => normalizeType(i.type))))
            : [normalizeType(selectedType || 'tutti')];

        relevantTypes.forEach(type => {
            if(type === 'Tutti') return;
            data[type] = { type, p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 };
        });

        interventions.forEach(intervention => {
            const date = intervention.date.toDate().getTime();
            const type = normalizeType(intervention.type);

            if (selectedType !== 'Tutti' && type !== normalizeType(selectedType || '')) return;
            if (!data[type]) {
                // Initialize if not present (e.g. if it wasn't in the initial set but appeared later)
                data[type] = { type, p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 };
            }

            if (date >= p1Start && date <= p1End) {
                data[type].p1Amount += intervention.amount;
                data[type].p1Count += 1;
            } else if (date >= p2Start && date <= p2End) {
                data[type].p2Amount += intervention.amount;
                data[type].p2Count += 1;
            }
        });

        return Object.values(data).sort((a, b) => a.type.localeCompare(b.type));
    }, [interventions, period1Start, period1End, period2Start, period2End, selectedType]);

    const totals = useMemo(() => {
        return stats.reduce((acc, curr) => ({
            p1Amount: acc.p1Amount + curr.p1Amount,
            p2Amount: acc.p2Amount + curr.p2Amount,
            p1Count: acc.p1Count + curr.p1Count,
            p2Count: acc.p2Count + curr.p2Count
        }), { p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 });
    }, [stats]);

    const chartData = [
        {
            name: 'Periodo 1',
            Incassato: totals.p1Amount,
            Interventi: totals.p1Count
        },
        {
            name: 'Periodo 2',
            Incassato: totals.p2Amount,
            Interventi: totals.p2Count
        }
    ];

    return (
        <Card shadow="sm" radius="md" withBorder mb="xl" ref={componentRef}>
            <Group justify="space-between" mb="md">
                <Title order={3}>⚖️ Confronto Avanzato</Title>
                <Button variant="filled" onClick={handleDownloadPDF} leftSection={<Download size={18} />}>
                    <span className="hide-mobile">Scarica PDF</span>
                </Button>
            </Group>

            {/* Filters */}
            <Card withBorder radius="md" p="md" mb="xl" bg="gray.0">
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                    {/* Period 1 */}
                    <div>
                        <Text c="indigo" fw={700} mb="xs">Periodo 1 (Riferimento)</Text>
                         <Select
                            placeholder="Anno rapido"
                            data={availableYears.map(String)}
                            onChange={(val) => val && handleYearSelect(parseInt(val), 1)}
                            mb="xs"
                        />
                        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                            <TextInput type="date" value={period1Start} onChange={(e) => setPeriod1Start(e.target.value)} />
                            <TextInput type="date" value={period1End} onChange={(e) => setPeriod1End(e.target.value)} />
                        </SimpleGrid>
                    </div>

                    {/* Period 2 */}
                    <div>
                        <Text c="teal" fw={700} mb="xs">Periodo 2 (Confronto)</Text>
                        <Select
                            placeholder="Anno rapido"
                            data={availableYears.map(String)}
                            onChange={(val) => val && handleYearSelect(parseInt(val), 2)}
                            mb="xs"
                        />
                        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                            <TextInput type="date" value={period2Start} onChange={(e) => setPeriod2Start(e.target.value)} />
                            <TextInput type="date" value={period2End} onChange={(e) => setPeriod2End(e.target.value)} />
                        </SimpleGrid>
                    </div>

                    {/* Type Filter */}
                    <div>
                         <Text fw={600} mb="xs">Tipologia</Text>
                         <Select
                            data={interventionTypes}
                            value={selectedType}
                            onChange={setSelectedType}
                        />
                    </div>
                </SimpleGrid>
            </Card>

            {period1Start && period1End && period2Start && period2End && (
                <>
                    {/* Charts */}
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mb="xl" id="comparison-charts">
                        <div style={{ height: '300px' }}>
                            <Text ta="center" fw={600} mb="md">Incassato (€)</Text>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: any) => `€ ${Number(value).toLocaleString('it-IT')}`} />
                                    <Bar dataKey="Incassato" radius={[4, 4, 0, 0]}>
                                        {
                                            chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-teal-6)'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ height: '300px' }}>
                            <Text ta="center" fw={600} mb="md">Numero Interventi</Text>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="Interventi" radius={[4, 4, 0, 0]}>
                                        {
                                            chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-teal-6)'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </SimpleGrid>

                    {/* Seasonality Chart */}
                    <div id="seasonality-chart" style={{ marginBottom: '2rem' }}>
                        <SeasonalityChart
                            interventions={interventions}
                            period1Start={period1Start}
                            period1End={period1End}
                            period2Start={period2Start}
                            period2End={period2End}
                            selectedType={selectedType || 'Tutti'}
                        />
                    </div>

                    {/* Detailed Table */}
                    <div id="comparison-table">
                         <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Tipologia</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', color: 'var(--mantine-color-indigo-6)' }}>Incasso P1</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', color: 'var(--mantine-color-teal-6)' }}>Incasso P2</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Diff. €</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', color: 'var(--mantine-color-indigo-6)' }}>Interv. P1</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', color: 'var(--mantine-color-teal-6)' }}>Interv. P2</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Diff. #</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {stats.map((stat) => {
                                    const diffAmount = stat.p2Amount - stat.p1Amount;
                                    const diffCount = stat.p2Count - stat.p1Count;
                                    const isPositiveAmount = diffAmount >= 0;
                                    const isPositiveCount = diffCount >= 0;

                                    return (
                                        <Table.Tr key={stat.type}>
                                            <Table.Td fw={500}>{stat.type}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>€ {stat.p1Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>€ {stat.p2Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right', color: isPositiveAmount ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-red-6)', fontWeight: 'bold' }}>
                                                {isPositiveAmount ? '+' : ''}€ {diffAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>{stat.p1Count}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>{stat.p2Count}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right', color: isPositiveCount ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-red-6)', fontWeight: 'bold' }}>
                                                {isPositiveCount ? '+' : ''}{diffCount}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                                <Table.Tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--mantine-color-gray-3)' }}>
                                    <Table.Td>TOTALE</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>€ {totals.p1Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>€ {totals.p2Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right', color: (totals.p2Amount - totals.p1Amount) >= 0 ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-red-6)' }}>
                                        {(totals.p2Amount - totals.p1Amount) >= 0 ? '+' : ''}€ {(totals.p2Amount - totals.p1Amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{totals.p1Count}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{totals.p2Count}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right', color: (totals.p2Count - totals.p1Count) >= 0 ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-red-6)' }}>
                                        {(totals.p2Count - totals.p1Count) >= 0 ? '+' : ''}{totals.p2Count - totals.p1Count}
                                    </Table.Td>
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </div>
                </>
            )}
        </Card>
    );
};
