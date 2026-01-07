import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Timestamp } from 'firebase/firestore';

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>💰 Incassato Mensile</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="amount" fill="var(--primary)" name="Incassato (€)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>📈 Numero Interventi</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="var(--success)" name="Quantità" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
