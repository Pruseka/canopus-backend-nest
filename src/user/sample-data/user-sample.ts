import { UserEntity } from '../entities/user.entity';
import { UserHistorySnapshotEntity } from '../entities/user-history-snapshot.entity';
import { Pending, UserAccessLevel } from '@prisma/client';

/**
 * Sample users that can be used for testing or mocking user controller responses
 */
export const sampleUsers: UserEntity[] = [
  new UserEntity({
    id: 'clj5a1b2c3d4e5f6g7',
    email: 'admin@example.com',
    name: 'Admin User',
    displayName: 'Admin',
    password: '**********', // Password is excluded from responses
    accessLevel: UserAccessLevel.ADMIN,
    autoCredit: true,
    dataCredit: 5368709120, // 5GB
    timeCredit: 86400 * 7, // 7 days in seconds
    pending: Pending.REGISTERED,
    portalConnectedAt: new Date(),
    createdAt: new Date('2023-05-15T10:30:00Z'),
    updatedAt: new Date('2023-06-20T14:45:00Z'),
    refreshToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
  }),
  new UserEntity({
    id: 'clj5h8i9j0k1l2m3n4',
    email: 'siteadmin@example.com',
    name: 'Site Administrator',
    displayName: 'Site Admin',
    password: '**********',
    accessLevel: UserAccessLevel.SITE_ADMIN,
    autoCredit: true,
    dataCredit: 3221225472, // 3GB
    timeCredit: 86400 * 5, // 5 days in seconds
    pending: Pending.REGISTERED,
    portalConnectedAt: new Date(Date.now() - 3600000), // 1 hour ago
    createdAt: new Date('2023-05-20T11:15:00Z'),
    updatedAt: new Date('2023-06-22T09:30:00Z'),
    refreshToken: null,
  }),
  new UserEntity({
    id: 'clj5o5p6q7r8s9t0u1',
    email: 'user@example.com',
    name: 'Regular User',
    displayName: 'User',
    password: '**********',
    accessLevel: UserAccessLevel.USER,
    autoCredit: false,
    dataCredit: 1073741824, // 1GB
    timeCredit: 3600 * 24, // 24 hours in seconds
    pending: Pending.REGISTERED,
    portalConnectedAt: new Date(Date.now() - 86400000), // 1 day ago
    createdAt: new Date('2023-06-01T08:00:00Z'),
    updatedAt: new Date('2023-06-10T16:20:00Z'),
    refreshToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IlJlZ3VsYXIgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0',
  }),
  new UserEntity({
    id: 'clj5v2w3x4y5z6a7b8',
    email: 'prepaid@example.com',
    name: 'Prepaid User',
    displayName: 'Prepaid',
    password: '**********',
    accessLevel: UserAccessLevel.PREPAID_USER,
    autoCredit: false,
    dataCredit: 536870912, // 512MB
    timeCredit: 3600 * 12, // 12 hours in seconds
    pending: Pending.REGISTERED,
    portalConnectedAt: null, // Not connected yet
    createdAt: new Date('2023-06-05T15:45:00Z'),
    updatedAt: new Date('2023-06-05T15:45:00Z'),
    refreshToken: null,
  }),
  new UserEntity({
    id: 'clj5c9d0e1f2g3h4i5',
    email: 'pending@example.com',
    name: 'Pending User',
    displayName: 'Pending',
    password: '**********',
    accessLevel: UserAccessLevel.USER,
    autoCredit: false,
    dataCredit: 0,
    timeCredit: 0,
    pending: Pending.PENDING,
    portalConnectedAt: null,
    createdAt: new Date('2023-06-18T11:30:00Z'),
    updatedAt: new Date('2023-06-18T11:30:00Z'),
    refreshToken: null,
  }),
];

/**
 * Sample history snapshots that can be used for testing or mocking history endpoint
 */
export const sampleUserHistory: UserHistorySnapshotEntity[] = [
  new UserHistorySnapshotEntity({
    id: 'clk1a2b3c4d5e6f7g8',
    userId: 'clj5o5p6q7r8s9t0u1', // Regular user ID
    snapshotDate: new Date('2023-05-25T00:00:00Z'),
    name: 'Regular User 1',
    displayName: 'User',
    accessLevel: UserAccessLevel.USER,
    autoCredit: false,
    dataCredit: 2147483648, // 2GB (different from current)
    timeCredit: 3600 * 48, // 48 hours
    pending: Pending.REGISTERED,
    portalConnectedAt: new Date('2023-05-24T23:00:00Z'),
    createdAt: new Date('2023-05-25T00:01:00Z'),
    updatedAt: new Date('2023-05-25T00:01:00Z'),
  }),
  new UserHistorySnapshotEntity({
    id: 'clk8h9i0j1k2l3m4n5',
    userId: 'clj5o5p6q7r8s9t0u1', // Regular user ID
    snapshotDate: new Date('2023-05-28T00:00:00Z'),
    name: 'Regular User 2',
    displayName: 'User',
    accessLevel: UserAccessLevel.USER,
    autoCredit: false,
    dataCredit: 1610612736, // 1.5GB
    timeCredit: 3600 * 36, // 36 hours
    pending: Pending.REGISTERED,
    portalConnectedAt: new Date('2023-05-27T22:00:00Z'),
    createdAt: new Date('2023-05-28T00:01:00Z'),
    updatedAt: new Date('2023-05-28T00:01:00Z'),
  }),
  new UserHistorySnapshotEntity({
    id: 'clk3o4p5q6r7s8t9u0',
    userId: 'clj5o5p6q7r8s9t0u1', // Regular user ID
    snapshotDate: new Date('2023-06-01T00:00:00Z'),
    name: 'Regular User 3',
    displayName: 'User',
    accessLevel: UserAccessLevel.USER,
    autoCredit: false,
    dataCredit: 1288490188, // 1.2GB
    timeCredit: 3600 * 30, // 30 hours
    pending: Pending.REGISTERED,
    portalConnectedAt: new Date('2023-05-31T21:30:00Z'),
    createdAt: new Date('2023-06-01T00:01:00Z'),
    updatedAt: new Date('2023-06-01T00:01:00Z'),
  }),
];

/**
 * Sample response for the polling restart endpoint
 */
export const samplePollingRestartResponse = {
  restarted: true,
  message: 'Polling restarted successfully',
};

/**
 * Sample snake ways user response (can be used for testing snake ways endpoints)
 */
export const sampleSnakeWaysUsers = sampleUsers.map((user) => ({
  ...user,
  source: 'snake_ways',
}));

/**
 * Get a mock user based on user ID
 */
export function getMockUserById(userId: string): UserEntity | undefined {
  return sampleUsers.find((user) => user.id === userId);
}

/**
 * Get mock history snapshots based on user ID and date range
 */
export function getMockUserHistory(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): UserHistorySnapshotEntity[] {
  let filteredHistory = sampleUserHistory.filter(
    (snapshot) => snapshot.userId === userId,
  );

  if (startDate) {
    filteredHistory = filteredHistory.filter(
      (snapshot) => snapshot.snapshotDate >= startDate,
    );
  }

  if (endDate) {
    filteredHistory = filteredHistory.filter(
      (snapshot) => snapshot.snapshotDate <= endDate,
    );
  }

  return filteredHistory;
}
