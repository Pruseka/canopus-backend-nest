import {
  PrismaClient,
  RouterType,
  RouterCategory,
  RouterStatus,
  CrewStatus,
} from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data
  await cleanDatabase();

  // Create WAN routers - 4 of them
  const wanRouters = await createWanRouters();

  // Create LAN routers - 3 of them
  const lanRouters = await createLanRouters();

  // Connect LANs to WANs
  await connectRouters(wanRouters, lanRouters);

  // Generate 30 days of usage data
  await generateUsageData(wanRouters, lanRouters);

  // Create crew members and their usage
  await generateCrewData();

  console.log('Database seeding completed!');
}

async function cleanDatabase() {
  console.log('Cleaning existing data...');

  await prisma.crewUsageRecord.deleteMany({});
  await prisma.lanUsageRecord.deleteMany({});
  await prisma.wanUsageRecord.deleteMany({});
  await prisma.routerConnection.deleteMany({});
  await prisma.router.deleteMany({});

  console.log('Database cleaned.');
}

async function createWanRouters() {
  console.log('Creating WAN routers...');

  const wanTypes = [
    {
      name: 'StarLink',
      category: RouterCategory.LEO,
      maxCapacity: 100000,
      status: RouterStatus.ACTIVE,
    },
    {
      name: 'VSAT',
      category: RouterCategory.GEO,
      maxCapacity: 10000,
      status: RouterStatus.STANDBY,
    },
    {
      name: 'Iridium',
      category: RouterCategory.L_BAND,
      maxCapacity: 100,
      status: RouterStatus.INACTIVE,
    },
    {
      name: 'T-Mobile',
      category: RouterCategory.MOBILE,
      maxCapacity: 100000,
      status: RouterStatus.ACTIVE,
    },
  ];

  const wanRouters: any[] = [];

  for (const wanType of wanTypes) {
    const router = await prisma.router.create({
      data: {
        name: wanType.name,
        type: RouterType.WAN,
        category: wanType.category,
        maxCapacity: wanType.maxCapacity,
        status: wanType.status,
      },
    });

    wanRouters.push(router);
    console.log(`Created WAN router: ${router.name}`);
  }

  return wanRouters;
}

async function createLanRouters() {
  console.log('Creating LAN routers...');

  const lanTypes = [
    { name: 'BUSINESS', category: RouterCategory.BUSINESS, maxCapacity: 54000 },
    { name: 'CREW LAN', category: RouterCategory.CREW, maxCapacity: 360000 },
    { name: 'OT LAN', category: RouterCategory.OT, maxCapacity: 10000 },
  ];

  const lanRouters: any[] = [];

  for (const lanType of lanTypes) {
    const router = await prisma.router.create({
      data: {
        name: lanType.name,
        type: RouterType.LAN,
        category: lanType.category,
        maxCapacity: lanType.maxCapacity,
        // No status for LAN routers
      },
    });

    lanRouters.push(router);
    console.log(`Created LAN router: ${router.name}`);
  }

  return lanRouters;
}

async function connectRouters(wanRouters, lanRouters) {
  console.log('Connecting LANs to active WAN...');

  // Find the active WAN router (StarLink or T-Mobile)
  const activeWanRouter = wanRouters.find(
    (router) => router.status === RouterStatus.ACTIVE,
  );

  if (!activeWanRouter) {
    console.error('No active WAN router found!');
    return;
  }

  console.log(`Using ${activeWanRouter.name} as the active WAN for all LANs`);

  // Connect all LANs to the active WAN
  for (const lanRouter of lanRouters) {
    await prisma.routerConnection.create({
      data: {
        wanRouterId: activeWanRouter.id,
        lanRouterId: lanRouter.id,
        isActive: true,
      },
    });

    console.log(`Connected ${lanRouter.name} to ${activeWanRouter.name}`);
  }
}

async function generateUsageData(wanRouters, lanRouters) {
  console.log('Generating 30 days of usage data...');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  // Generate data for each day
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);

    // Generate WAN usage
    for (const wanRouter of wanRouters) {
      // Progressive credit increase (usage goes up over time)
      const baseCredit = Math.floor(wanRouter.maxCapacity * 0.1); // Start at 10%
      const growthFactor = i / 30; // Gradually increases from 0 to 1
      const additionalUsage = Math.floor(
        wanRouter.maxCapacity * 0.4 * growthFactor,
      );
      const credit = baseCredit + additionalUsage + randomInt(-500, 500); // Add some randomness
      const debit = wanRouter.maxCapacity - credit;

      await prisma.wanUsageRecord.create({
        data: {
          routerId: wanRouter.id,
          date: currentDate,
          credit: Math.max(0, credit), // Ensure non-negative
          debit: Math.max(0, debit), // Ensure non-negative
        },
      });
    }

    // Generate LAN usage
    for (const lanRouter of lanRouters) {
      // Progressive credit increase (usage goes up over time)
      const baseCredit = Math.floor(lanRouter.maxCapacity * 0.15); // Start at 15%
      const growthFactor = i / 30; // Gradually increases from 0 to 1
      const additionalUsage = Math.floor(
        lanRouter.maxCapacity * 0.3 * growthFactor,
      );
      const credit = baseCredit + additionalUsage + randomInt(-300, 300); // Add some randomness
      const debit = lanRouter.maxCapacity - credit;

      await prisma.lanUsageRecord.create({
        data: {
          routerId: lanRouter.id,
          date: currentDate,
          credit: Math.max(0, credit), // Ensure non-negative
          debit: Math.max(0, debit), // Ensure non-negative
        },
      });
    }
  }

  console.log(
    `Generated usage data for ${wanRouters.length} WAN and ${lanRouters.length} LAN routers over 30 days`,
  );
}

async function generateCrewData() {
  console.log('Generating crew data...');

  const crewMembers = [
    { username: 'crew1', quota: 2000 },
    { username: 'crew2', quota: 3000 },
    { username: 'crew3', quota: 1500 },
    { username: 'crew4', quota: 2500 },
    { username: 'crew5', quota: 1000 },
  ];

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  // Generate data for each day
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);

    for (const crew of crewMembers) {
      // Progressive credit increase (usage goes up over time)
      const baseCredit = Math.floor(crew.quota * 0.1); // Start at 10%
      const growthFactor = i / 30; // Gradually increases from 0 to 1
      const additionalUsage = Math.floor(crew.quota * 0.5 * growthFactor);
      const credit = baseCredit + additionalUsage + randomInt(-100, 100); // Add some randomness
      const debit = crew.quota - credit;

      // Randomly assign status - more likely to be connected on recent days
      const recentDayProbability = i / 30; // Probability increases for recent days
      const isConnected = Math.random() < 0.3 + recentDayProbability * 0.4;
      const status = isConnected
        ? CrewStatus.CONNECTED
        : CrewStatus.DISCONNECTED;

      await prisma.crewUsageRecord.create({
        data: {
          username: crew.username,
          date: currentDate,
          credit: Math.max(0, credit), // Ensure non-negative
          debit: Math.max(0, debit), // Ensure non-negative
          quota: crew.quota,
          status,
        },
      });
    }
  }

  console.log(
    `Generated usage data for ${crewMembers.length} crew members over 30 days`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
