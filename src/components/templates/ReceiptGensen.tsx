/**
 * Receipt Template - Gensen Type
 *  * Professional receipt template for Gensen transactions.
 * Fixed A5 dimensions for consistent PDF/image output.
 * Optimized for single-page A5 layout with conditional rendering.
 */

import React from 'react';
import Decimal from 'decimal.js';
import { formatIdr, formatJpy } from '@/lib/calculations';

export interface GensenReceiptData {
    receiptNumber: string;
    date: string;
    clientName: string;
    nominalYen: Decimal | string;
    adminFeePercentage: Decimal | string;
    adminFeeAmount: Decimal | string;
    taxRepresentativeFeeYen: Decimal | string;
    additionalCostLabel?: string;            // Optional variable cost
    additionalCostAmount?: Decimal | string; // Optional
    netAmountYen: Decimal | string;
    exchangeRate: Decimal | string;
    grossIdr?: Decimal | string;
    finalNominalIdr: Decimal | string;
    gensenYear?: string;
    note?: string;                           // Optional footer note
}

interface ReceiptGensenProps {
    data: GensenReceiptData;
    density?: 'comfortable' | 'compact';
}

export default function ReceiptGensen({ data, density = 'compact' }: ReceiptGensenProps) {
    const isCompact = density === 'compact';
    const adminPercentDisplay = new Decimal(data.adminFeePercentage).mul(100).toString();
    const hasAdditionalCost = data.additionalCostAmount && new Decimal(data.additionalCostAmount).greaterThan(0);
    const hasTaxRepFee = new Decimal(data.taxRepresentativeFeeYen || 0).greaterThan(0);
    const hasNote = data.note && data.note.trim() !== '';
    const accent = {
        primary: '#047857',
        primaryText: '#065F46',
        headerBg: '#D1FAE5',
        badgeBg: '#ECFDF5',
        border: '#059669',
    };

    const titleSectionStyle: React.CSSProperties = isCompact
        ? {
            ...styles.titleSection,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            textAlign: 'left',
            marginBottom: '8px',
        }
        : styles.titleSection;

    const receiptMetaStyle: React.CSSProperties = isCompact
        ? { ...styles.receiptMeta, justifyContent: 'flex-end', gap: '16px', marginTop: 0 }
        : styles.receiptMeta;

    const thStyle: React.CSSProperties = isCompact ? { ...styles.th, padding: '6px 8px' } : styles.th;
    const tdStyle: React.CSSProperties = isCompact ? { ...styles.td, padding: '5px 8px', fontSize: '12px' } : styles.td;

    return (
        <div
            style={{
                ...styles.container,
                padding: isCompact ? '18px' : styles.container.padding,
                fontSize: isCompact ? '12px' : styles.container.fontSize,
            }}
            data-receipt-root
            data-density={density}
        >
            {/* Header */}
            <div
                style={{
                    ...styles.header,
                    backgroundColor: accent.headerBg,
                    border: `2px solid ${accent.border}`,
                    borderRadius: '10px',
                    padding: isCompact ? '8px 10px' : '12px',
                    marginBottom: isCompact ? '14px' : styles.header.marginBottom,
                }}
            >
                <div style={styles.logoArea}>
                    <div style={{ ...styles.companyName, color: accent.primaryText }}>EXATA INDONESIA</div>
                    <div style={styles.companySubtitle}>Financial Services</div>
                </div>
                <div style={{ ...styles.receiptBadge, backgroundColor: accent.badgeBg, border: `2px solid ${accent.border}` }}>
                    <span style={{ ...styles.receiptType, color: accent.primary }}>源泉</span>
                    <span style={{ ...styles.receiptTypeEn, color: accent.primaryText }}>GENSEN</span>
                    {data.gensenYear && <span style={styles.receiptYear}>{data.gensenYear}</span>}
                </div>
            </div>

            {/* Receipt Title */}
            <div style={titleSectionStyle}>
                <h1 style={styles.title}>KWITANSI</h1>
                <div style={receiptMetaStyle}>
                    <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>No:</span>
                        <span style={styles.metaValue}>{data.receiptNumber}</span>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div
                style={{
                    ...styles.divider,
                    backgroundColor: accent.border,
                    margin: isCompact ? '10px 0' : styles.divider.margin,
                }}
            />

            {/* Client Info */}
            <div style={{ ...styles.clientSection, marginBottom: isCompact ? '14px' : styles.clientSection.marginBottom }}>
                <div style={styles.clientLabel}>Penerima Dana:</div>
                <div style={styles.clientName}>{data.clientName}</div>
            </div>

            {/* Calculation Table */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '60%' }}>Keterangan</th>
                            <th style={{ ...thStyle, width: '40%', textAlign: 'right' }}>Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={tdStyle}>Nominal Nenkin 20% (JPY)</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                                {formatJpy(data.nominalYen)}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>Biaya Admin ({adminPercentDisplay}%)</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#DC2626' }}>
                                - {formatJpy(data.adminFeeAmount)}
                            </td>
                        </tr>
                        {hasTaxRepFee && (
                            <tr>
                                <td style={tdStyle}>Biaya Perwakilan Pajak</td>
                                <td style={{ ...tdStyle, textAlign: 'right', color: '#DC2626' }}>
                                    - {formatJpy(data.taxRepresentativeFeeYen)}
                                </td>
                            </tr>
                        )}

                        {/* Conditional: Additional Cost Row - Only when amount > 0 */}
                        {hasAdditionalCost && (
                            <tr>
                                <td style={tdStyle}>{data.additionalCostLabel || 'Additional Cost'}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', color: '#DC2626' }}>
                                    - {formatJpy(data.additionalCostAmount!)}
                                </td>
                            </tr>
                        )}

                        <tr style={{ backgroundColor: '#F3F4F6' }}>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>Nominal Yen Setelah Potong Biaya Layanan</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                                {formatJpy(data.netAmountYen)}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>Nilai Tukar (Kurs) (JPY → IDR)</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                1 JPY = Rp {new Decimal(data.exchangeRate).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div style={{ ...styles.footer, paddingTop: isCompact ? 0 : styles.footer.paddingTop }}>
                {/* Conditional: Note Section - Only when note exists */}
                {hasNote && (
                    <div
                        style={{
                            ...styles.noteSection,
                            marginTop: 0,
                            padding: isCompact ? '6px 8px' : styles.noteSection.padding,
                            backgroundColor: isCompact ? 'transparent' : styles.noteSection.backgroundColor,
                            borderLeft: isCompact ? 'none' : styles.noteSection.borderLeft,
                        }}
                    >
                        <div style={{ ...styles.noteLabel, color: '#DC2626' }}>Catatan:</div>
                        <div style={{ ...styles.noteText, color: '#DC2626', lineHeight: isCompact ? '1.25' : styles.noteText.lineHeight }}>
                            {data.note}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        ...styles.finalAmountSection,
                        padding: isCompact ? '10px 12px' : styles.finalAmountSection.padding,
                        margin: isCompact ? '32px 0 0' : styles.finalAmountSection.margin,
                    }}
                >
                    <div style={{ ...styles.finalAmountLabel, marginBottom: isCompact ? '3px' : styles.finalAmountLabel.marginBottom }}>
                        TOTAL DITRANSFER
                    </div>
                    <div style={{ ...styles.finalAmountValue, fontSize: isCompact ? '22px' : styles.finalAmountValue.fontSize }}>
                        {formatIdr(data.finalNominalIdr)}
                    </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '10px', color: '#6B7280' }}>
                    Tanggal Cetak: {data.date}
                </div>
            </div>
        </div>
    );
}

