import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
document.documentElement.classList.toggle('dark', isDark);

document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
