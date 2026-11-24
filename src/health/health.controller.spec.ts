import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

import { HealthController } from './health.controller.js';

describe('HealthController', () => {
    const controllerWith = (query: ReturnType<typeof vi.fn>) =>
        new HealthController({ query } as unknown as DataSource);

    afterEach(() => vi.unstubAllEnvs());

    it('responde ok con el commit desplegado cuando la base de datos contesta', async () => {
        vi.stubEnv('RENDER_GIT_COMMIT', 'abc123');
        const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

        const health = await controllerWith(query).check();

        expect(query).toHaveBeenCalledWith('SELECT 1');
        expect(health).toMatchObject({ status: 'ok', database: 'up', commit: 'abc123' });
        expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('sin RENDER_GIT_COMMIT el commit es null', async () => {
        vi.stubEnv('RENDER_GIT_COMMIT', undefined);
        vi.stubEnv('GIT_COMMIT', undefined);

        const health = await controllerWith(vi.fn().mockResolvedValue([])).check();

        expect(health.commit).toBeNull();
    });

    it('responde 503 si la base de datos no contesta', async () => {
        const error = await controllerWith(vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
            .check()
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
            status: 'error',
            database: 'down',
        });
    });
});
