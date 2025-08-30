import React, { useState } from 'react';
import RealACDCCreator from './components/RealACDCCreator';

export default function App() {
  const [currentView, setCurrentView] = useState('main');
  const handleRegister = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/mobile/employee/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: 'TEST001',
          full_name: 'Test User',
          department: 'IT',
          email: 'test@example.com'
        })
      });
      
      const data = await response.json();
      alert(`Employee registered! AID: ${data.aid}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      alert(`Backend Status: ${data.status} is ${data.message}`);
    } catch (error) {
      alert('Error: Cannot connect to backend');
    }
  };

  if (currentView === 'acdc') {
    return <RealACDCCreator />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '32px', color: '#2c3e50', marginBottom: '10px' }}>
        ðŸš€ Travlr-ID Mobile
      </h1>
      <p style={{ fontSize: '18px', color: '#7f8c8d', marginBottom: '40px' }}>
        Employee Travel Identity
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', width: '100%' }}>
        <button 
          onClick={handleHealthCheck}
          style={{
            backgroundColor: '#95a5a6',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Test Backend
        </button>
        
        <button 
          onClick={handleRegister}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Register Employee
        </button>

        <button 
          onClick={() => setCurrentView('acdc')}
          style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🎫 Create Real ACDC Credential
        </button>
      </div>
      
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', color: '#27ae60', marginBottom: '5px' }}>
          âœ… Connected to your backend API
        </p>
        <p style={{ fontSize: '14px', color: '#7f8c8d', fontFamily: 'monospace' }}>
          http://localhost:8000
        </p>
      </div>
    </div>
  );
}
