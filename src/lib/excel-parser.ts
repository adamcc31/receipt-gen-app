/**
 * Excel Parser for Receipt Management
 * 
 * Parses uploaded Excel files and extracts transaction data.
 */

import ExcelJS from 'exceljs';
import Decimal from 'decimal.js';
import { TransactionType } from '@prisma/client';

export interface ParsedTransaction {
    clientName: string;
    type: TransactionType;
    rawNominalYen: Decimal;
    exchangeRate: Decimal;
    regionalTaxYen: Decimal;
    shippingFeeIdr: Decimal;
    taxRepresentativeFeeYen: Decimal;
    gensenYear?: string;
}

export interface ParseResult {
    success: boolean;
    transactions: ParsedTransaction[];
    errors: string[];
    totalRows: number;
}

// Expected column headers (case-insensitive)
const COLUMN_MAPPINGS = {
    clientName: ['client name', 'client', 'name', 'nama', 'nama client'],
    type: ['type', 'tipe', 'jenis', 'transaction type'],
    nominal: ['nominal', 'amount', 'nominal yen', 'jumlah', 'nominal_yen'],
    exchangeRate: ['exchange rate', 'rate', 'kurs', 'exchange_rate'],
    regionalTaxYen: ['regional tax', 'regional tax (yen)', 'regional_tax_yen', 'tax regional', 'pajak regional'],
    shippingFeeIdr: ['shipping fee', 'shipping fee (idr)', 'shipping_fee_idr', 'ongkir', 'ongkos kirim'],
    taxRepresentativeFeeYen: ['tax rep fee', 'tax representative fee', 'tax rep fee (yen)', 'tax_representative_fee_yen'],
    gensenYear: ['gensen year', 'year', 'tahun', 'gensen_year'],
};

/**
 * Parse Excel file buffer and extract transaction data
 */
export async function parseExcelFile(buffer: Buffer): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();
    const errors: string[] = [];
    const transactions: ParsedTransaction[] = [];

    try {
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return {
                success: false,
                transactions: [],
                errors: ['No worksheet found in the Excel file'],
                totalRows: 0,
            };
        }

        // Get header row (first row)
        const headerRow = worksheet.getRow(1);
        const columnMap = mapColumns(headerRow);

        if (!columnMap.clientName || !columnMap.type || !columnMap.nominal) {
            return {
                success: false,
                transactions: [],
                errors: [
                    'Missing required columns. Expected: Client Name, Type, Nominal. ' +
                    `Found: ${Object.entries(columnMap).filter(([, v]) => v).map(([k]) => k).join(', ')}`,
                ],
                totalRows: 0,
            };
        }

        // Process data rows (starting from row 2)
        let totalRows = 0;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            totalRows++;

            try {
                const transaction = parseRow(row, columnMap, rowNumber);
                if (transaction) {
                    transactions.push(transaction);
                }
            } catch (error) {
                errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        return {
            success: errors.length === 0,
            transactions,
            errors,
            totalRows,
        };
    } catch (error) {
        return {
            success: false,
            transactions: [],
            errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
            totalRows: 0,
        };
    }
}

interface ColumnMap {
    clientName?: number;
    type?: number;
    nominal?: number;
    exchangeRate?: number;
    regionalTaxYen?: number;
    shippingFeeIdr?: number;
    taxRepresentativeFeeYen?: number;
    gensenYear?: number;
}

function mapColumns(headerRow: ExcelJS.Row): ColumnMap {
    const columnMap: ColumnMap = {};

    headerRow.eachCell((cell, colNumber) => {
        const headerValue = String(cell.value || '').toLowerCase().trim();

        for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
            if (aliases.some(alias => headerValue.includes(alias))) {
                columnMap[field as keyof ColumnMap] = colNumber;
                break;
            }
        }
    });

    return columnMap;
}

