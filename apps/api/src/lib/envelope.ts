import type { FastifyReply } from 'fastify';
import type { ApiResponse } from '@megadon/types';

export function ok<T>(reply: FastifyReply, data: T, status = 200): FastifyReply {
  const body: ApiResponse<T> = { data, error: null };
  return reply.code(status).send(body);
}

export function fail(reply: FastifyReply, code: string, message: string, status = 400): FastifyReply {
  const body: ApiResponse<never> = { data: null, error: { code, message } };
  return reply.code(status).send(body);
}
