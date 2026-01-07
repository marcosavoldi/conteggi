import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { writeBatch, collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FileSpreadsheet, Loader } from 'lucide-react';

interface ExcelRow {
    DATA: number | string;
    CLIENTE: string;
    'TIPO INTERVENTO': string;
    IMPORTO: number | string;
    NOTE?: string;
}

export const ExcelImport: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const parseExcelDate = (excelDate: number | string, targetYear: number): Date | null => {
        let date: Date | null = null;

        if (typeof excelDate === 'number') {
            // Excel date serial number
            date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        } else if (typeof excelDate === 'string') {
            // Try parsing string date (e.g., "10/01/24")
            const parts = excelDate.split('/');
            if (parts.length === 3) {
                let year = parseInt(parts[2]);
                if (year < 100) year += 2000;
                date = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }

        if (!date || isNaN(date.getTime())) {
            return null;
        }

        // Auto-correct year if it doesn't match the selected target year
        if (date.getFullYear() !== targetYear) {
            // console.warn(`Correcting date ${date.toLocaleDateString()} to year ${targetYear}`);
            date.setFullYear(targetYear);
        }

        return date;
    };

    const parseAmount = (amount: number | string): number => {
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') {
            // Remove currency symbol, spaces, and replace comma with dot
            const clean = amount.replace(/[€\s]/g, '').replace(',', '.');
            return parseFloat(clean) || 0;
        }
        return 0;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm(`Stai per importare i dati forzando l'anno al ${selectedYear}. Confermi?`)) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

            if (jsonData.length === 0) {
                alert('Il file sembra vuoto o non valido.');
                setLoading(false);
                return;
            }

            const batch = writeBatch(db);
            let count = 0;
            let skippedCount = 0;
            let totalAmount = 0;
            let skippedRows: number[] = [];

            jsonData.forEach((row, index) => {
                // Adjust index for 1-based row number (Header is row 1, so data starts at row 2)
                const rowNumber = index + 2;

                const date = parseExcelDate(row.DATA, selectedYear);

                // Check for summary rows
                const client = row.CLIENTE?.toString().toLowerCase() || '';
                const type = row['TIPO INTERVENTO']?.toString().toLowerCase() || '';

                if (client.includes('totale') || client.includes('riporto') ||
                    type.includes('totale') || type.includes('riporto')) {
                    skippedCount++;
                    skippedRows.push(rowNumber);
                    console.warn(`Skipping row ${rowNumber}: Detected summary row`, row);
                    return;
                }

                if (!row.CLIENTE || !row['TIPO INTERVENTO'] || !date) {
                    skippedCount++;
                    skippedRows.push(rowNumber);
                    console.warn(`Skipping row ${rowNumber}: Missing CLIENTE, TIPO INTERVENTO, or Invalid DATE`, row);
                    return;
                }

                const docRef = doc(collection(db, 'interventions'));
                const amount = parseAmount(row.IMPORTO);

                // Normalize type to Title Case (e.g., "VESPE" -> "Vespe")
                const normalizeType = (str: string) => {
                    return str.toLowerCase().split(' ').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                };

                const normalizedType = normalizeType(row['TIPO INTERVENTO'].toString());

                // Debug log
                console.log(`Row ${rowNumber}: ${row.CLIENTE} - ${amount}`);

                batch.set(docRef, {
                    clientName: row.CLIENTE,
                    type: normalizedType,
                    amount: amount,
                    date: Timestamp.fromDate(date),
                    notes: row.NOTE || '',
                    createdAt: Timestamp.now()
                });
                count++;
                totalAmount += amount;
            });

            await batch.commit();

            let message = `Importazione completata per l'anno ${selectedYear}!\n\n`;
            message += `✅ Aggiunti: ${count}\n`;
            message += `💰 Totale Importato: €${totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n`;

            if (skippedCount > 0) {
                message += `⚠️ Saltati: ${skippedCount} (Righe: ${skippedRows.join(', ')})\n`;
                message += `Controlla che queste righe abbiano 'CLIENTE' e 'TIPO INTERVENTO'.`;
            }

            alert(message);

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            console.error("Error importing file:", error);
            alert('Errore durante l\'importazione. Controlla il formato del file.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input"
                style={{ width: 'auto', padding: '0.5rem', margin: 0 }}
            >
                {[2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>

            <input
                type="file"
                accept=".xlsx, .xls, .xlsm"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <button
                className="btn"
                onClick={handleButtonClick}
                disabled={loading}
                style={{
                    background: 'var(--success)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
                title="Importa da Excel"
            >
                {loading ? <Loader className="spin" size={18} /> : <FileSpreadsheet size={18} />}
                <span className="hide-mobile">Importa Excel</span>
            </button>
        </div>
    );
};
