// import React, { useEffect, useState } from 'react';
// import { withAuthenticator } from '@aws-amplify/ui-react';
// import { Auth } from 'aws-amplify';

// function App({ signOut }) {
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     Auth.currentAuthenticatedUser()
//       .then((user) => {
//         setUser(user);
//       })
//       .catch((err) => {
//         console.error('Error loading user', err);
//       });
//   }, []);

//   if (!user) {
//     return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading user...</div>;
//   }

//   return (
//     <div style={{ textAlign: 'center', marginTop: '50px' }}>
//       <h1>Welcome, {user.username}!</h1>
//       <button onClick={signOut}>Sign out</button>
//     </div>
//   );
// }

// export default withAuthenticator(App);


import React from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import Dashboard from './Dashboard';

function App() {
  return <Dashboard />;
}

export default withAuthenticator(App);
