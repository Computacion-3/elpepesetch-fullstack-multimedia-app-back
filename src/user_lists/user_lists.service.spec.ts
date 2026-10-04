import { Test, TestingModule } from '@nestjs/testing';
import { UserListsService } from './user_lists.service.js';

describe('UserListsService', () => {
  let service: UserListsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserListsService],
    }).compile();

    service = module.get<UserListsService>(UserListsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
