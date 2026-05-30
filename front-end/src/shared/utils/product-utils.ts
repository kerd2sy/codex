import { Product } from '../api/types';

/**
 * Calculates the effective discount for a product based on the pharmacy's kind and tier.
 * @param product The product object containing discount columns
 * @param pharmacy The active pharmacy selection object
 * @returns The calculated discount percentage (0-100)
 */
export function getEffectiveDiscount(
    product: Product, 
    pharmacy: { kind: number; tier: number }
): number {
    const { kind, tier } = pharmacy;
    let disc = 0;

    // kind mapping: 1=Company, 2=Rep, 3=Wholesale, 4=Pharmacy, 5=List
    if (kind === 1) disc = (tier === 2 ? (product.disc_c2 ?? product.disc_c) : product.disc_c) || 0;
    else if (kind === 2) disc = (tier === 2 ? (product.disc_r2 ?? product.disc_r) : product.disc_r) || 0;
    else if (kind === 3) disc = (tier === 2 ? (product.disc_w2 ?? product.disc_w) : product.disc_w) || 0;
    else if (kind === 4) disc = (tier === 2 ? (product.disc_p2 ?? product.disc_p) : product.disc_p) || 0;
    else if (kind === 5) disc = (tier === 2 ? (product.disc_l2 ?? product.disc_l) : product.disc_l) || 0;

    return disc || product.discount_percent || 0;
}
