import { StackClientApp } from '@stackframe/react';
import { useNavigate } from 'react-router-dom';

// Custom Login/Registar screens live at /login and /registar. Stack's own handler pages
// (e.g. /handler/forgot-password, /handler/oauth-callback) stay reachable under /handler/*.
// Owner decision: after sign-in/sign-up (including the Google OAuth return) the user lands on Home ("/").
export const stackClientApp = new StackClientApp({
    projectId: import.meta.env.VITE_STACK_PROJECT_ID,
    publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
    tokenStore: 'cookie',
    redirectMethod: { useNavigate },
    urls: {
        signIn: '/login',
        signUp: '/registar',
        afterSignIn: '/',
        afterSignUp: '/',
        afterSignOut: '/',
    },
});