// Fixed A5 dimensions: 148mm x 210mm ≈ 559px x 794px at 96dpi
// Optimized for single-page output with reduced padding
const styles: Record<string, React.CSSProperties> = {
    container: {
        width: '559px',
        height: '794px',
        padding: '24px',  // Reduced from 32px for better fit
        backgroundColor: '#FFFFFF',
        fontFamily: '"Inter", "Roboto", sans-serif',
        fontSize: '13px',  // Reduced from 14px
        color: '#1F2937',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',  // Reduced from 24px
    },
    logoArea: {
        display: 'flex',
        flexDirection: 'column',
    },
    companyName: {
        fontSize: '22px',  // Reduced from 24px
        fontWeight: 700,
        color: '#065F46',
        letterSpacing: '0.5px',
    },
    companySubtitle: {
        fontSize: '11px',  // Reduced from 12px
        color: '#6B7280',
        marginTop: '2px',
    },
    receiptBadge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        padding: '6px 14px',  // Reduced padding
        borderRadius: '8px',
        border: '2px solid #059669',
    },
    receiptType: {
        fontSize: '18px',  // Reduced from 20px
        fontWeight: 700,
        color: '#059669',
    },
    receiptTypeEn: {
        fontSize: '9px',  // Reduced from 10px
        color: '#10B981',
        letterSpacing: '1px',
    },
    receiptYear: {
        fontSize: '12px',
        fontWeight: 700,
        color: '#92400E',
        marginTop: '4px',
    },
    titleSection: {
        textAlign: 'center',
        marginBottom: '14px',  // Reduced from 16px
    },
    title: {
        fontSize: '26px',  // Reduced from 28px
        fontWeight: 700,
        color: '#111827',
        margin: 0,
        letterSpacing: '2px',
    },
    receiptMeta: {
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        marginTop: '6px',  // Reduced from 8px
    },
    metaItem: {
        display: 'flex',
        gap: '8px',
    },
    metaLabel: {
        color: '#6B7280',
    },
    metaValue: {
        fontWeight: 600,
    },
    divider: {
        height: '2px',
        backgroundColor: '#E5E7EB',
        margin: '14px 0',  // Reduced from 16px
    },
    clientSection: {
        marginBottom: '20px',  // Reduced from 24px
    },
    clientLabel: {
        fontSize: '11px',  // Reduced from 12px
        color: '#6B7280',
        marginBottom: '4px',
    },
    clientName: {
        fontSize: '17px',  // Reduced from 18px
        fontWeight: 600,
        color: '#111827',
    },
    tableContainer: {
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '10px 8px',  // Reduced from 12px
        backgroundColor: '#F9FAFB',
        borderBottom: '2px solid #E5E7EB',
        textAlign: 'left',
        fontSize: '11px',  // Reduced from 12px
        fontWeight: 600,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    td: {
        padding: '9px 8px',  // Reduced from 12px
        borderBottom: '1px solid #E5E7EB',
        fontSize: '13px',  // Reduced from 14px
    },
    finalAmountSection: {
        backgroundColor: '#065F46',
        color: '#FFFFFF',
        padding: '16px',  // Reduced from 20px
        borderRadius: '8px',
        margin: '32px 0 0',
        textAlign: 'center',
    },
    finalAmountLabel: {
        fontSize: '11px',  // Reduced from 12px
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '6px',  // Reduced from 8px
        opacity: 0.9,
    },
    finalAmountValue: {
        fontSize: '26px',  // Reduced from 28px
        fontWeight: 700,
    },
    footer: {
        paddingTop: '12px',  // Reduced from 16px
        display: 'flex',
        flexDirection: 'column',
    },
    signatureArea: {
        width: '200px',
        marginLeft: 'auto',
    },
    signatureLine: {
        height: '1px',
        backgroundColor: '#1F2937',
        marginBottom: '6px',  // Reduced from 8px
    },
    signatureLabel: {
        fontSize: '10px',  // Reduced from 11px
        color: '#6B7280',
        textAlign: 'center',
    },
    noteSection: {
        marginTop: '12px',
        padding: '10px',
        backgroundColor: '#FFF7ED',
        borderLeft: '3px solid #F59E0B',
        borderRadius: '4px',
    },
    noteLabel: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#92400E',
        textTransform: 'uppercase',
        marginBottom: '4px',
        letterSpacing: '0.5px',
    },
    noteText: {
        fontSize: '11px',
        color: '#78350F',
        lineHeight: '1.4',
    },
    footerNote: {
        fontSize: '9px',  // Reduced from 10px
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: '12px',  // Reduced from 16px
    },
};
