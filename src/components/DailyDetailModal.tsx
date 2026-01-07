import React from 'react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { X } from 'lucide-react';

interface DailyData {
    day: number;
    date: string;
    count: number;
    tempMax: number;
    tempMin: number;
    rain: number;
}

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    monthName: string;
    year: number;
    data: DailyData[];
    color: string;
}

export const DailyDetailModal: React.FC<DailyDetailModalProps> = ({
    isOpen, onClose, monthName, year, data, color
}) => {
    if (!isOpen) return null;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div style={{ background: 'var(--surface)', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 100 }}>
                    <p style={{ fontWeight: 'bold' }}>{d.date}</p>
                    <p>Interventi: <strong>{d.count}</strong></p>
                    <p style={{ color: '#ef4444' }}>Max: {d.tempMax}°C</p>
                    <p style={{ color: '#3b82f6' }}>Min: {d.tempMin}°C</p>
                    <p style={{ color: '#6b7280' }}>Pioggia: {d.rain}mm</p>
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
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--background)',
                borderRadius: 'var(--radius)',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '1.5rem',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text)'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                    Dettaglio {monthName} {year}
                </h2>

                <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis dataKey="day" label={{ value: 'Giorno', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId="left" label={{ value: 'Interventi', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight' }} domain={['auto', 'auto']} />

                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            <Bar yAxisId="left" dataKey="count" name="Interventi" fill={color} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="tempMax" name="Max Temp" stroke="#ef4444" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="tempMin" name="Min Temp" stroke="#3b82f6" dot={false} strokeWidth={2} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
