import { ApiProperty } from '@nestjs/swagger';

/**
 * Snake Ways route status (used for API communication)
 */
export enum SnakeWaysRouteStatus {
  /** No default system route */
  NO_DEFAULT_ROUTE = 0,
  /** Default system route is set */
  DEFAULT_ROUTE_SET = 1,
}

/**
 * Application route status (used in our application)
 */
export enum RouteStatus {
  NO_DEFAULT_ROUTE = 'NO_DEFAULT_ROUTE',
  DEFAULT_ROUTE_SET = 'DEFAULT_ROUTE_SET',
}

/**
 * Snake Ways route types (used for API communication)
 */
export enum SnakeWaysRouteType {
  /** Automatic routing */
  AUTOMATIC = 0,
  /** Switch forced to WAN */
  SWITCH_FORCED_TO_WAN = 1,
  /** Switch forced OFF */
  SWITCH_FORCED_OFF = 2,
  /** LAN forced to WAN */
  LAN_FORCED_TO_WAN = 3,
}

/**
 * Application route types (used in our application)
 */
export enum RouteType {
  AUTOMATIC = 'AUTOMATIC',
  SWITCH_FORCED_TO_WAN = 'SWITCH_FORCED_TO_WAN',
  SWITCH_FORCED_OFF = 'SWITCH_FORCED_OFF',
  LAN_FORCED_TO_WAN = 'LAN_FORCED_TO_WAN',
}

/**
 * Individual route data from Snake Ways API
 */
export interface SnakeWaysRouteData {
  WanID: string;
  Status: SnakeWaysRouteStatus;
  RouteType: SnakeWaysRouteType;
}

/**
 * Snake Ways API response for system route operations
 */
export interface SnakeWaysSystemRouteResponse {
  route: SnakeWaysRouteData[];
}

/**
 * Application response for system route operations
 */
export class SystemRouteResponse {
  /**
   * ID of WAN system is currently routed to
   */
  @ApiProperty({
    description: 'ID of WAN system is currently routed to (32 byte hex string)',
    example: 'FCF623211656E1EDA56E193DE7CF5745',
  })
  wanId: string;

  /**
   * Route status
   */
  @ApiProperty({
    enum: RouteStatus,
    description: 'Route status: DEFAULT_ROUTE_SET, NO_DEFAULT_ROUTE',
    example: RouteStatus.DEFAULT_ROUTE_SET,
  })
  status: RouteStatus;

  /**
   * Route type
   */
  @ApiProperty({
    enum: RouteType,
    description:
      'Route type: AUTOMATIC, SWITCH_FORCED_TO_WAN, SWITCH_FORCED_OFF, LAN_FORCED_TO_WAN',
    example: RouteType.SWITCH_FORCED_TO_WAN,
  })
  routeType: RouteType;
}
