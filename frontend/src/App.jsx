import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './Pages/Home'
import Dashboard from './Pages/Dashboard'
import AIChat from './Pages/ChatPage'

/**
 * App Component - Central Application Router & Flow Controller
 */
export default function App() {
  // Global shared state across different views (e.g. current cyclone assessment)
  const [assessment, setAssessment] = useState(null)

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Cyclone Risk Assessment & Map Dashboard */}
        <Route
          path="/forecast"
          element={
            <Dashboard
              sharedAssessment={assessment}
              onAssessmentChange={setAssessment}
            />
          }
        />
        <Route
          path="/map"
          element={
            <Dashboard
              sharedAssessment={assessment}
              onAssessmentChange={setAssessment}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              sharedAssessment={assessment}
              onAssessmentChange={setAssessment}
            />
          }
        />

        {/* Grok AI Emergency Assistant & Disaster Chatbot */}
        <Route path="/chat" element={<AIChat assessment={assessment} />} />
        <Route path="/ai-chat" element={<AIChat assessment={assessment} />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
