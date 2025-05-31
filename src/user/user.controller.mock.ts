import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { UserHistorySnapshotEntity } from './entities/user-history-snapshot.entity';
import {
  sampleUsers,
  sampleUserHistory,
  samplePollingRestartResponse,
  sampleSnakeWaysUsers,
  getMockUserById,
  getMockUserHistory,
} from './sample-data/user-sample';

/**
 * Example of how to create a mock UserService for testing
 */
export class MockUserService {
  async getAllUsers(): Promise<UserEntity[]> {
    return sampleUsers;
  }

  async getSnakeWaysUsers(): Promise<UserEntity[]> {
    return sampleSnakeWaysUsers;
  }

  async forceSyncUsers(): Promise<UserEntity[]> {
    return sampleSnakeWaysUsers;
  }

  async restartPolling(): Promise<{ restarted: boolean; message: string }> {
    return samplePollingRestartResponse;
  }

  async getUserHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserHistorySnapshotEntity[]> {
    return getMockUserHistory(userId, startDate, endDate);
  }
}

/**
 * Example of how to create a mock UserController for testing
 */
export function createMockUserController(): UserController {
  const mockUserService = new MockUserService();
  return new UserController(mockUserService as unknown as UserService);
}

/**
 * Usage examples
 */

/* 
// Example 1: Using the mock controller directly
const mockController = createMockUserController();

// Get all users
mockController.getAllUsers().then(users => {
  console.log('All users:', users);
});

// Get Snake Ways users 
mockController.getSnakeWaysUsers().then(users => {
  console.log('Snake Ways users:', users);
});

// Force sync users
mockController.forceSyncUsers().then(users => {
  console.log('Synced users:', users);
});

// Restart polling
mockController.restartPolling().then(result => {
  console.log('Polling restart result:', result);
});

// Get user history
const userId = 'clj5o5p6q7r8s9t0u1'; // Regular user ID
const startDate = new Date('2023-05-26');
const endDate = new Date('2023-06-02');
mockController.getUserHistory(userId, startDate, endDate).then(history => {
  console.log('User history:', history);
});

// Example 2: Using the sample data directly in tests
// For Jest or other testing frameworks:

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    service = new MockUserService() as unknown as UserService;
    controller = new UserController(service);
  });

  it('should return all users', async () => {
    const result = await controller.getAllUsers();
    expect(result).toEqual(sampleUsers);
  });

  it('should return user history', async () => {
    const userId = 'clj5o5p6q7r8s9t0u1';
    const result = await controller.getUserHistory(userId);
    expect(result).toEqual(sampleUserHistory.filter(h => h.userId === userId));
  });
});
*/
