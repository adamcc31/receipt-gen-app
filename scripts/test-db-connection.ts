
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    // Hide password in logs
    const safeUrl = process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@');
    console.log(`URL: ${safeUrl}`);

    try {
        await prisma.$connect();
        console.log('✅ Successfully connected to the database!');

        // Try a simple query
        const count = await prisma.batchUpload.count();
        console.log(`✅ Verified: Found ${count} batch uploads.`);

        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();
