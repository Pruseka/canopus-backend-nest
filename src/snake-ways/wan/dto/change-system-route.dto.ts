import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * DTO for changing system route
 */
export class ChangeSystemRouteDto {
  /**
   * WAN ID to be used as system route
   */
  @ApiProperty({
    description:
      'ID of WAN to be used as system route (32 byte hex string), "AUTO" for automatic routing, or "OFF" to disable all WAN interfaces',
    example: 'FCF623211656E1EDA56E193DE7CF5745',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([A-Fa-f0-9]{32}|AUTO|OFF)$/, {
    message: 'WanID must be a 32-character hex string, "AUTO", or "OFF"',
  })
  wanId: string;
}
