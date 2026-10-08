import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsController } from './activity_logs.controller.js';
import { ActivityLogsService } from './activity_logs.service.js';

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogsController],
      providers: [ActivityLogsService],
    }).compile();

    controller = module.get<ActivityLogsController>(ActivityLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
