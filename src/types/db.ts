export interface Job {
    hash: string;
    prompt: string;
    type: 'imagine' | 'upscale' | 'variation';
    status: 'sent' | 'waiting' | 'progress' | 'done' | 'error';
    progress: number;
    result_url?: string;
    created_at: Date;
    updated_at: Date;
    parent_hash?: string;
    error_reason?: string;
} 