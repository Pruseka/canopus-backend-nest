import { PrismaClient, UserAccessLevel, Status } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed data creation...');

  // Clear existing data in the test environment
  // Only uncomment if needed in your specific environment
  // await prisma.userHistorySnapshot.deleteMany({});
  // await prisma.user.deleteMany({});

  // Create sample users with hashed passwords
  const defaultPassword = await argon2.hash('Password123!');

  // Sample admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      displayName: 'Admin',
      password: defaultPassword,
      accessLevel: UserAccessLevel.ADMIN,
      autoCredit: true,
      dataCredit: BigInt(5368709120), // 5GB
      timeCredit: BigInt(86400 * 7), // 7 days in seconds
      status: Status.REGISTERED,
      portalConnectedAt: new Date(),
    },
  });

  // Sample site admin
  const siteAdmin = await prisma.user.upsert({
    where: { email: 'siteadmin@example.com' },
    update: {},
    create: {
      email: 'siteadmin@example.com',
      name: 'Site Administrator',
      displayName: 'Site Admin',
      password: defaultPassword,
      accessLevel: UserAccessLevel.SITE_ADMIN,
      autoCredit: true,
      dataCredit: BigInt(3221225472), // 3GB
      timeCredit: BigInt(86400 * 5), // 5 days in seconds
      status: Status.REGISTERED,
      portalConnectedAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  });

  // Sample regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      displayName: 'User',
      password: defaultPassword,
      accessLevel: UserAccessLevel.USER,
      autoCredit: false,
      dataCredit: BigInt(1073741824), // 1GB
      timeCredit: BigInt(3600 * 24), // 24 hours in seconds
      status: Status.REGISTERED,
      portalConnectedAt: new Date(Date.now() - 86400000), // 1 day ago
    },
  });

  // Sample prepaid user
  const prepaidUser = await prisma.user.upsert({
    where: { email: 'prepaid@example.com' },
    update: {},
    create: {
      email: 'prepaid@example.com',
      name: 'Prepaid User',
      displayName: 'Prepaid',
      password: defaultPassword,
      accessLevel: UserAccessLevel.PREPAID_USER,
      autoCredit: false,
      dataCredit: BigInt(536870912), // 512MB
      timeCredit: BigInt(3600 * 12), // 12 hours in seconds
      status: Status.REGISTERED,
      portalConnectedAt: null, // Not connected yet
    },
  });

  // Sample pending user
  const pendingUser = await prisma.user.upsert({
    where: { email: 'pending@example.com' },
    update: {},
    create: {
      email: 'pending@example.com',
      name: 'Pending User',
      displayName: 'Pending',
      password: defaultPassword,
      accessLevel: UserAccessLevel.USER,
      autoCredit: false,
      dataCredit: BigInt(0),
      timeCredit: BigInt(0),
      status: Status.PENDING,
      portalConnectedAt: null,
    },
  });

  // Create some history snapshots for one of the users
  // This demonstrates how to create related records
  const snapshotDate1 = new Date();
  snapshotDate1.setDate(snapshotDate1.getDate() - 7); // 7 days ago

  await prisma.userHistorySnapshot.create({
    data: {
      userId: regularUser.id,
      snapshotDate: snapshotDate1,
      name: regularUser.name,
      displayName: regularUser.displayName,
      accessLevel: regularUser.accessLevel,
      autoCredit: regularUser.autoCredit,
      dataCredit: BigInt(2147483648), // 2GB (different from current)
      timeCredit: BigInt(3600 * 48), // 48 hours (different from current)
      status: Status.PENDING,
      portalConnectedAt: new Date(snapshotDate1.getTime() - 3600000), // 1 hour before snapshot
    },
  });

  const snapshotDate2 = new Date();
  snapshotDate2.setDate(snapshotDate2.getDate() - 3); // 3 days ago

  await prisma.userHistorySnapshot.create({
    data: {
      userId: regularUser.id,
      snapshotDate: snapshotDate2,
      name: regularUser.name,
      displayName: regularUser.displayName,
      accessLevel: regularUser.accessLevel,
      autoCredit: regularUser.autoCredit,
      dataCredit: BigInt(1610612736), // 1.5GB
      timeCredit: BigInt(3600 * 36), // 36 hours
      status: Status.PENDING,
      portalConnectedAt: new Date(snapshotDate2.getTime() - 7200000), // 2 hours before snapshot
    },
  });

  console.log('Seed data created successfully!');
  console.log('Created users:', {
    admin: { id: admin.id, email: admin.email },
    siteAdmin: { id: siteAdmin.id, email: siteAdmin.email },
    regularUser: { id: regularUser.id, email: regularUser.email },
    prepaidUser: { id: prepaidUser.id, email: prepaidUser.email },
    pendingUser: { id: pendingUser.id, email: pendingUser.email },
  });
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
