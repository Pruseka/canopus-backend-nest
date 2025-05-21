import { ApiProperty } from '@nestjs/swagger';
import { LanUsageEntity, LanInfo, WanInfo } from '../entities/lan-usage.entity';
import { Type } from 'class-transformer';

export class NetworkInterfaceDto {
  @ApiProperty({
    description: 'Interface ID',
    example: '97A0AC67166A11EDA4F51737CD617E52',
  })
  id: string;

  @ApiProperty({
    description: 'Unique identifier in Snake Ways',
    example: '97A0AC67166A11EDA4F51737CD617E52',
  })
  interfaceId: string;

  @ApiProperty({
    description: 'Interface name',
    example: 'eth0',
  })
  name?: string;

  @ApiProperty({
    description: 'Interface status',
    example: 1000,
  })
  status?: number;

  @ApiProperty({
    description: 'Interface type',
    example: 0,
  })
  type?: number;
}

export class LanInterfaceDto {
  @ApiProperty({
    description: 'Unique identifier for the LAN interface mapping',
    example: 'clj5abcde12345',
  })
  id?: string;

  @ApiProperty({
    description: 'LAN ID',
    example: 'clj5abcde12345',
  })
  lanId?: string;

  @ApiProperty({
    description: 'Interface ID associated with this LAN',
    example: '97A0AC67166A11EDA4F51737CD617E52',
  })
  interfaceId: string;

  @ApiProperty({
    description: 'Interface details',
    type: NetworkInterfaceDto,
  })
  interface?: NetworkInterfaceDto;
}

export class LanWithUsageDto {
  @ApiProperty({
    description: 'Unique identifier for the LAN',
    example: 'clj5abcde12345',
  })
  id: string;

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
    description: 'DHCP server status: ENABLED or DISABLED',
    example: 'ENABLED',
    enum: ['ENABLED', 'DISABLED'],
  })
  dhcp: string;

  @ApiProperty({
    description: 'Interfaces associated with this LAN',
    type: [LanInterfaceDto],
  })
  @Type(() => LanInterfaceDto)
  interfaces: LanInterfaceDto[];

  @ApiProperty({
    description: 'Usage data records for this LAN',
    type: [LanUsageEntity],
  })
  @Type(() => LanUsageEntity)
  usageData: LanUsageEntity[];

  @ApiProperty({
    description: 'Total bytes used by this LAN in the time period',
    example: 214697155,
  })
  totalBytes: number;

  @ApiProperty({
    description: 'Human-readable formatted total bytes used',
    example: '204.75 MB',
  })
  formattedTotalBytes: string;
}
