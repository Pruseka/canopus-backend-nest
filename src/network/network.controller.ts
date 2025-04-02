import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { NetworkService } from './network.service';
import {
  RouterType,
  RouterCategory,
  RouterStatus,
  CrewStatus,
} from '@prisma/client';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('routers')
  async getAllRouters() {
    return this.networkService.getAllRouters();
  }

  @Get('routers/wan')
  async getWanRouters() {
    return this.networkService.getWanRouters();
  }

  @Get('routers/lan')
  async getLanRouters() {
    return this.networkService.getLanRouters();
  }

  @Get('routers/:id/usage')
  async getRouterUsage(
    @Param('id') routerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: RouterType,
  ) {
    // Default dates if not provided or invalid
    let parsedStartDate: Date;
    let parsedEndDate: Date;

    try {
      parsedStartDate = startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to 30 days ago
      if (isNaN(parsedStartDate.getTime())) {
        parsedStartDate = new Date(
          new Date().setDate(new Date().getDate() - 30),
        );
      }
    } catch (e) {
      parsedStartDate = new Date(new Date().setDate(new Date().getDate() - 30));
    }

    try {
      parsedEndDate = endDate ? new Date(endDate) : new Date(); // Default to today
      if (isNaN(parsedEndDate.getTime())) {
        parsedEndDate = new Date();
      }
    } catch (e) {
      parsedEndDate = new Date();
    }

    return this.networkService.getUsageByDateRange(
      routerId,
      parsedStartDate,
      parsedEndDate,
      type,
    );
  }

  @Post('routers')
  async createRouter(
    @Body()
    data: {
      name: string;
      type: RouterType;
      category?: RouterCategory;
      maxCapacity: number;
      status?: RouterStatus;
    },
  ) {
    return this.networkService.createRouter(data);
  }

  @Post('routers/:id/status')
  async updateRouterStatus(
    @Param('id') routerId: string,
    @Body('status') status: RouterStatus,
  ) {
    return this.networkService.updateRouterStatus(routerId, status);
  }

  @Post('routers/:id/usage')
  async createUsageRecord(
    @Param('id') routerId: string,
    @Body()
    data: {
      date: Date;
      credit: number;
      debit: number;
      type: RouterType;
    },
  ) {
    return this.networkService.createUsageRecord(
      routerId,
      data.date,
      data.credit,
      data.debit,
      data.type,
    );
  }

  @Post('routers/connect-all')
  async connectAllLansToWan(
    @Body()
    data: {
      wanRouterId: string;
    },
  ) {
    return this.networkService.connectAllLansToWan(data.wanRouterId);
  }

  @Post('crew/usage')
  async createCrewUsageRecord(
    @Body()
    data: {
      username: string;
      date: Date;
      credit: number;
      debit: number;
      quota: number;
      status: CrewStatus;
    },
  ) {
    return this.networkService.createCrewUsageRecord(
      data.username,
      data.date,
      data.credit,
      data.debit,
      data.quota,
      data.status,
    );
  }

  // @Get('crew/:username/usage/latest')
  // async getLatestCrewUsage(
  //   @Param('username') username: string,
  //   @Query('startDate') startDate: string,
  //   @Query('endDate') endDate: string,
  // ) {
  //   let parsedStartDate: Date;
  //   let parsedEndDate: Date;

  //   try {
  //     parsedStartDate = startDate
  //       ? new Date(startDate)
  //       : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to 30 days ago
  //     if (isNaN(parsedStartDate.getTime())) {
  //       parsedStartDate = new Date(
  //         new Date().setDate(new Date().getDate() - 30),
  //       );
  //     }
  //   } catch (e) {
  //     parsedStartDate = new Date(new Date().setDate(new Date().getDate() - 30));
  //   }

  //   try {
  //     parsedEndDate = endDate ? new Date(endDate) : new Date(); // Default to today
  //     if (isNaN(parsedEndDate.getTime())) {
  //       parsedEndDate = new Date();
  //     }
  //   } catch (e) {
  //     parsedEndDate = new Date();
  //   }

  //   return this.networkService.getLatestCrewUsage(
  //     username,
  //     parsedStartDate,
  //     parsedEndDate,
  //   );
  // }

  @Get('crew/:username/usage')
  async getCrewUsage(
    @Param('username') username: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    let parsedStartDate: Date;
    let parsedEndDate: Date;

    try {
      parsedStartDate = startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to 30 days ago
      if (isNaN(parsedStartDate.getTime())) {
        parsedStartDate = new Date(
          new Date().setDate(new Date().getDate() - 30),
        );
      }
    } catch (e) {
      parsedStartDate = new Date(new Date().setDate(new Date().getDate() - 30));
    }

    try {
      parsedEndDate = endDate ? new Date(endDate) : new Date(); // Default to today
      if (isNaN(parsedEndDate.getTime())) {
        parsedEndDate = new Date();
      }
    } catch (e) {
      parsedEndDate = new Date();
    }

    return this.networkService.getCrewUsageByDateRange(
      username,
      parsedStartDate,
      parsedEndDate,
    );
  }

  @Get('dashboard')
  async getDashboardOverview() {
    // Get all WAN routers with their latest usage
    const wanRouters = await this.networkService.getWanRouters();

    // Get all LAN routers with their latest usage
    const lanRouters = await this.networkService.getLanRouters();

    // Get all crew members with their latest usage
    const crewData = await this.networkService.getCrewLatestUsage();

    return {
      wanRouters,
      lanRouters,
      crewData,
    };
  }
}
