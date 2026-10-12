import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import '@/styles/globals.css'
import '@/i18n'
import { currentWindowLabel } from '@/lib/tauri'
import { App } from '@/app/App'
import { ReminderPopupApp } from '@/app/ReminderPopupApp'

// The same bundle serves the main window and the corner reminder popup.
const Root = currentWindowLabel() === 'reminder' ? ReminderPopupApp : App

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <Root />
    </MotionConfig>
  </React.StrictMode>,
)
