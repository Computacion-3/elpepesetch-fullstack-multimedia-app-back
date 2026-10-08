import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta (o controlador) como accesible sin token. Por defecto todas las rutas requieren autenticación. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
