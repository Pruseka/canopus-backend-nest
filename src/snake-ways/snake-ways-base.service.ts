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
  timeout,
} from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class SnakeWaysBaseService {
  protected readonly logger = new Logger(SnakeWaysBaseService.name);
  private serviceAvailable = true;

  constructor(protected readonly httpService: HttpService) {
    // Check service availability on startup
    this.checkServiceAvailability();
  }

  /**
   * Check if the external service is available
   */
  private async checkServiceAvailability() {
    try {
      await firstValueFrom(
        this.httpService.get('/').pipe(
          timeout(3000),
          catchError((error) => {
            if (error.code === 'ECONNREFUSED') {
              this.serviceAvailable = false;
              this.logger.warn(
                `Snake Ways service connection refused at ${error.config?.baseURL || 'the configured URL'}. Some features may be limited.`,
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
            } else {
              this.serviceAvailable = false;
              this.logger.warn(
                `Snake Ways service is not available. Error: ${error.message}. Some features may be limited.`,
              );
            }
            return of({ data: null });
          }),
        ),
      );
    } catch (error) {
      this.serviceAvailable = false;
      this.logger.warn(
        `Snake Ways service is not available. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Some features may be limited.`,
      );
    }
  }

  /**
   * Perform a GET request to the external service
   */
  protected async get<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T | null> {
    if (!this.serviceAvailable) {
      this.logger.warn(`GET ${endpoint} skipped: Service unavailable`);
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<T>(endpoint, config).pipe(
          timeout(10000),
          catchError((error: AxiosError) => {
            this.handleError('GET', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed GET request to ${endpoint}`);
      return null;
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
    if (!this.serviceAvailable) {
      this.logger.warn(`POST ${endpoint} skipped: Service unavailable`);
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<T>(endpoint, payload, config).pipe(
          timeout(10000),
          catchError((error: AxiosError) => {
            this.handleError('POST', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed POST request to ${endpoint}`);
      return null;
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
    if (!this.serviceAvailable) {
      this.logger.warn(`PUT ${endpoint} skipped: Service unavailable`);
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.put<T>(endpoint, payload, config).pipe(
          timeout(10000),
          catchError((error: AxiosError) => {
            this.handleError('PUT', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed PUT request to ${endpoint}`);
      return null;
    }
  }

  /**
   * Perform a DELETE request to the external service
   */
  protected async delete<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T | null> {
    if (!this.serviceAvailable) {
      this.logger.warn(`DELETE ${endpoint} skipped: Service unavailable`);
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.delete<T>(endpoint, config).pipe(
          timeout(10000),
          catchError((error: AxiosError) => {
            this.handleError('DELETE', endpoint, error);
            return of({ data: null as T });
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed DELETE request to ${endpoint}`);
      return null;
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
      switchMap(() => {
        if (!this.serviceAvailable) {
          this.logger.warn(`Polling ${endpoint} skipped: Service unavailable`);
          return of(null);
        }

        return this.httpService.get<T>(endpoint).pipe(
          map((response) => response.data),
          catchError((error) => {
            this.handleError('GET', endpoint, error);
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
      this.serviceAvailable = false;
      this.logger.warn(
        `Snake Ways service is not available at ${error.config?.baseURL || 'the configured URL'}`,
      );
      return;
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
      return;
    }

    if (error.response) {
      // The request was made and the server responded with a status code outside the 2xx range
      this.logger.error(
        `${method} ${endpoint} failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`,
      );
    } else if (error.request) {
      // The request was made but no response was received
      this.logger.error(`${method} ${endpoint} failed: No response received`);
    } else {
      // Something happened while setting up the request
      this.logger.error(`${method} ${endpoint} failed: ${error.message}`);
    }
  }
}
