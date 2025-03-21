type LogType = 'info' | 'success' | 'error' | 'warning' | 'api';

type LogArg = string | number | boolean | null | undefined | object;

const getLogStyle = (type: LogType): string => {
    const styles = {
        info: 'color: #3498db; font-weight: bold;',
        success: 'color: #2ecc71; font-weight: bold;',
        error: 'color: #e74c3c; font-weight: bold;',
        warning: 'color: #f1c40f; font-weight: bold;',
        api: 'color: #9b59b6; font-weight: bold;'
    };
    return styles[type];
};

export const logger = {
    info: (title: string, ...args: LogArg[]) => {
        console.log(`%c[INFO] ${title}`, getLogStyle('info'), ...args);
    },
    success: (title: string, ...args: LogArg[]) => {
        console.log(`%c[SUCCESS] ${title}`, getLogStyle('success'), ...args);
    },
    error: (title: string, ...args: LogArg[]) => {
        console.log(`%c[ERROR] ${title}`, getLogStyle('error'), ...args);
    },
    warning: (title: string, ...args: LogArg[]) => {
        console.log(`%c[WARNING] ${title}`, getLogStyle('warning'), ...args);
    },
    api: (method: string, endpoint: string, data?: Record<string, unknown>) => {
        console.group(`%c[API] ${method} ${endpoint}`, getLogStyle('api'));
        if (data) {
            console.log('Data:', data);
        }
        console.groupEnd();
    }
}; 