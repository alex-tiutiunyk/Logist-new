import { getDatabase } from 'firebase/database'
import { app } from './config.js'

export const rtdb = getDatabase(app)