function parseRow(row: ExcelJS.Row, columnMap: ColumnMap, rowNumber: number): ParsedTransaction | null {
    // Extract client name
    const clientNameCell = row.getCell(columnMap.clientName!);
    const clientName = String(clientNameCell.value || '').trim();

    if (!clientName) {
        throw new Error('Client name is required');
    }

    // Extract type
    const typeCell = row.getCell(columnMap.type!);
    const typeValue = String(typeCell.value || '').toUpperCase().trim();

    let type: TransactionType;
    if (typeValue.includes('GENSEN')) {
        type = 'GENSEN';
    } else if (typeValue.includes('SPEED')) {
        type = 'NENKIN_SPEED';
    } else if (typeValue.includes('NENKIN') || typeValue.includes('NORMAL')) {
        type = 'NENKIN_NORMAL';
    } else {
        throw new Error(
            `Invalid type "${typeValue}". Expected: NENKIN, NENKIN SPEED, or GENSEN`
        );
    }

    // Extract nominal
    const nominalCell = row.getCell(columnMap.nominal!);
    const nominalValue = extractNumber(nominalCell.value);

    if (nominalValue.isZero() || nominalValue.isNegative()) {
        throw new Error(`Invalid nominal value: ${nominalCell.value}`);
    }

    // Extract exchange rate (optional, can use default)
    let exchangeRate = new Decimal('115'); // Default exchange rate
    if (columnMap.exchangeRate) {
        const rateCell = row.getCell(columnMap.exchangeRate);
        const rateValue = extractNumber(rateCell.value);
        if (rateValue.isPositive()) {
            exchangeRate = rateValue;
        }
    }

    let regionalTaxYen = new Decimal(0);
    if (columnMap.regionalTaxYen) {
        const regionalTaxCell = row.getCell(columnMap.regionalTaxYen);
        const value = extractNumber(regionalTaxCell.value);
        if (value.isPositive()) {
            regionalTaxYen = value;
        }
    }

    let shippingFeeIdr = new Decimal(0);
    if (columnMap.shippingFeeIdr) {
        const shippingFeeCell = row.getCell(columnMap.shippingFeeIdr);
        const value = extractNumber(shippingFeeCell.value);
        if (value.isPositive()) {
            shippingFeeIdr = value;
        }
    }

    let taxRepresentativeFeeYen = new Decimal(0);
    if (columnMap.taxRepresentativeFeeYen) {
        const feeCell = row.getCell(columnMap.taxRepresentativeFeeYen);
        const value = extractNumber(feeCell.value);
        if (value.isPositive()) {
            taxRepresentativeFeeYen = value;
        }
    }

    let gensenYear: string | undefined;
    if (columnMap.gensenYear) {
        const yearCell = row.getCell(columnMap.gensenYear);
        const yearValue = String(yearCell.value || '').trim();
        if (yearValue) {
            gensenYear = yearValue;
        }
    }

    return {
        clientName,
        type,
        rawNominalYen: nominalValue,
        exchangeRate,
        regionalTaxYen,
        shippingFeeIdr,
        taxRepresentativeFeeYen,
        gensenYear,
    };
}

function extractNumber(value: ExcelJS.CellValue): Decimal {
    if (value === null || value === undefined) {
        return new Decimal(0);
    }

    if (typeof value === 'number') {
        return new Decimal(value);
    }

    if (typeof value === 'string') {
        // Remove currency symbols, spaces, and commas
        const cleaned = value.replace(/[¥￥,\s]/g, '').trim();
        try {
            return new Decimal(cleaned);
        } catch {
            return new Decimal(0);
        }
    }

    // Handle formula results
    if (typeof value === 'object' && 'result' in value) {
        return extractNumber(value.result);
    }

    return new Decimal(0);
}

/**
 * Generate a sample Excel template
 */
export async function generateExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Add headers
    worksheet.columns = [
        { header: 'Nama Client', key: 'clientName', width: 30 },
        { header: 'Tipe', key: 'type', width: 15 },
        { header: 'Nominal', key: 'nominal', width: 20 },
        { header: 'Kurs', key: 'exchangeRate', width: 15 },
        { header: 'Regional Tax (Yen)', key: 'regionalTaxYen', width: 20 },
        { header: 'Shipping Fee (IDR)', key: 'shippingFeeIdr', width: 20 },
        { header: 'Tax Rep Fee (Yen)', key: 'taxRepresentativeFeeYen', width: 20 },
        { header: 'Gensen Year', key: 'gensenYear', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };

    // Add sample data
    worksheet.addRow({
        clientName: 'Sample Client 1',
        type: 'NENKIN',
        nominal: 100000,
        exchangeRate: 115,
        regionalTaxYen: 0,
        shippingFeeIdr: 100000,
        taxRepresentativeFeeYen: 0,
        gensenYear: '',
    });
    worksheet.addRow({
        clientName: 'Sample Client 2',
        type: 'GENSEN',
        nominal: 50000,
        exchangeRate: 115,
        regionalTaxYen: 0,
        shippingFeeIdr: 0,
        taxRepresentativeFeeYen: 3000,
        gensenYear: '2024',
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
