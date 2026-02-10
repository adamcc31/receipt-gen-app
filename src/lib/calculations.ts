/**
 * Calculation Engine for Receipt Management
 * 
 * IMPORTANT: All monetary calculations use Decimal.js for precision.
 * Never use JavaScript's native number type for currency.
 * 
 * Updated to support 3 explicit transaction types:
 * - NENKIN_NORMAL:
 *   Yen layer: Base - RegionalTaxYen - 15% - 3500 - additionalCost
 *   IDR layer: (NetYen * Kurs) - ShippingFeeIDR
 * - NENKIN_SPEED:
 *   Yen layer: Base - RegionalTaxYen - 15% - 3500 - 3000 - additionalCost
 *   IDR layer: (NetYen * Kurs) - ShippingFeeIDR
 * - GENSEN: (Base - 40% - 3000 - additionalCost) * Kurs
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
    precision: 20,
    rounding: Decimal.ROUND_HALF_UP,
});

// ============================================
// CONSTANTS
// ============================================

export const SPEED_SERVICE_FEE = new Decimal('3000'); // Fixed speed service fee

// ============================================
// INPUT INTERFACES
// ============================================

export interface NenkinNormalCalculationInput {
    nominalYen: Decimal | string | number;
    regionalTaxYen?: Decimal | string | number; // Default: 0
    exchangeRate: Decimal | string | number;
    shippingFeeIdr?: Decimal | string | number; // Default: 0 (deducted after conversion)
    adminFeePercentage?: Decimal | string | number; // Default: 0.15 (15%)
    taxFixed?: Decimal | string | number; // Default: 3500
    additionalCostAmount?: Decimal | string | number; // Variable cost
}

export interface NenkinSpeedCalculationInput {
    nominalYen: Decimal | string | number;
    regionalTaxYen?: Decimal | string | number; // Default: 0
    exchangeRate: Decimal | string | number;
    shippingFeeIdr?: Decimal | string | number; // Default: 0 (deducted after conversion)
    adminFeePercentage?: Decimal | string | number; // Default: 0.15 (15%)
    taxFixed?: Decimal | string | number; // Default: 3500
    speedServiceFee?: Decimal | string | number; // Default: 3000
    additionalCostAmount?: Decimal | string | number; // Variable cost
}

export interface GensenCalculationInput {
    nominalYen: Decimal | string | number;
    exchangeRate: Decimal | string | number;
    adminFeePercentage?: Decimal | string | number; // Default: 0.40 (40%)
    taxRepresentativeFeeYen?: Decimal | string | number; // Default: 0
    additionalCostAmount?: Decimal | string | number; // Variable cost
}

// ============================================
// RESULT INTERFACE
// ============================================

export interface CalculationResult {
    nominalYen: Decimal;
    regionalTaxYen?: Decimal;
    adminFeePercentage: Decimal;
    adminFeeAmount: Decimal;
    taxOrAdminFixed: Decimal;
    speedServiceFee?: Decimal;         // Optional - only for NENKIN_SPEED
    additionalCostAmount?: Decimal;    // Optional - variable cost
    netAmountYen: Decimal;
    exchangeRate: Decimal;
    grossIdr: Decimal;
    shippingFeeIdr?: Decimal;
    finalNominalIdr: Decimal;
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Nenkin Normal receipt amount
 * Formula: (Nominal - 15% - 3500 - additionalCost) * ExchangeRate
 * 
 * @param input - Calculation input parameters
 * @returns Calculation result with all intermediate values
 */
