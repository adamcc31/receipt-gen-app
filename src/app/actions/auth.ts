'use server';

import prisma from '@/lib/prisma';

export async function checkWhitelistStatus(email: string) {
    try {
        const user = await prisma.whitelistUser.findUnique({
            where: { email },
        });

        if (!user) {
            return false;
        }

        return user.isActive;
    } catch (error) {
        console.error('[checkWhitelistStatus] Error checking database for email:', email, error);
        // Default to false for secure failure
        return false;
    }
}
