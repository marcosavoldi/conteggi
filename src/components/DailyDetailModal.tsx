import { Modal, Paper, SimpleGrid, Text } from '@mantine/core';
import React from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

export interface DailyComparisonData {
    day: number;
    p1: {
        date: string;
        count: number;
        tempMax: number;
        tempMin: number;
        rain: number;
    };
    p2: {
        date: string;
        count: number;
        tempMax: number;
        tempMin: number;
        rain: number;
    };
}

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    monthName: string;
    year1: number;
    year2: number;
    data: DailyComparisonData[];
}

export const DailyDetailModal: React.FC<DailyDetailModalProps> = ({
    isOpen, onClose, monthName, year1, year2, data
}) => {
    
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <Paper p="md" shadow="md" withBorder>
                    <Text fw={700} mb="xs">Giorno {d.day}</Text>

                    <SimpleGrid cols={2} spacing="md">
                        <div>
                            <Text fw={600} c="blue.6" size="sm">{year1}</Text>
                            <Text size="xs" c="dimmed">{d.p1.date}</Text>
                            <div style={{ marginTop: '0.25rem' }}>
                                <Text size="sm">Interventi: <strong>{d.p1.count}</strong></Text>
                                <Text size="xs" c="red">Max: {d.p1.tempMax}°C</Text>
                                <Text size="xs" c="blue">Min: {d.p1.tempMin}°C</Text>
                                <Text size="xs" c="dimmed">Pioggia: {d.p1.rain}mm</Text>
                            </div>
                        </div>
                        <div>
                            <Text fw={600} c="green.6" size="sm">{year2}</Text>
                            <Text size="xs" c="dimmed">{d.p2.date}</Text>
                            <div style={{ marginTop: '0.25rem' }}>
                                <Text size="sm">Interventi: <strong>{d.p2.count}</strong></Text>
                                <Text size="xs" c="red">Max: {d.p2.tempMax}°C</Text>
                                <Text size="xs" c="blue">Min: {d.p2.tempMin}°C</Text>
                                <Text size="xs" c="dimmed">Pioggia: {d.p2.rain}mm</Text>
                            </div>
                        </div>
                    </SimpleGrid>
                </Paper>
            );
        }
        return null;
    };

    return (
        <Modal 
            opened={isOpen} 
            onClose={onClose} 
            title={`Dettaglio ${monthName}: ${year1} vs ${year2}`} 
            size="xl" 
            fullScreen={false}
            centered
        >
            <div style={{ height: '400px', width: '100%', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                        <XAxis dataKey="day" label={{ value: 'Giorno', position: 'insideBottom', offset: -5 }} />
                        <YAxis yAxisId="left" label={{ value: 'Interventi', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight' }} domain={['auto', 'auto']} />

                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} />

                        <Bar yAxisId="left" dataKey="p1.count" name={`Interventi ${year1}`} fill="var(--mantine-color-blue-6)" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="p2.count" name={`Interventi ${year2}`} fill="var(--mantine-color-green-6)" radius={[4, 4, 0, 0]} />

                        <Line yAxisId="right" type="monotone" dataKey="p1.tempMax" name={`Max ${year1}`} stroke="var(--mantine-color-blue-6)" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="p1.tempMin" name={`Min ${year1}`} stroke="var(--mantine-color-blue-6)" strokeDasharray="3 3" dot={false} strokeWidth={2} opacity={0.7} />

                        <Line yAxisId="right" type="monotone" dataKey="p2.tempMax" name={`Max ${year2}`} stroke="var(--mantine-color-green-6)" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="p2.tempMin" name={`Min ${year2}`} stroke="var(--mantine-color-green-6)" strokeDasharray="3 3" dot={false} strokeWidth={2} opacity={0.7} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Modal>
    );
};
