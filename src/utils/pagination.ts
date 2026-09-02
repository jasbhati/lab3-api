import { AppError } from '../middleware/errorHandler.js';

export function encodeCursor(taskId: string): string {
  return Buffer.from(taskId, 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');

  // Round-trip check catches malformed/tampered cursors since we control encoding.
  if (Buffer.from(decoded, 'utf8').toString('base64') !== cursor) {
    throw new AppError(400, 'INVALID_CURSOR', 'Cursor is invalid or expired');
  }

  return decoded;
}
