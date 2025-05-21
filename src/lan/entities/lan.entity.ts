import { ApiProperty } from '@nestjs/swagger';

/**
 * Enum for DHCP status
 */
export enum LanDhcpStatus {
  /** DHCP server enabled */
  ENABLED = 'ENABLED',
  /** DHCP server disabled */
  DISABLED = 'DISABLED',
}

/**
 * Enum for QOS levels
 */
export enum LanQosLevel {
  /** High priority QOS */
  HIGH = 'HIGH',
  /** Medium priority QOS */
  MEDIUM = 'MEDIUM',
  /** Low priority QOS */
  LOW = 'LOW',
}

// Interface to define the format of the LAN interface data from Snake Ways
export interface InterfaceData {
  InterfaceID: string;
}

export class LanEntity {
  constructor(partial: Partial<any>) {
    Object.assign(this, partial);

    // Convert boolean values if they're numbers
    if (partial.allowGateway !== undefined) {
      this.allowGateway = !!partial.allowGateway;
    }

    if (partial.captivePortal !== undefined) {
      this.captivePortal = !!partial.captivePortal;
    }
  }

  @ApiProperty({
    description: 'Unique identifier for the LAN',
    example: 'clj5abcde12345',
  })
  id: string;

  @ApiProperty({
    description: 'When the LAN was created',
    example: '2023-05-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the LAN was last updated',
    example: '2023-05-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'LAN identifier from Snake Ways',
    example: '979F48BB166A11EDA4F51737CD617E52',
  })
  lanId: string;

  @ApiProperty({
    description: 'User-friendly name for this LAN connection',
    example: 'BUSINESS',
  })
  lanName: string;

  @ApiProperty({
    description: 'List of interface IDs this LAN is using',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        interfaceId: { type: 'string' },
      },
    },
    example: [{ interfaceId: '97A0AC67166A11EDA4F51737CD617E52' }],
  })
  interfaces: { interfaceId: string }[];

  @ApiProperty({
    description: 'IP address assigned to the LAN',
    example: '192.168.77.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'Subnet mask',
    example: '255.255.255.0',
  })
  subnetmask: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Primary DNS server IP address',
    example: '8.8.8.8',
  })
  dns1: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Secondary DNS server IP address',
    example: '8.8.4.4',
  })
  dns2: string | null;

  @ApiProperty({
    enum: LanDhcpStatus,
    description: 'DHCP server status: ENABLED or DISABLED',
    example: LanDhcpStatus.ENABLED,
  })
  dhcp: LanDhcpStatus;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Start of DHCP IP range',
    example: '192.168.77.20',
  })
  dhcpRangeFrom: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'End of DHCP IP range',
    example: '192.168.77.200',
  })
  dhcpRangeTo: string | null;

  @ApiProperty({
    description: 'Access to WAN gateway IP allowed',
    example: true,
  })
  allowGateway: boolean;

  @ApiProperty({
    description: 'Captive portal enabled',
    example: false,
  })
  captivePortal: boolean;

  @ApiProperty({
    enum: LanQosLevel,
    description: 'QOS level set for this LAN',
    example: LanQosLevel.HIGH,
  })
  qos: LanQosLevel;
}
