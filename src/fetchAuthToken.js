import { Auth } from 'aws-amplify';

export const fetchAuthToken = async () => {
  const session = await Auth.currentSession();
  const token = session.getIdToken().getJwtToken();
  return { token };
};
