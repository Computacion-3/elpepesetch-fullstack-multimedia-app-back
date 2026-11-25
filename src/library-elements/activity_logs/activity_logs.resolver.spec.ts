import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ActivityQueryArgs } from './graphql/activity.inputs.js';
import { ActivityLogsResolver } from './activity_logs.resolver.js';
import { ActivityLogsService } from './activity_logs.service.js';

describe('ActivityLogsResolver', () => {
    const user = { id: 17 } as AuthenticatedUser;
    const result = { data: [], meta: { total: 0, page: 2, limit: 5, totalPages: 0 } };
    const service = { findAll: vi.fn().mockResolvedValue(result) };
    const resolver = new ActivityLogsResolver(service as unknown as ActivityLogsService);

    beforeEach(() => service.findAll.mockClear());

    it('queries only the authenticated user history with pagination and the media relation', async () => {
        const args = Object.assign(new ActivityQueryArgs(), { page: 2, limit: 5 });

        await expect(resolver.myActivity(user, args)).resolves.toBe(result);
        expect(service.findAll).toHaveBeenCalledWith(17, args, true);
    });

    it('uses the existing pagination defaults when arguments are omitted', async () => {
        const args = new ActivityQueryArgs();

        await resolver.myActivity(user, args);

        expect(service.findAll).toHaveBeenCalledWith(17, expect.objectContaining({ page: 1, limit: 10 }), true);
    });
});
