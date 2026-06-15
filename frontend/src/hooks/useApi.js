import axios from 'axios';
import { useAuth } from './useAuth';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const useApi = () => {
  const { getToken } = useAuth();

  const authFetch = async (endpoint, options = {}) => {
    const token = await getToken();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      url: `${API_URL}${endpoint}`,
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    return axios(config);
  };

  return { authFetch };
};

export default useApi;