export function calculateNenkinNormal(input: NenkinNormalCalculationInput): CalculationResult {
    const nominalYen = new Decimal(input.nominalYen);
    const regionalTaxYen = new Decimal(input.regionalTaxYen ?? '0');
    const exchangeRate = new Decimal(input.exchangeRate);
    const shippingFeeIdr = new Decimal(input.shippingFeeIdr ?? '0');
    const adminFeePercentage = new Decimal(input.adminFeePercentage ?? '0.15');
    const taxFixed = new Decimal(input.taxFixed ?? '3500');
    const additionalCostAmount = new Decimal(input.additionalCostAmount ?? '0');

    const adjustedBase = nominalYen.sub(regionalTaxYen);

    // Calculate admin fee amount (Excel-compatible: round half up to whole Yen before deduction)
    const adminFeeAmount = adjustedBase
        .mul(adminFeePercentage)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // Net amount (Yen layer)
    const netAmountYen = adjustedBase
        .sub(adminFeeAmount)
        .sub(taxFixed)
        .sub(additionalCostAmount);

    // IDR layer (ongkir/shipping fee is deducted after conversion)
    const grossIdr = netAmountYen.mul(exchangeRate);
    const finalNominalIdr = grossIdr.sub(shippingFeeIdr);

    return {
        nominalYen,
        regionalTaxYen: regionalTaxYen.greaterThan(0) ? regionalTaxYen : undefined,
        adminFeePercentage,
        adminFeeAmount,
        taxOrAdminFixed: taxFixed,
        additionalCostAmount: additionalCostAmount.greaterThan(0) ? additionalCostAmount : undefined,
        netAmountYen,
        exchangeRate,
        grossIdr: grossIdr.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        shippingFeeIdr: shippingFeeIdr.greaterThan(0) ? shippingFeeIdr : undefined,
        finalNominalIdr: finalNominalIdr.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    };
}

/**
 * Calculate Nenkin Speed receipt amount
 * Formula: (Nominal - 15% - 3500 - 3000 - additionalCost) * ExchangeRate
 * 
 * @param input - Calculation input parameters
 * @returns Calculation result with all intermediate values
 */
export function calculateNenkinSpeed(input: NenkinSpeedCalculationInput): CalculationResult {
    const nominalYen = new Decimal(input.nominalYen);
    const regionalTaxYen = new Decimal(input.regionalTaxYen ?? '0');
    const exchangeRate = new Decimal(input.exchangeRate);
    const shippingFeeIdr = new Decimal(input.shippingFeeIdr ?? '0');
    const adminFeePercentage = new Decimal(input.adminFeePercentage ?? '0.15');
    const taxFixed = new Decimal(input.taxFixed ?? '3500');
    const speedServiceFee = new Decimal(input.speedServiceFee ?? SPEED_SERVICE_FEE);
    const additionalCostAmount = new Decimal(input.additionalCostAmount ?? '0');

    const adjustedBase = nominalYen.sub(regionalTaxYen);

    // Calculate admin fee amount (Excel-compatible: round half up to whole Yen before deduction)
    const adminFeeAmount = adjustedBase
        .mul(adminFeePercentage)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // Net amount (Yen layer)
    const netAmountYen = adjustedBase
        .sub(adminFeeAmount)
        .sub(taxFixed)
        .sub(speedServiceFee)
        .sub(additionalCostAmount);

    // IDR layer (ongkir/shipping fee is deducted after conversion)
    const grossIdr = netAmountYen.mul(exchangeRate);
    const finalNominalIdr = grossIdr.sub(shippingFeeIdr);

    return {
        nominalYen,
        regionalTaxYen: regionalTaxYen.greaterThan(0) ? regionalTaxYen : undefined,
        adminFeePercentage,
        adminFeeAmount,
        taxOrAdminFixed: taxFixed,
        speedServiceFee,
        additionalCostAmount: additionalCostAmount.greaterThan(0) ? additionalCostAmount : undefined,
        netAmountYen,
        exchangeRate,
        grossIdr: grossIdr.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        shippingFeeIdr: shippingFeeIdr.greaterThan(0) ? shippingFeeIdr : undefined,
        finalNominalIdr: finalNominalIdr.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    };
}

/**
 * Calculate Gensen receipt amount
 * Formula: (Nominal - 40% - 3000 - additionalCost) * ExchangeRate
 * 
 * @param input - Calculation input parameters
 * @returns Calculation result with all intermediate values
 */
