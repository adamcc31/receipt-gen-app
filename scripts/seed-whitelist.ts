import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const emails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS?.split(',') || []

async function main() {
    for (const email of emails) {
        if (!email.trim()) continue
        await prisma.whitelistUser.upsert({
            where: { email: email.trim() },
            update: {},
            create: { email: email.trim(), role: 'admin' }
        })
    }
    console.log('Successfully seeded database with original environment emails:', emails)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
