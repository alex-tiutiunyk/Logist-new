import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { app } from './config.js'

export const functions = getFunctions(app, 'us-central1')

// Connect to local emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001)
}
