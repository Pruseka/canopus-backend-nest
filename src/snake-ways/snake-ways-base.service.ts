// src/external-service/external-base.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  Observable,
  catchError,
  firstValueFrom,
  interval,
  map,
  of,
  startWith,
  switchMap,
  takeWhile,
  timeout,
} from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class SnakeWaysBaseService {
  protected readonly logger = new Logger(SnakeWaysBaseService.name);
  // Keep serviceAvailable but only use it for diagnostic purposes and one-time requests
  private serviceAvailable = true;
  private consecutiveFailuresMap: Map<string, number> = new Map();
  private readonly maxConsecutiveFailures = 10;

  constructor(protected readonly httpService: HttpService) {
    // Check service availability on startup - just for diagnostic purposes
    this.checkServiceAvailability();
  }

  /**
   * Check if the external service is available
   * This is primarily for diagnostic purposes
   */
  public async checkServiceAvailability() {
    try {
      await firstValueFrom(
        this.httpService.get('/').pipe(
          timeout(3000),
          catchError((error) => {
            if (error.code === 'ECONNREFUSED') {
              this.serviceAvailable = false;
              this.incrementConsecutiveFailures('/');
              this.logger.warn(
                `Snake Ways service connection refused at ${error.config?.baseURL || 'the configured URL'}. Some features may be limited. Consecutive failures: ${this.getConsecutiveFailures('/')}/${this.maxConsecutiveFailures}`,
              );
            } else if (
              error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
              error.code === 'CERT_HAS_EXPIRED'
            ) {
              // SSL certificate errors should be ignored due to our configuration, but log them just in case
              this.logger.warn(
                'SSL certificate validation issue, but continuing anyway due to httpsAgent configuration.',
              );
              this.serviceAvailable = true; // We're still considering the service available
              this.resetConsecutiveFailures('/');
            } else {
              this.serviceAvailable = false;
              this.incrementConsecutiveFailures('/');
              this.logger.warn(
                `Snake Ways service is not currently available. Error: ${error.message}. Some features may be limited. Consecutive failures: ${this.getConsecutiveFailures('/')}/${this.maxConsecutiveFailures}`,
              );
            }
            return of({ data: null });
          }),
        ),
      );
    } catch (error) {
      this.serviceAvailable = false;
      this.incrementConsecutiveFailures('/');
      this.logger.warn(
        `Snake Ways service is not available. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Some features may be limited. Consecutive failures: ${this.getConsecutiveFailures('/')}/${this.maxConsecutiveFailures}`,
      );
    }
  }

  /**
   * Get the consecutive failures count for a specific endpoint
   */
  protected getConsecutiveFailures(endpoint: string): number {
    return this.consecutiveFailuresMap.get(endpoint) || 0;
  }

  /**
   * Increment the consecutive failures counter for a specific endpoint
   */
  protected incrementConsecutiveFailures(endpoint: string): void {
    const currentFailures = this.getConsecutiveFailures(endpoint);
    this.consecutiveFailuresMap.set(endpoint, currentFailures + 1);
  }

  /**
   * Reset the consecutive failures counter for a specific endpoint when service becomes available
   */
  protected resetConsecutiveFailures(endpoint: string): void {
    const currentFailures = this.getConsecutiveFailures(endpoint);
    if (currentFailures > 0) {
      this.logger.log(
        `Resetting consecutive failures counter for ${endpoint} from ${currentFailures} to 0`,
      );
      this.consecutiveFailuresMap.set(endpoint, 0);
    }
  }

  /**
   * Reset service availability status
   * This should be called when attempting to restart polling
   */
  protected resetServiceAvailability(): void {
    if (!this.serviceAvailable) {
      this.logger.log(
        'Resetting service availability status from unavailable to available',
      );
      this.serviceAvailable = true;
    }
  }

  /**
   * Check if we should stop polling due to too many consecutive failures for a specific endpoint
   */
  protected shouldStopPolling(endpoint: string): boolean {
    return this.getConsecutiveFailures(endpoint) >= this.maxConsecutiveFailures;
  }

  /**
   * Perform a GET request to the external service
   * For one-time requests, we still check serviceAvailable to avoid unnecessary network calls
   */
  protected async get<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T | null> {
    // For one-time requests, still check serviceAvailable to avoid unnecessary network calls
    if (!this.serviceAvailable) {
      this.logger.warn(
        `GET ${endpoint} skipped: Service unavailable. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
      );
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<T>(endpoint, config).pipe(
          timeout(3000),
          catchError((error: AxiosError) => {
            this.handleError('GET', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );

      // If we get here, the request succeeded
      this.resetConsecutiveFailures(endpoint);
      return data;
    } catch (error) {
      this.logger.error(`Failed GET request to ${endpoint}`);
      throw error;
    }
  }

  /**
   * Perform a POST request to the external service
   */
  protected async post<T>(
    endpoint: string,
    payload: any,
    config?: AxiosRequestConfig,
  ): Promise<T | null> {
    // For one-time requests, still check serviceAvailable to avoid unnecessary network calls
    if (!this.serviceAvailable) {
      this.logger.warn(
        `POST ${endpoint} skipped: Service unavailable. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
      );
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<T>(endpoint, payload, config).pipe(
          timeout(3000),
          catchError((error: AxiosError) => {
            this.handleError('POST', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );

      // If we get here, the request succeeded
      this.resetConsecutiveFailures(endpoint);
      return data;
    } catch (error) {
      this.logger.error(`Failed POST request to ${endpoint}`);
      throw error;
    }
  }

  /**
   * Perform a PUT request to the external service
   */
  protected async put<T>(
    endpoint: string,
    payload: any,
    config?: AxiosRequestConfig,
  ): Promise<T | null> {
    // For one-time requests, still check serviceAvailable to avoid unnecessary network calls
    if (!this.serviceAvailable) {
      this.logger.warn(
        `PUT ${endpoint} skipped: Service unavailable. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
      );
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.put<T>(endpoint, payload, config).pipe(
          timeout(3000),
          catchError((error: AxiosError) => {
            this.handleError('PUT', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );

      // If we get here, the request succeeded
      this.resetConsecutiveFailures(endpoint);
      return data;
    } catch (error) {
      this.logger.error(`Failed PUT request to ${endpoint}`);
      throw error;
    }
  }

  /**
   * Perform a DELETE request to the external service
   */
  protected async delete<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T | null> {
    // For one-time requests, still check serviceAvailable to avoid unnecessary network calls
    if (!this.serviceAvailable) {
      this.logger.warn(
        `DELETE ${endpoint} skipped: Service unavailable. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
      );
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.delete<T>(endpoint, config).pipe(
          timeout(3000),
          catchError((error: AxiosError) => {
            this.handleError('DELETE', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );

      // If we get here, the request succeeded
      this.resetConsecutiveFailures(endpoint);
      return data;
    } catch (error) {
      this.logger.error(`Failed DELETE request to ${endpoint}`);
      throw error;
    }
  }

  /**
   * Create a polling observable that periodically fetches data
   * @param endpoint The endpoint to poll
   * @param intervalMs Polling interval in milliseconds
   */
  protected createPollingObservable<T>(
    endpoint: string,
    intervalMs = 5000,
  ): Observable<T | null> {
    this.logger.log(`Starting polling for ${endpoint} every ${intervalMs}ms`);

    return interval(intervalMs).pipe(
      startWith(0), // Emit immediately on subscription
      takeWhile(() => !this.shouldStopPolling(endpoint)), // Stop if too many failures
      switchMap(() => {
        // For polling, we always attempt the request regardless of serviceAvailable
        // This allows recovery from temporary service outages
        return this.httpService.get<T>(endpoint).pipe(
          timeout(3000),
          map((response) => {
            // Reset failure counter on success
            this.resetConsecutiveFailures(endpoint);
            // Also reset service availability flag
            this.resetServiceAvailability();
            return response.data;
          }),
          catchError((error) => {
            // For polling, we need to handle errors differently than one-time requests
            // We'll log the error and increment the failure counter, but not throw
            if (error.code === 'ECONNREFUSED') {
              // Only set serviceAvailable to false for connection refused errors
              this.serviceAvailable = false;
              this.incrementConsecutiveFailures(endpoint);
              this.logger.warn(
                `Snake Ways service is not available at ${error.config?.baseURL || 'the configured URL'}. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
              );
            } else if (
              error.code === 'ETIMEDOUT' ||
              error.code === 'ECONNABORTED'
            ) {
              this.incrementConsecutiveFailures(endpoint);
              this.logger.warn(
                `Request to ${endpoint} timed out. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
              );
            } else if (
              error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
              error.code === 'CERT_HAS_EXPIRED' ||
              error.code === 'ERR_TLS_CERT_ALTNAME_INVALID'
            ) {
              this.logger.warn(
                `SSL certificate validation issue for ${endpoint}, but continuing due to httpsAgent configuration.`,
              );
              this.resetConsecutiveFailures(endpoint);
            } else if (error.response) {
              this.logger.error(
                `GET ${endpoint} failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`,
              );
              this.resetConsecutiveFailures(endpoint);
            } else if (error.request) {
              this.logger.error(
                `GET ${endpoint} failed: No response received from server`,
              );
              this.incrementConsecutiveFailures(endpoint);
            } else {
              this.logger.error(`GET ${endpoint} failed: ${error.message}`);
              this.incrementConsecutiveFailures(endpoint);
            }

            this.logger.warn(
              `Failed to poll ${endpoint}. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
            );

            // Check if we've reached max failures
            if (this.shouldStopPolling(endpoint)) {
              this.logger.error(
                `Stopping polling for ${endpoint} after ${this.maxConsecutiveFailures} consecutive failures`,
              );
            }

            // Return null to prevent the stream from terminating
            return of(null);
          }),
        );
      }),
    );
  }

  /**
   * Consistent error handling for HTTP requests
   */
  private handleError(
    method: string,
    endpoint: string,
    error: AxiosError,
  ): void {
    if (error.code === 'ECONNREFUSED') {
      // Only set serviceAvailable to false for connection refused errors
      this.serviceAvailable = false;
      this.incrementConsecutiveFailures(endpoint);
      this.logger.warn(
        `Snake Ways service is not available at ${error.config?.baseURL || 'the configured URL'}. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
      );
      throw error;
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      this.incrementConsecutiveFailures(endpoint);
      this.logger.warn(
        `Request to ${endpoint} timed out. Consecutive failures: ${this.getConsecutiveFailures(endpoint)}/${this.maxConsecutiveFailures}`,
      );
      // Don't set serviceAvailable to false for timeouts, as they might be temporary
      throw error;
    }

    // Handle SSL certificate errors
    if (
      error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
      error.code === 'CERT_HAS_EXPIRED' ||
      error.code === 'ERR_TLS_CERT_ALTNAME_INVALID'
    ) {
      this.logger.warn(
        `SSL certificate validation issue for ${method} ${endpoint}, but continuing due to httpsAgent configuration.`,
      );
      this.resetConsecutiveFailures(endpoint); // Reset counter for SSL issues we're ignoring
      throw error;
    }

    if (error.response) {
      // The request was made and the server responded with a status code outside the 2xx range
      this.logger.error(
        `${method} ${endpoint} failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`,
      );
      // Don't increment failures for HTTP responses (even errors) as the service is technically available
      this.resetConsecutiveFailures(endpoint);
      throw error;
    } else if (error.request) {
      // The request was made but no response was received
      this.logger.error(
        `${method} ${endpoint} failed: No response received from server`,
      );
      this.incrementConsecutiveFailures(endpoint);
      // Don't set serviceAvailable to false for no response, as they might be temporary
      throw error;
    } else {
      // Something happened in setting up the request that triggered an Error
      this.logger.error(`${method} ${endpoint} failed: ${error.message}`);
      this.incrementConsecutiveFailures(endpoint);
      throw error;
    }
  }
}
