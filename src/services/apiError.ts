export function getApiErrorMessage(err: unknown, fallbackMessage = 'Request failed'): string {
  if (!err) return fallbackMessage;

  const errorObj = err as {
    response?: {
      status?: number;
      data?: {
        error?: string;
        message?: string;
      };
      statusText?: string;
    };
    message?: string;
    code?: string;
  };

  const res = errorObj.response;
  if (res) {
    // 1. Prefer server-provided error message string if returned
    if (res.data?.error) return res.data.error;
    if (res.data?.message) return res.data.message;

    // 2. Map status codes to specific user-facing descriptions
    switch (res.status) {
      case 401:
        return 'Invalid Password';
      case 403:
        return 'Account Deactivated: Staff account is disabled. Contact Manager or Super Admin.';
      case 423:
        return 'Account Locked: 5 consecutive failed login attempts detected. Try again in 15 minutes.';
      case 429:
        return 'Too Many Requests: Rate limit exceeded. Please wait a minute before retrying.';
      case 500:
        return 'Authentication server internal error (500). Please contact technical support.';
      case 502:
      case 503:
      case 504:
        return 'Authentication server unavailable (502/503/504). Please try again shortly.';
      default:
        return res.statusText || fallbackMessage;
    }
  }

  // 3. Network or connection errors
  if (errorObj.code === 'ECONNABORTED' || errorObj.message?.includes('timeout')) {
    return 'Connection timeout: Authentication server took too long to respond.';
  }
  if (errorObj.message?.includes('Network Error') || errorObj.code === 'ERR_NETWORK') {
    return 'Unable to reach authentication server. Please check internet connection or server status.';
  }

  return errorObj.message || fallbackMessage;
}
