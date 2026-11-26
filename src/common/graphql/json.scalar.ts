import { GraphQLISODateTime } from '@nestjs/graphql';
import { valueFromASTUntyped } from 'graphql';

type GraphQLJsonScalarConfig = {
    name: string;
    description: string;
    serialize: (value: unknown) => unknown;
    parseValue: (value: unknown) => unknown;
    parseLiteral: typeof valueFromASTUntyped;
};

// Reusa el constructor de Nest para que la app y Apollo creen el scalar en el mismo contexto.
const GraphQLScalarTypeConstructor = GraphQLISODateTime.constructor as new (
    config: GraphQLJsonScalarConfig,
) => typeof GraphQLISODateTime;

export const GraphQLJSONScalar = new GraphQLScalarTypeConstructor({
    name: 'JSON',
    description: 'Un valor JSON de cualquier forma.',
    serialize: (value: unknown) => value,
    parseValue: (value: unknown) => value,
    parseLiteral: valueFromASTUntyped,
});