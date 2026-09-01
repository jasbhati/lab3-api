import { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
    const responseTimeMs = Number(elapsedNanoseconds) / 1_000_000;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.originalUrl,
        statusCode: response.statusCode,
        responseTimeMs: Number(responseTimeMs.toFixed(2)),
      }),
    );
  });

  next();
};