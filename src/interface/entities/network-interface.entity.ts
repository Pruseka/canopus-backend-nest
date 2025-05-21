import { ApiProperty } from '@nestjs/swagger';
import { InterfaceType } from '@prisma/client';

export class NetworkInterfaceEntity {
  constructor(partial: Partial<any>) {
    Object.assign(this, partial);

    // Convert numeric values if needed
    if (typeof partial.status === 'string') {
      this.status = parseInt(partial.status, 10);
    }

    if (typeof partial.port === 'string') {
      this.port = parseInt(partial.port, 10);
    }

    if (typeof partial.vlanId === 'string') {
      this.vlanId = parseInt(partial.vlanId, 10);
    }
  }

  @ApiProperty({
    description: 'Unique identifier for the network interface',
    example: 'clj5abcde12345',
  })
  id: string;

  @ApiProperty({
    description: 'When the network interface was created',
    example: '2023-05-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the network interface was last updated',
    example: '2023-05-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Interface identifier from Snake Ways',
    example: '97A0AC67166A11EDA4F51737CD617E52',
  })
  interfaceId: string;

  @ApiProperty({
    description: 'User-friendly name for this interface',
    example: 'BUSINESS',
  })
  name: string;

  @ApiProperty({
    description: 'Interface status: 0=interface down, >0=interface speed',
    example: 100,
  })
  status: number;

  @ApiProperty({
    enum: InterfaceType,
    description: 'Interface type',
    example: InterfaceType.ETHERNET,
  })
  type: InterfaceType;

  @ApiProperty({
    description: 'Physical Port: 0-5, Wi-Fi Port: 1-4, Extender: 1-16',
    example: 1,
  })
  port: number;

  @ApiProperty({
    description: 'VLAN ID: 0=not a VLAN, >0=VLAN ID',
    example: 0,
  })
  vlanId: number;
}
