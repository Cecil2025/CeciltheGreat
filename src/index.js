import React from 'react';
import ReactDOM from 'react-dom/client';
import MissionControlApp from './MissionControlApp'; // Your main component

// Note: You must remove the global variables from your code before deploying:
// The code you provided uses __firebase_config, __app_id, and __initial_auth_token.
// Make sure to follow the instructions in Step 4 below to properly set up Firebase.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MissionControlApp />
  </React.StrictMode>
);