import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RouterType,
  RouterCategory,
  RouterStatus,
  CrewStatus,
} from '@prisma/client';

@Injectable()
export class NetworkService {
  constructor(private prisma: PrismaService) {}

  // Get all routers with their latest usage
  async getAllRouters() {
    return this.prisma.router.findMany({
      include: {
        wanUsage: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        lanUsage: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        connectedTo: {
          where: { isActive: true },
          include: {
            lanRouter: true,
          },
        },
        connectedBy: {
          where: { isActive: true },
          include: {
            wanRouter: true,
          },
        },
      },
    });
  }

  // Get WAN routers with their latest usage and connected LANs
  async getWanRouters() {
    return this.prisma.router.findMany({
      where: { type: RouterType.WAN },
      include: {
        wanUsage: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        connectedTo: {
          where: { isActive: true },
          include: {
            lanRouter: true,
          },
        },
      },
    });
  }

  // Get LAN routers with their latest usage and connected WAN
  async getLanRouters() {
    return this.prisma.router.findMany({
      where: { type: RouterType.LAN },
      include: {
        lanUsage: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        connectedBy: {
          where: { isActive: true },
          include: {
            wanRouter: true,
          },
        },
      },
    });
  }

  // Get usage data for a specific date range
  async getUsageByDateRange(
    routerId: string,
    startDate: Date,
    endDate: Date,
    type: RouterType,
  ) {
    if (type === RouterType.WAN) {
      return this.prisma.wanUsageRecord.findMany({
        where: {
          routerId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
    } else {
      return this.prisma.lanUsageRecord.findMany({
        where: {
          routerId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
    }
  }

  // Create a new usage record
  async createUsageRecord(
    routerId: string,
    date: Date,
    credit: number,
    debit: number,
    type: RouterType,
  ) {
    if (type === RouterType.WAN) {
      return this.prisma.wanUsageRecord.create({
        data: {
          routerId,
          date,
          credit,
          debit,
        },
      });
    } else {
      return this.prisma.lanUsageRecord.create({
        data: {
          routerId,
          date,
          credit,
          debit,
        },
      });
    }
  }

  // Create a new crew usage record
  async createCrewUsageRecord(
    username: string,
    date: Date,
    credit: number,
    debit: number,
    quota: number,
    status: CrewStatus,
  ) {
    return this.prisma.crewUsageRecord.create({
      data: {
        username,
        date,
        credit,
        debit,
        quota,
        status,
      },
    });
  }

  // Create a new router
  async createRouter(data: {
    name: string;
    type: RouterType;
    category?: RouterCategory;
    maxCapacity: number;
    status?: RouterStatus;
  }) {
    // Set status only for WAN routers
    if (data.type === RouterType.LAN) {
      const { status, ...lanData } = data; // Remove status for LAN routers
      return this.prisma.router.create({
        data: lanData,
      });
    } else {
      // For WAN routers, set a default status if not provided
      return this.prisma.router.create({
        data: {
          ...data,
          status: data.status || RouterStatus.INACTIVE,
        },
      });
    }
  }

  // Update router status
  async updateRouterStatus(routerId: string, status: RouterStatus) {
    return this.prisma.router.update({
      where: { id: routerId },
      data: { status },
    });
  }

  // Connect all LANs to an active WAN
  async connectAllLansToWan(wanRouterId: string) {
    // First, verify that the WAN router exists and is active
    const wanRouter = await this.prisma.router.findUnique({
      where: {
        id: wanRouterId,
        type: RouterType.WAN,
      },
    });

    if (!wanRouter) {
      throw new Error('WAN router not found');
    }

    // Update WAN status to ACTIVE
    await this.prisma.router.update({
      where: { id: wanRouterId },
      data: { status: RouterStatus.ACTIVE },
    });

    // Set all other WAN routers to STANDBY
    await this.prisma.router.updateMany({
      where: {
        type: RouterType.WAN,
        id: { not: wanRouterId },
      },
      data: { status: RouterStatus.STANDBY },
    });

    // Get all LAN routers
    const lanRouters = await this.prisma.router.findMany({
      where: { type: RouterType.LAN },
    });

    // First, deactivate all existing connections
    await this.prisma.routerConnection.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new connections for all LANs to the selected WAN
    const connections: any[] = [];
    for (const lanRouter of lanRouters) {
      const connection = await this.prisma.routerConnection.create({
        data: {
          lanRouterId: lanRouter.id,
          wanRouterId: wanRouterId,
          isActive: true,
        },
        include: {
          lanRouter: true,
          wanRouter: true,
        },
      });
      connections.push(connection);
    }

    return {
      activeWan: wanRouter,
      connections: connections,
    };
  }

  // Get crew usage by date range
  async getCrewUsageByDateRange(
    username: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.crewUsageRecord.findMany({
      where: {
        username,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async getLatestCrewUsage(username: string, startDate: Date, endDate: Date) {
    return this.prisma.crewUsageRecord.findFirst({
      where: { username, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'desc' }, // Get the latest record
    });
  }

  // Get latest usage data for all crew members
  async getCrewLatestUsage() {
    const today = new Date();

    // Get unique crew usernames
    const crewRecords = await this.prisma.crewUsageRecord.findMany({
      select: {
        username: true,
      },
      distinct: ['username'],
    });

    const crewData: any = [];

    // For each crew member, get their latest usage record
    for (const record of crewRecords) {
      const latestRecord = await this.prisma.crewUsageRecord.findFirst({
        where: {
          username: record.username,
        },
        orderBy: {
          date: 'desc',
        },
      });

      if (latestRecord) {
        crewData.push(latestRecord);
      }
    }

    return crewData;
  }
}
