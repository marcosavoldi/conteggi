import React, { useMemo, useState, useEffect } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area
} from 'recharts';
import { fetchWeatherData } from '../services/weather';
import { CloudSun, Thermometer } from 'lucide-react';

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
            p1Temp: 0,
            p2Temp: 0,
            p1Rain: 0,
            p2Rain: 0,
            p1Days: 0,
            p2Days: 0
        }));

        // Helper to process interventions
        const processInterventions = (startStr: string, endStr: string, key: 'p1Count' | 'p2Count') => {
            const start = new Date(startStr).getTime();
            const end = new Date(endStr).getTime();

            interventions.forEach(i => {
                const date = i.date.toDate();
                const time = date.getTime();

                if (selectedType !== 'Tutti' && i.type !== selectedType) return;

                if (time >= start && time <= end) {
                    const month = date.getMonth();
                    data[month][key]++;
                }
            });
        };

        processInterventions(period1Start, period1End, 'p1Count');
        processInterventions(period2Start, period2End, 'p2Count');

        // Helper to process weather
        const processWeather = (weatherMap: any, keyTemp: 'p1Temp' | 'p2Temp', keyRain: 'p1Rain' | 'p2Rain', keyDays: 'p1Days' | 'p2Days') => {
            if (!weatherMap) return;

            Object.values(weatherMap).forEach((day: any) => {
                const date = new Date(day.date);
                const month = date.getMonth();

                data[month][keyTemp] += day.temperature;
                data[month][keyRain] += day.precipitation;
                data[month][keyDays]++;
            });
        };

        processWeather(weatherData1, 'p1Temp', 'p1Rain', 'p1Days');
        processWeather(weatherData2, 'p2Temp', 'p2Rain', 'p2Days');

        // Calculate averages
        data.forEach(d => {
            if (d.p1Days > 0) {
                d.p1Temp = parseFloat((d.p1Temp / d.p1Days).toFixed(1));
                d.p1Rain = parseFloat(d.p1Rain.toFixed(1));
            }
            if (d.p2Days > 0) {
                d.p2Temp = parseFloat((d.p2Temp / d.p2Days).toFixed(1));
                d.p2Rain = parseFloat(d.p2Rain.toFixed(1));
            }
        });

        return data;
    }, [interventions, period1Start, period1End, period2Start, period2End, selectedType, weatherData1, weatherData2]);

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
                                    <p>🌡️ {data.p1Temp}°C</p>
                                    <p>🌧️ {data.p1Rain}mm</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>Periodo 2</p>
                            <p>Interventi: <strong>{data.p2Count}</strong></p>
                            {data.p2Days > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    <p>🌡️ {data.p2Temp}°C</p>
                                    <p>🌧️ {data.p2Rain}mm</p>
                                </div>
                            )}
                        </div>
                    </div>
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
                    <ComposedChart data={chartData}>
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
                                <Line yAxisId="right" type="monotone" dataKey="p1Temp" name="Temp P1" stroke="var(--primary)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="p2Temp" name="Temp P2" stroke="var(--success)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Dati meteo storici per Bergamo (Open-Meteo API)
            </p>
        </div>
    );
};
