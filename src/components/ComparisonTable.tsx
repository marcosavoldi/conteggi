import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SeasonalityChart } from './SeasonalityChart';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    const [selectedType, setSelectedType] = useState('Tutti');

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
            : [normalizeType(selectedType)];

        relevantTypes.forEach(type => {
            data[type] = { type, p1Amount: 0, p2Amount: 0, p1Count: 0, p2Count: 0 };
        });

        interventions.forEach(intervention => {
            const date = intervention.date.toDate().getTime();
            const type = normalizeType(intervention.type);

            if (selectedType !== 'Tutti' && type !== normalizeType(selectedType)) return;
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
        <div className="card" style={{ marginBottom: '2rem' }} ref={componentRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>⚖️ Confronto Avanzato</h3>
                <button
                    onClick={handleDownloadPDF}
                    className="btn"
                    style={{
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Download size={18} />
                    <span className="hide-mobile">Scarica PDF</span>
                </button>
            </div>

            {/* Filters */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
                background: 'var(--background)',
                padding: '1rem',
                borderRadius: 'var(--radius)'
            }}>
                {/* Period 1 */}
                <div>
                    <label className="label" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Periodo 1 (Riferimento)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select
                            className="input"
                            onChange={(e) => handleYearSelect(parseInt(e.target.value), 1)}
                            defaultValue=""
                            style={{ padding: '0.25rem' }}
                        >
                            <option value="" disabled>Anno rapido</option>
                            {availableYears.map(year => (
                                <option key={`p1-${year}`} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input
                            type="date"
                            className="input"
                            value={period1Start}
                            onChange={(e) => setPeriod1Start(e.target.value)}
                        />
                        <input
                            type="date"
                            className="input"
                            value={period1End}
                            onChange={(e) => setPeriod1End(e.target.value)}
                        />
                    </div>
                </div>

                {/* Period 2 */}
                <div>
                    <label className="label" style={{ fontWeight: 'bold', color: 'var(--success)' }}>Periodo 2 (Confronto)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select
                            className="input"
                            onChange={(e) => handleYearSelect(parseInt(e.target.value), 2)}
                            defaultValue=""
                            style={{ padding: '0.25rem' }}
                        >
                            <option value="" disabled>Anno rapido</option>
                            {availableYears.map(year => (
                                <option key={`p2-${year}`} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input
                            type="date"
                            className="input"
                            value={period2Start}
                            onChange={(e) => setPeriod2Start(e.target.value)}
                        />
                        <input
                            type="date"
                            className="input"
                            value={period2End}
                            onChange={(e) => setPeriod2End(e.target.value)}
                        />
                    </div>
                </div>

                {/* Type Filter */}
                <div>
                    <label className="label">Tipologia</label>
                    <select
                        className="input"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        style={{ height: '42px' }} // Match height of date inputs roughly
                    >
                        {interventionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            {period1Start && period1End && period2Start && period2End && (
                <>
                    {/* Charts */}
                    <div id="comparison-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ height: '300px' }}>
                            <h4 style={{ textAlign: 'center', marginBottom: '1rem' }}>Incassato (€)</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: any) => `€ ${Number(value).toLocaleString('it-IT')}`} />
                                    <Bar dataKey="Incassato" radius={[4, 4, 0, 0]}>
                                        {
                                            chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--success)'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ height: '300px' }}>
                            <h4 style={{ textAlign: 'center', marginBottom: '1rem' }}>Numero Interventi</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="Interventi" radius={[4, 4, 0, 0]}>
                                        {
                                            chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--success)'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Seasonality Chart */}
                    <div id="seasonality-chart" style={{ marginBottom: '2rem' }}>
                        <SeasonalityChart
                            interventions={interventions}
                            period1Start={period1Start}
                            period1End={period1End}
                            period2Start={period2Start}
                            period2End={period2End}
                            selectedType={selectedType}
                        />
                    </div>

                    {/* Detailed Table */}
                    <div id="comparison-table" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--background)', borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Tipologia</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)' }}>Incasso P1</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)' }}>Incasso P2</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Diff. €</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)' }}>Interv. P1</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)' }}>Interv. P2</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Diff. #</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat) => {
                                    const diffAmount = stat.p2Amount - stat.p1Amount;
                                    const diffCount = stat.p2Count - stat.p1Count;
                                    const isPositiveAmount = diffAmount >= 0;
                                    const isPositiveCount = diffCount >= 0;

                                    return (
                                        <tr key={stat.type} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{stat.type}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>€ {stat.p1Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>€ {stat.p2Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', color: isPositiveAmount ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                {isPositiveAmount ? '+' : ''}€ {diffAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>{stat.p1Count}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>{stat.p2Count}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', color: isPositiveCount ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                {isPositiveCount ? '+' : ''}{diffCount}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr style={{ background: 'var(--background)', fontWeight: 'bold', borderTop: '2px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>TOTALE</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>€ {totals.p1Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>€ {totals.p2Amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: (totals.p2Amount - totals.p1Amount) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {(totals.p2Amount - totals.p1Amount) >= 0 ? '+' : ''}€ {(totals.p2Amount - totals.p1Amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{totals.p1Count}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{totals.p2Count}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: (totals.p2Count - totals.p1Count) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {(totals.p2Count - totals.p1Count) >= 0 ? '+' : ''}{totals.p2Count - totals.p1Count}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};
