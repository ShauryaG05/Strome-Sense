import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import AIChat from './components/ChatPage'

/**
 * App Component - Central Application Router & Flow Controller
 * 
 * Manage application routing, shared state, and component integration here.
 * Add new pages and view components by defining new <Route /> paths below.
 */
export default function App() {
  // Global shared state across different views (e.g. current cyclone assessment)
  const [assessment, setAssessment] = useState(null)

  return (
    <BrowserRouter>
      <Routes>
        {/* Main Cyclone Risk Assessment & Map Dashboard */}
        <Route
          path="/"
          element={
            <Dashboard
              sharedAssessment={assessment}
              onAssessmentChange={setAssessment}
            />
          }
        />

        <Route
          path="/dashboard"
          element={<Dashboard sharedAssessment={assessment} onAssessmentChange={setAssessment} />}
        />

        {/* Gemini AI Emergency Assistant & Disaster Chatbot */}
        <Route path="/chat" element={<AIChat assessment={assessment} />}/>
        <Route path="/ai-chat" element={<AIChat assessment={assessment} />}/>

        {/* Fallback route - Redirect any unknown URL to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
