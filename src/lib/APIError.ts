import { APIError as PayloadAPIError } from 'payload'

export class APIError extends PayloadAPIError {
  constructor(message: string, status?: number) {
    super(message, status ?? 400, undefined, true)
  }
}
