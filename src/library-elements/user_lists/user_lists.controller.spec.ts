import { Test, TestingModule } from '@nestjs/testing';
import { UserListsController } from './user_lists.controller.js';
import { UserListsService } from './user_lists.service.js';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';

describe('UserListsController', () => {
  let controller: UserListsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserListsController],
      providers: [
        UserListsService,
        { provide: 'UserListRepository', useValue: {} },
        { provide: 'MediaItemRepository', useValue: {} },
        { provide: ActivityLogsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UserListsController>(UserListsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
