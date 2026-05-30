import React from 'react';
import { Onboarding } from '../screens/Onboarding/Onboarding';
import { Login } from '../screens/Auth/Login';
import { Register } from '../screens/Auth/Register';
import { ForgotPassword } from '../screens/Recovery/ForgotPassword';
import { VerifyEmail } from '../screens/Verification/VerifyEmail';
import { LocationPermission } from '../screens/Verification/LocationPermission';
import { ResetPassword } from '../screens/Recovery/ResetPassword';

export type RouteHandler = React.ComponentType<any>;

export interface RouteConfig {
  component: RouteHandler;
}

export const AUTH_CATCHALL_MAP: Record<string, RouteConfig> = {
  'onboarding': { component: Onboarding },
  'login': { component: Login },
  'register': { component: Register },
  'forgot-password': { component: ForgotPassword },
  'verification': { component: VerifyEmail },
  'location': { component: LocationPermission },
  'reset-password': { component: ResetPassword },
};

export const resolveAuthRoute = (rest: string[]) => {
  const path = rest.join('/');
  if (AUTH_CATCHALL_MAP[path]) {
    return { config: AUTH_CATCHALL_MAP[path], params: {} };
  }
  return null;
};
