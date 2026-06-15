import { auth } from '../firebase';

export const useAuth = () => {
  return {
    getToken: async () => {
      if (auth?.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      return null;
    },
    user: auth?.currentUser
  };
};

export default useAuth;
