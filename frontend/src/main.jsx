import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "10px",
            padding: "13px 16px",
            fontSize: "13.5px",
            fontWeight: "500",
            lineHeight: "1.45",
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 30px -5px rgba(0,0,0,0.10)",
            border: "1px solid #e2e8f0",
            maxWidth: "360px",
          },

          success: {
            style: {
              borderLeft: "4px solid #16a34a",
            },
            iconTheme: {
              primary: "#16a34a",
              secondary: "#f0fdf4",
            },
          },

          error: {
            style: {
              borderLeft: "4px solid #dc2626",
            },
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fef2f2",
            },
          },

          loading: {
            style: {
              borderLeft: "4px solid #2563eb",
            },
            iconTheme: {
              primary: "#2563eb",
              secondary: "#eff6ff",
            },
          },
        }}
      />
    </AuthProvider>
  </StrictMode>
)