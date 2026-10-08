import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function pgCode(error: unknown): string | undefined {
    if (!(error instanceof QueryFailedError)) {
        return undefined;
    }
    return (error.driverError as { code?: string } | undefined)?.code;
}

export const isUniqueViolation = (error: unknown): boolean => pgCode(error) === PG_UNIQUE_VIOLATION;
export const isForeignKeyViolation = (error: unknown): boolean => pgCode(error) === PG_FOREIGN_KEY_VIOLATION;
