import React from 'react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { X } from 'lucide-react';

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
    if (!isOpen) return null;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div style={{ background: 'var(--surface)', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 100, minWidth: '250px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Giorno {d.day}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>{year1}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.p1.date}</p>
                            <div style={{ marginTop: '0.25rem' }}>
                                <p>Interventi: <strong>{d.p1.count}</strong></p>
                                <p style={{ color: '#ef4444' }}>Max: {d.p1.tempMax}°C</p>
                                <p style={{ color: '#3b82f6' }}>Min: {d.p1.tempMin}°C</p>
                                <p style={{ color: '#6b7280' }}>Pioggia: {d.p1.rain}mm</p>
                            </div>
                        </div>
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem' }}>{year2}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.p2.date}</p>
                            <div style={{ marginTop: '0.25rem' }}>
                                <p>Interventi: <strong>{d.p2.count}</strong></p>
                                <p style={{ color: '#ef4444' }}>Max: {d.p2.tempMax}°C</p>
                                <p style={{ color: '#3b82f6' }}>Min: {d.p2.tempMin}°C</p>
                                <p style={{ color: '#6b7280' }}>Pioggia: {d.p2.rain}mm</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: window.innerWidth < 768 ? 0 : '1rem'
        }}>
            <div style={{
                background: 'var(--background)',
                borderRadius: window.innerWidth < 768 ? 0 : 'var(--radius)',
                width: '100%',
                maxWidth: '900px',
                height: window.innerWidth < 768 ? '100%' : 'auto',
                maxHeight: window.innerWidth < 768 ? '100%' : '90vh',
                overflow: 'auto',
                padding: '1.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                        Dettaglio {monthName}: {year1} vs {year2}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ height: '400px', width: '100%', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis dataKey="day" label={{ value: 'Giorno', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId="left" label={{ value: 'Interventi', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight' }} domain={['auto', 'auto']} />

                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" height={36} />

                            <Bar yAxisId="left" dataKey="p1.count" name={`Interventi ${year1}`} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="left" dataKey="p2.count" name={`Interventi ${year2}`} fill="var(--success)" radius={[4, 4, 0, 0]} />

                            <Line yAxisId="right" type="monotone" dataKey="p1.tempMax" name={`Max ${year1}`} stroke="var(--primary)" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="p1.tempMin" name={`Min ${year1}`} stroke="var(--primary)" strokeDasharray="3 3" dot={false} strokeWidth={2} opacity={0.7} />

                            <Line yAxisId="right" type="monotone" dataKey="p2.tempMax" name={`Max ${year2}`} stroke="var(--success)" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="p2.tempMin" name={`Min ${year2}`} stroke="var(--success)" strokeDasharray="3 3" dot={false} strokeWidth={2} opacity={0.7} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
