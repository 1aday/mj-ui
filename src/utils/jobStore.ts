import { Job } from '@/types/db';
import { logger } from '@/utils/logger';

class JobStore {
    private jobs: Map<string, Job> = new Map();

    addJob(hash: string, prompt: string, type: Job['type']): Job {
        logger.info('Adding new job to store', { hash, prompt, type });
        const job: Job = {
            hash,
            prompt,
            type,
            status: 'sent',
            progress: 0,
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.jobs.set(hash, job);
        return job;
    }

    getJob(hash: string): Job | undefined {
        const job = this.jobs.get(hash);
        if (!job) {
            logger.warning('Job not found in store', { hash });
        }
        return job;
    }

    updateJob(hash: string, updates: Partial<Job>): Job {
        const job = this.jobs.get(hash);
        if (!job) {
            // If job doesn't exist, create it with the updates
            logger.warning('Creating job during update', { hash, updates });
            return this.addJob(hash, updates.prompt || '', updates.type || 'imagine');
        }

        const updatedJob = {
            ...job,
            ...updates,
            updated_at: new Date(),
        };
        this.jobs.set(hash, updatedJob);
        logger.info('Updated job in store', { hash, status: updatedJob.status, progress: updatedJob.progress });
        return updatedJob;
    }

    // Optional: Add method to clean up old jobs
    cleanup(maxAgeHours: number = 24) {
        const now = new Date();
        for (const [hash, job] of this.jobs.entries()) {
            const ageHours = (now.getTime() - job.updated_at.getTime()) / (1000 * 60 * 60);
            if (ageHours > maxAgeHours) {
                this.jobs.delete(hash);
                logger.info('Cleaned up old job', { hash });
            }
        }
    }
}

export const jobStore = new JobStore();

// Optional: Set up periodic cleanup
if (typeof window === 'undefined') { // Only run on server
    setInterval(() => jobStore.cleanup(), 1000 * 60 * 60); // Clean up every hour
} 