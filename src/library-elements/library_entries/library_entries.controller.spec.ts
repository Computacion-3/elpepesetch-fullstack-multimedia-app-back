import { Test, TestingModule } from '@nestjs/testing';
import { LibraryEntriesController } from './library_entries.controller.js';
import { LibraryEntriesService } from './library_entries.service.js';

describe('LibraryEntriesController', () => {
  let controller: LibraryEntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryEntriesController],
      providers: [LibraryEntriesService],
    }).compile();

    controller = module.get<LibraryEntriesController>(LibraryEntriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
