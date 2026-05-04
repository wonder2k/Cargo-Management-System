import { db } from './index';
import { users, customers, rates } from './schema';
import * as argon2 from 'argon2';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create Default User
  const passwordHash = await argon2.hash('admin123');
  const [admin] = await db.insert(users).values({
    email: 'wonder2k@gmail.com',
    passwordHash,
    name: 'Super Admin',
    role: 'admin',
    tier: 10
  }).onConflictDoNothing().returning();

  const userId = admin?.id || 1;

  // 2. Create Demo Customers
  const demoCustomers = [
    { code: 'HWPVG001', name: 'Huawei Technologies', type: 'direct', status: 'active', paymentTerms: 'monthly', creditCurrency: 'CNY', countryCode: 'CN', contactPerson: 'John Doe', email: 'huawei@example.com', creditLimit: 200000, tier: 5, creatorId: userId },
    { code: 'XIPVG001', name: 'Xiaomi Intl', type: 'direct', status: 'active', paymentTerms: 'weekly', creditCurrency: 'CNY', countryCode: 'CN', contactPerson: 'Jane Smith', email: 'xiaomi@example.com', creditLimit: 150000, tier: 4, creatorId: userId },
    { code: 'THPVG001', name: 'Transsion Holdings', type: 'direct', status: 'active', paymentTerms: 'bi-weekly', creditCurrency: 'CNY', countryCode: 'CN', contactPerson: 'Mike Ross', email: 'transsion@example.com', creditLimit: 300000, tier: 6, creatorId: userId },
  ];

  for (const c of demoCustomers) {
    await db.insert(customers).values(c).onConflictDoNothing();
  }

  // 3. Create Demo Rates
  const demoRates = [
    { origin: 'PVG', destination: 'FRA', carrier: 'CA', flightNo: 'CA935', aircraftType: '777F', basePrice: 12.5, creatorId: userId },
    { origin: 'SZX', destination: 'LAX', carrier: 'CZ', flightNo: 'CZ451', aircraftType: '747F', basePrice: 15.8, creatorId: userId },
  ];

  for (const r of demoRates) {
    await db.insert(rates).values(r).onConflictDoNothing();
  }

  console.log('✅ Seeding completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
