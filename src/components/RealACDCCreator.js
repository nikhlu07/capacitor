/**
 * Real ACDC Creator Component
 * Use this in your main frontend to create REAL ACDC credentials
 */

import React, { useState, useEffect } from 'react';
import TravlrACDCService from '../services/TravlrACDCService';

function RealACDCCreator() {
  const [service] = useState(new TravlrACDCService());
  const [serverStatus, setServerStatus] = useState('checking');
  const [formData, setFormData] = useState({
    issuerAid: '',
    holderAid: '',
    employeeId: 'TRAVLR-001',
    seatPreference: 'window',
    mealPreference: 'vegetarian',
    airlines: 'Travlr Airways',
    emergencyContact: 'Emergency Contact',
    allergies: 'None'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const isReady = await service.testCredentialServer();
      setServerStatus(isReady ? 'ready' : 'offline');
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.issuerAid || !formData.holderAid) {
      alert('Please provide both Issuer AID and Holder AID');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const credential = await service.createCredentialFromForm({
        issuerAid: formData.issuerAid,
        holderAid: formData.holderAid,
        travelPreferences: {
          employeeId: formData.employeeId,
          seatPreference: formData.seatPreference,
          mealPreference: formData.mealPreference,
          airlines: formData.airlines,
          emergencyContact: formData.emergencyContact,
          allergies: formData.allergies
        }
      });

      setResult({
        success: true,
        data: credential
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🎫 Create Real ACDC Travel Credential</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Server Status: </strong>
        <span style={{ 
          color: serverStatus === 'ready' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {serverStatus === 'ready' ? '✅ Ready' : '❌ Offline'}
        </span>
        <button 
          onClick={checkServerStatus}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Refresh
        </button>
      </div>

      {serverStatus === 'ready' ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Issuer AID (who creates the credential):</strong>
              <input
                type="text"
                name="issuerAid"
                value={formData.issuerAid}
                onChange={handleInputChange}
                placeholder="Enter your issuer AID"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Holder AID (who receives the credential):</strong>
              <input
                type="text"
                name="holderAid"
                value={formData.holderAid}
                onChange={handleInputChange}
                placeholder="Enter holder AID"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                required
              />
            </label>
          </div>

          <h3>Travel Preferences</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <label>
              Employee ID:
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>

            <label>
              Seat Preference:
              <select
                name="seatPreference"
                value={formData.seatPreference}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="window">Window</option>
                <option value="aisle">Aisle</option>
                <option value="middle">Middle</option>
              </select>
            </label>

            <label>
              Meal Preference:
              <select
                name="mealPreference"
                value={formData.mealPreference}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="kosher">Kosher</option>
                <option value="halal">Halal</option>
                <option value="regular">Regular</option>
              </select>
            </label>

            <label>
              Airlines:
              <input
                type="text"
                name="airlines"
                value={formData.airlines}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>

            <label>
              Emergency Contact:
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>

            <label>
              Allergies:
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 Creating Credential...' : '🎫 Create Real ACDC Credential'}
          </button>
        </form>
      ) : (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>❌ Credential Server Offline</h3>
          <p>Make sure the credential server is running:</p>
          <pre style={{ backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
            docker-compose -f docker-compose.travlr-keria.yaml --profile credential-server up -d
          </pre>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {result.success ? (
            <div>
              <h3>✅ Credential Created Successfully!</h3>
              <p><strong>Credential ID:</strong> {result.data.credentialId}</p>
              <p><strong>Schema:</strong> {result.data.schemaId}</p>
              <p><strong>Issuer:</strong> {result.data.issuer}</p>
              <p><strong>Holder:</strong> {result.data.holder}</p>
              <p style={{ color: 'green', fontWeight: 'bold' }}>
                🎯 Real ACDC credential created and stored in KERIA database!
              </p>
            </div>
          ) : (
            <div>
              <h3>❌ Credential Creation Failed</h3>
              <p><strong>Error:</strong> {result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RealACDCCreator;