import { apiFetch, API_ENDPOINTS } from '../constants/api';

/**
 * Common logging and analytics utilities for the pharmacy app.
 * Ensuring all calls are robust and non-blocking for the UI.
 */

export const logUserLocation = async (latitude: number, longitude: number) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.AUTH.UPDATE_USER_LOCATION, {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error("Error logging user location:", error);
    return null;
  }
};

export const logUserActivity = async (action: string, metadata: object = {}) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.AUTH.LOG_USER_ACTIVITY, {
      method: "POST",
      body: JSON.stringify({ action, metadata, timestamp: new Date().toISOString() }),
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error("Error logging user activity:", error);
    return null;
  }
};
