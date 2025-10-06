/**
 * Interfaces for IVR Mapping Service
 * Defines types for async job management and IVR mapping workflow
 */

/**
 * Status of an IVR mapping job
 */
export type JobStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Request data for initiating IVR mapping
 */
export interface IvrMappingRequest {
    phoneNumber: string;
    callbackUrl?: string;
}

/**
 * Response when job is created
 */
export interface IvrMappingJobResponse {
    success: boolean;
    jobId: string;
    message: string;
}

/**
 * IVR mapping result data
 */
export interface IvrMappingResult {
    context: string;
    ivrMapping: any;
}

/**
 * Complete job state
 */
export interface IvrMappingJobState {
    jobId: string;
    status: JobStatus;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    request: IvrMappingRequest;
    result?: IvrMappingResult;
    error?: string;
    callbackUrl?: string;
}

/**
 * Job status response
 */
export interface IvrMappingJobStatusResponse {
    success: boolean;
    jobId: string;
    status: JobStatus;
    result?: IvrMappingResult;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
