// useAuth Hook - Simple interface to Auth Context
import { useAuthContext } from '../contexts/AuthContext';

// Custom hook that returns auth context values
export const useAuth = () => {
  return useAuthContext();
};
