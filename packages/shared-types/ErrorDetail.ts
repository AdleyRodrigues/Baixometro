/**
 * Detalhes estruturados do erro retornado pela API.
 */

export type ErrorDetail = {
  code: string,
  message: string,
  details?: string,
};
