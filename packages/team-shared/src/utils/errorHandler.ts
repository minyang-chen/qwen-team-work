import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

export function fastifyErrorHandler(error: any, request: any, reply: any) {
  console.error('[ERROR]', error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal server error'
  });
}