export function calculateGensen(input: GensenCalculationInput): CalculationResult {
    const nominalYen = new Decimal(input.nominalYen);
    const exchangeRate = new Decimal(input.exchangeRate);
    const adminFeePercentage = new Decimal(input.adminFeePercentage ?? '0.40');
    const taxRepresentativeFeeYen = new Decimal(input.taxRepresentativeFeeYen ?? '0');
    const additionalCostAmount = new Decimal(input.additionalCostAmount ?? '0');

    // Calculate admin fee amount (Excel-compatible: round half up to whole Yen)
    const adminFeeAmount = nominalYen
        .mul(adminFeePercentage)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // Net amount = Nominal - AdminFee% - TaxRepresentativeFee - AdditionalCost
    const netAmountYen = nominalYen
        .sub(adminFeeAmount)
        .sub(taxRepresentativeFeeYen.greaterThan(0) ? taxRepresentativeFeeYen : 0)
        .sub(additionalCostAmount);

    // Final amount in IDR
    const grossIdr = netAmountYen.mul(exchangeRate);
    const finalNominalIdr = grossIdr;

    return {
        nominalYen,
        adminFeePercentage,
        adminFeeAmount,
        taxOrAdminFixed: taxRepresentativeFeeYen,
        additionalCostAmount: additionalCostAmount.greaterThan(0) ? additionalCostAmount : undefined,
        netAmountYen,
        exchangeRate,
        grossIdr: grossIdr.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        finalNominalIdr: finalNominalIdr.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    };
}

/**
 * Generic calculation based on transaction type
 * Supports 3 explicit types: NENKIN_NORMAL, NENKIN_SPEED, GENSEN
 */
export function calculateTransaction(
    type: 'NENKIN_NORMAL' | 'NENKIN_SPEED' | 'GENSEN',
    nominalYen: Decimal | string | number,
    exchangeRate: Decimal | string | number,
    settings?: {
        nenkinAdminRate?: Decimal | string | number;
        nenkinTaxFixed?: Decimal | string | number;
        nenkinSpeedServiceFee?: Decimal | string | number;
        gensenAdminRate?: Decimal | string | number;
        taxRepresentativeFeeYen?: Decimal | string | number;
        regionalTaxYen?: Decimal | string | number;
        shippingFeeIdr?: Decimal | string | number;
        additionalCostAmount?: Decimal | string | number;
    }
): CalculationResult {
    if (type === 'NENKIN_NORMAL') {
        return calculateNenkinNormal({
            nominalYen,
            regionalTaxYen: settings?.regionalTaxYen,
            exchangeRate,
            shippingFeeIdr: settings?.shippingFeeIdr,
            adminFeePercentage: settings?.nenkinAdminRate,
            taxFixed: settings?.nenkinTaxFixed,
            additionalCostAmount: settings?.additionalCostAmount,
        });
    } else if (type === 'NENKIN_SPEED') {
        return calculateNenkinSpeed({
            nominalYen,
            regionalTaxYen: settings?.regionalTaxYen,
            exchangeRate,
            shippingFeeIdr: settings?.shippingFeeIdr,
            adminFeePercentage: settings?.nenkinAdminRate,
            taxFixed: settings?.nenkinTaxFixed,
            speedServiceFee: settings?.nenkinSpeedServiceFee,
            additionalCostAmount: settings?.additionalCostAmount,
        });
    } else {
        return calculateGensen({
            nominalYen,
            exchangeRate,
            adminFeePercentage: settings?.gensenAdminRate,
            taxRepresentativeFeeYen: settings?.taxRepresentativeFeeYen,
            additionalCostAmount: settings?.additionalCostAmount,
        });
    }
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format Decimal as IDR currency string
 */
export function formatIdr(amount: Decimal | string | number): string {
    const decimal = new Decimal(amount);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(decimal.toNumber());
}

/**
 * Format Decimal as JPY currency string
 */
export function formatJpy(amount: Decimal | string | number): string {
    const decimal = new Decimal(amount);
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(decimal.toNumber());
}

/**
 * Parse string to Decimal safely
 */
export function parseDecimal(value: string | number | null | undefined): Decimal {
    if (value === null || value === undefined || value === '') {
        return new Decimal(0);
    }
    try {
        return new Decimal(value);
    } catch {
        return new Decimal(0);
    }
}
