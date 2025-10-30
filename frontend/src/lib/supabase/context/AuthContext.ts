import { createContext } from 'react';
import type { AuthState } from '../model/AuthState';

export const AuthContext = createContext<AuthState | undefined>(undefined);
