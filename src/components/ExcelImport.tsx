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

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const parseExcelDate = (excelDate: number | string): Date => {
        if (typeof excelDate === 'number') {
            // Excel date serial number
            return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        }
        // Try parsing string date (e.g., "10/01/24")
        if (typeof excelDate === 'string') {
            const parts = excelDate.split('/');
            if (parts.length === 3) {
                // Assuming DD/MM/YY or DD/MM/YYYY
                let year = parseInt(parts[2]);
                if (year < 100) year += 2000;
                return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }
        return new Date(); // Fallback
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

            jsonData.forEach((row) => {
                if (!row.CLIENTE || !row['TIPO INTERVENTO']) return; // Skip empty rows

                const docRef = doc(collection(db, 'interventions'));
                const date = parseExcelDate(row.DATA);

                batch.set(docRef, {
                    clientName: row.CLIENTE,
                    type: row['TIPO INTERVENTO'],
                    amount: parseAmount(row.IMPORTO),
                    date: Timestamp.fromDate(date),
                    notes: row.NOTE || '',
                    createdAt: Timestamp.now()
                });
                count++;
            });

            await batch.commit();
            alert(`Importazione completata! ${count} interventi aggiunti.`);

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
        <>
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
        </>
    );
};
