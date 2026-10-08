import { Test, TestingModule } from '@nestjs/testing';
import { LibraryEntriesController } from './library_entries.controller.js';
import { LibraryEntriesService } from './library_entries.service.js';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';

describe('LibraryEntriesController', () => {
    let controller: LibraryEntriesController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [LibraryEntriesController],
            providers: [
                LibraryEntriesService,
                { provide: 'LibraryEntryRepository', useValue: {} },
                { provide: 'MediaItemRepository', useValue: {} },
                { provide: ActivityLogsService, useValue: {} },
            ],
        }).compile();

        controller = module.get<LibraryEntriesController>(LibraryEntriesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
