import { Card, SimpleGrid, Title } from '@mantine/core';
import { Timestamp } from 'firebase/firestore';
import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Intervention {
    id: string;
    type: string;
    clientName: string;
    date: Timestamp;
    amount: number;
}

interface DashboardChartsProps {
    interventions: Intervention[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ interventions }) => {
    const data = useMemo(() => {
        const monthlyData: Record<string, { name: string; amount: number; count: number }> = {};

        // Initialize all months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.forEach(month => {
            monthlyData[month] = { name: month, amount: 0, count: 0 };
        });

        interventions.forEach(intervention => {
            const date = intervention.date.toDate();
            const month = months[date.getMonth()];
            monthlyData[month].amount += intervention.amount;
            monthlyData[month].count += 1;
        });

        return Object.values(monthlyData);
    }, [interventions]);

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
            <Card shadow="sm" radius="md" withBorder>
                <Title order={3} mb="md">💰 Incassato Mensile</Title>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="amount" fill="var(--mantine-color-blue-6)" name="Incassato (€)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card shadow="sm" radius="md" withBorder>
                <Title order={3} mb="md">📈 Numero Interventi</Title>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="var(--mantine-color-green-6)" name="Quantità" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </SimpleGrid>
    );
};
