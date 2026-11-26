import { HttpException } from '@nestjs/common';
import { GraphQLError, type GraphQLFormattedError, type SelectionSetNode, type ValidationRule } from 'graphql';

const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
};
const statuses: Record<string, number> = Object.fromEntries(Object.entries(codes).map(([status, code]) => [code, Number(status)]));

export function formatGraphqlError(error: GraphQLFormattedError, graphqlError: unknown): GraphQLFormattedError {
    const original = graphqlError instanceof GraphQLError ? graphqlError.originalError : graphqlError;
    const status =
        original instanceof HttpException
            ? original.getStatus()
            : (error.extensions?.status as number | undefined) ?? statuses[String(error.extensions?.code)];
    if (status === undefined) return error;
    return {
        ...error,
        extensions: {
            ...error.extensions,
            code: codes[status] ?? String(error.extensions?.code ?? 'INTERNAL_SERVER_ERROR'),
            status,
        },
    };
}

export function limitGraphqlDepth(maxDepth: number): ValidationRule {
    return (context) => ({
        OperationDefinition(node) {
            const fragments = new Map(
                context.getDocument().definitions
                    .filter((definition) => definition.kind === 'FragmentDefinition')
                    .map((fragment) => [fragment.name.value, fragment]),
            );
            const depth = (selectionSet: SelectionSetNode | undefined, fragmentPath = new Set<string>()): number => {
                if (!selectionSet) return 0;
                return Math.max(
                    0,
                    ...selectionSet.selections.map((selection) => {
                        if (selection.kind === 'Field') return 1 + depth(selection.selectionSet, fragmentPath);
                        if (selection.kind === 'InlineFragment') return depth(selection.selectionSet, fragmentPath);
                        if (fragmentPath.has(selection.name.value)) return 0;
                        const fragment = fragments.get(selection.name.value);
                        if (!fragment) return 0;
                        const nextPath = new Set(fragmentPath).add(selection.name.value);
                        return depth(fragment.selectionSet, nextPath);
                    }),
                );
            };
            const actualDepth = depth(node.selectionSet);
            if (actualDepth > maxDepth) {
                context.reportError(
                    new GraphQLError(`Query depth ${actualDepth} exceeds the maximum depth of ${maxDepth}.`, {
                        nodes: node,
                    }),
                );
            }
        },
    });
}
