import { KeyboardProvider } from "./keyboard/KeyboardProvider";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </StrictMode>
)
