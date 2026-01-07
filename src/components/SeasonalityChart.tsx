```typescript
import React, { useMemo, useState, useEffect } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { fetchWeatherData } from '../services/weather';
import { CloudSun } from 'lucide-react';
import { DailyDetailModal } from './DailyDetailModal';

interface Intervention {
    id: string;
    type: string;
    date: any; // Timestamp
    amount: number;
}

interface SeasonalityChartProps {
    interventions: Intervention[];
    period1Start: string;
    period1End: string;
    period2Start: string;
    period2End: string;
    selectedType: string;
}

export const SeasonalityChart: React.FC<SeasonalityChartProps> = ({
    interventions,
    period1Start,
    period1End,
    period2Start,
    period2End,
    selectedType
}) => {
    const [weatherData1, setWeatherData1] = useState<any>(null);
    const [weatherData2, setWeatherData2] = useState<any>(null);
    const [showWeather, setShowWeather] = useState(false);
    const [loadingWeather, setLoadingWeather] = useState(false);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);
    const [modalMonth, setModalMonth] = useState('');
    const [modalYear, setModalYear] = useState(0);
    const [modalColor, setModalColor] = useState('');

    useEffect(() => {
        const loadWeather = async () => {
            setLoadingWeather(true);
            const w1 = await fetchWeatherData(period1Start, period1End);
            const w2 = await fetchWeatherData(period2Start, period2End);
            setWeatherData1(w1);
            setWeatherData2(w2);
            setLoadingWeather(false);
        };
        loadWeather();
    }, [period1Start, period1End, period2Start, period2End]);

    const chartData = useMemo(() => {
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

        // Initialize structure
        const data = months.map((name, index) => ({
            name,
            monthIndex: index,
            p1Count: 0,
            p2Count: 0,
            p1TempMax: 0,
            p1TempMin: 0,
            p2TempMax: 0,
            p2TempMin: 0,
            p1Rain: 0,
            p2Rain: 0,
            p1Days: 0,
            p2Days: 0
        }));

        // Helper to normalize type
        const normalizeType = (str: string) => {
            return str.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };

        // Helper to process interventions
        const processInterventions = (startStr: string, endStr: string, key: 'p1Count' | 'p2Count') => {
            const start = new Date(startStr).getTime();
            const end = new Date(endStr).getTime();

            interventions.forEach(i => {
                const date = i.date.toDate();
                const time = date.getTime();

                const type = normalizeType(i.type);
                const targetType = selectedType === 'Tutti' ? 'Tutti' : normalizeType(selectedType);

                if (targetType !== 'Tutti' && type !== targetType) return;

                if (time >= start && time <= end) {
                    const month = date.getMonth();
                    data[month][key]++;
                }
            });
        };

        processInterventions(period1Start, period1End, 'p1Count');
        processInterventions(period2Start, period2End, 'p2Count');

        // Helper to process weather
        const processWeather = (weatherMap: any, keyPrefix: 'p1' | 'p2') => {
            if (!weatherMap) return;

            Object.values(weatherMap).forEach((day: any) => {
                const date = new Date(day.date);
                const month = date.getMonth();

                data[month][`${ keyPrefix } TempMax` as keyof typeof data[0]] += day.tempMax;
                data[month][`${ keyPrefix } TempMin` as keyof typeof data[0]] += day.tempMin;
                data[month][`${ keyPrefix } Rain` as keyof typeof data[0]] += day.precipitation;
                data[month][`${ keyPrefix } Days` as keyof typeof data[0]]++;
            });
        };

        processWeather(weatherData1, 'p1');
        processWeather(weatherData2, 'p2');

        // Calculate averages
        data.forEach(d => {
            if (d.p1Days > 0) {
                d.p1TempMax = parseFloat((d.p1TempMax / d.p1Days).toFixed(1));
                d.p1TempMin = parseFloat((d.p1TempMin / d.p1Days).toFixed(1));
                d.p1Rain = parseFloat(d.p1Rain.toFixed(1));
            }
            if (d.p2Days > 0) {
                d.p2TempMax = parseFloat((d.p2TempMax / d.p2Days).toFixed(1));
                d.p2TempMin = parseFloat((d.p2TempMin / d.p2Days).toFixed(1));
                d.p2Rain = parseFloat(d.p2Rain.toFixed(1));
            }
        });

        return data;
    }, [interventions, period1Start, period1End, period2Start, period2End, selectedType, weatherData1, weatherData2]);

    const handleChartClick = (data: any) => {
        if (!data || !data.activePayload) return;

        const monthIndex = data.activePayload[0].payload.monthIndex;
        const monthName = data.activePayload[0].payload.name;

        // Determine which line was clicked (or default to P1 if ambiguous)
        // Recharts doesn't always give clear info on which line was clicked in composed chart,
        // so we might need to ask user or show both. For now, let's try to infer or show P1 by default.
        // Actually, let's show the period that has data or the most recent one.
        // Better yet, let's show P2 (current year usually) if available, else P1.

        // For simplicity, let's assume we want to see the "Period 2" details as it's usually the current year.
        // Or we could check which data point is closer to the mouse, but that's complex.
        // Let's default to Period 2 (Success Color) as it's the "comparison target".

        // Wait, the user said "click on the graph". Let's show a modal that allows switching between P1 and P2?
        // Or just show P2 by default. Let's start with P2 (Current).

        const year = new Date(period2Start).getFullYear();
        const weatherMap = weatherData2;
        const color = 'var(--success)';
        const periodStart = new Date(period2Start);
        const periodEnd = new Date(period2End);

        // Filter daily data for that month
        const dailyData: any[] = [];

        // Helper to normalize type
        const normalizeType = (str: string) => {
            return str.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };

        // 1. Get Interventions for that month/year
        const monthInterventions: Record<number, number> = {};
        interventions.forEach(i => {
            const date = i.date.toDate();
            const type = normalizeType(i.type);
            const targetType = selectedType === 'Tutti' ? 'Tutti' : normalizeType(selectedType);

            if (targetType !== 'Tutti' && type !== targetType) return;

            if (date.getFullYear() === year && date.getMonth() === monthIndex) {
                const day = date.getDate();
                monthInterventions[day] = (monthInterventions[day] || 0) + 1;
            }
        });

        // 2. Get Weather for that month/year
        // We need to iterate through all days of the month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${ year } -${ String(monthIndex + 1).padStart(2, '0') } -${ String(d).padStart(2, '0') } `;
            const weather = weatherMap ? weatherMap[dateStr] : null;

            dailyData.push({
                day: d,
                date: dateStr,
                count: monthInterventions[d] || 0,
                tempMax: weather ? weather.tempMax : 0,
                tempMin: weather ? weather.tempMin : 0,
                rain: weather ? weather.precipitation : 0
            });
        }

        setModalData(dailyData);
        setModalMonth(monthName);
        setModalYear(year);
        setModalColor(color);
        setModalOpen(true);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ background: 'var(--surface)', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{label}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>Periodo 1</p>
                            <p>Interventi: <strong>{data.p1Count}</strong></p>
                            {data.p1Days > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    <p>🌡️ Max: {data.p1TempMax}°C</p>
                                    <p>❄️ Min: {data.p1TempMin}°C</p>
                                    <p>🌧️ {data.p1Rain}mm</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>Periodo 2</p>
                            <p>Interventi: <strong>{data.p2Count}</strong></p>
                            {data.p2Days > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    <p>🌡️ Max: {data.p2TempMax}°C</p>
                                    <p>❄️ Min: {data.p2TempMin}°C</p>
                                    <p>🌧️ {data.p2Rain}mm</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Clicca per dettagli giornalieri (Periodo 2)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>📈 Stagionalità e Meteo</h3>
                <button
                    className="btn"
                    onClick={() => setShowWeather(!showWeather)}
                    style={{
                        background: showWeather ? 'var(--primary)' : 'var(--background)',
                        color: showWeather ? 'white' : 'var(--text)',
                        border: '1px solid var(--border)'
                    }}
                >
                    {loadingWeather ? <span className="spin">⌛</span> : <CloudSun size={18} />}
                    <span className="hide-mobile" style={{ marginLeft: '0.5rem' }}>
                        {showWeather ? 'Nascondi Meteo' : 'Mostra Meteo'}
                    </span>
                </button>
            </div>

            <div style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} onClick={handleChartClick}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" label={{ value: 'Interventi', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" hide={!showWeather} label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight' }} domain={['auto', 'auto']} />

                        <Tooltip content={<CustomTooltip />} />
                        <Legend />

                        <Line yAxisId="left" type="monotone" dataKey="p1Count" name="Interventi P1" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="left" type="monotone" dataKey="p2Count" name="Interventi P2" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />

                        {showWeather && (
                            <>
                                <Line yAxisId="right" type="monotone" dataKey="p1TempMax" name="Max P1" stroke="var(--primary)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="p2TempMax" name="Max P2" stroke="var(--success)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Dati meteo storici per Bergamo (Open-Meteo API). Clicca sul grafico per i dettagli giornalieri.
            </p>

            <DailyDetailModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                monthName={modalMonth}
                year={modalYear}
                data={modalData}
                color={modalColor}
            />
        </div>
    );
};
```
