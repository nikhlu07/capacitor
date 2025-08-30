#!/usr/bin/env python3
"""
Simple HTTP Server to Serve Real ACDC Credentials via OOBI
"""

import http.server
import socketserver
import json
import os
import sys
import base64

class CredentialHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests for credentials and schemas"""
        
        print(f"Received request: {self.path}")
        
        # Handle credential OOBI requests
        if self.path.startswith('/oobi/'):
            parts = self.path.split('/')
            if len(parts) >= 3:
                credential_said = parts[2]
                
                # Check if this is our real credential
                if credential_said == "EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE":
                    self.serve_credential()
                    return
                # Check if this is our schema
                elif credential_said == "EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr":
                    self.serve_schema()
                    return
                # Serve credential for any request (for testing)
                else:
                    self.serve_credential()
                    return
            else:
                self.send_error(404, f"Invalid OOBI path")
                return
        
        # Handle root endpoint
        elif self.path == '/':
            self.serve_welcome()
            return
            
        # Handle health check
        elif self.path == '/health':
            self.serve_health()
            return
            
        else:
            self.send_error(404, "Endpoint not found")
            return
    
    def serve_credential(self):
        """Serve the real ACDC credential"""
        try:
            # Read the credential data we saved earlier
            if os.path.exists('real_acdc_credential.json'):
                with open('real_acdc_credential.json', 'r') as f:
                    credential_data = f.read()
                
                # The file contains: bytearray(b'{...}')
                # We need to extract the actual JSON
                # Remove "bytearray(b'" and "')"
                json_str = credential_data.replace("bytearray(b'", "").replace("')", "")
                # Fix escaped quotes
                json_str = json_str.replace('\\"', '"')
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/acdc+json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json_str.encode('utf-8'))
                print("✅ Served real ACDC credential")
            else:
                self.send_error(500, "Credential data file not found")
        except Exception as e:
            print(f"Error serving credential: {e}")
            self.send_error(500, f"Error serving credential: {str(e)}")
    
    def serve_schema(self):
        """Serve the schema"""
        try:
            schema_data = {
                "$id": "EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr",
                "$schema": "http://json-schema.org/draft-07/schema#",
                "type": "object",
                "title": "Travel Preferences Credential",
                "description": "Employee travel preferences and requirements",
                "properties": {
                    "d": {"type": "string"},
                    "i": {"type": "string"}, 
                    "dt": {"type": "string"},
                    "employeeId": {"type": "string"},
                    "seatPreference": {"type": "string"},
                    "mealPreference": {"type": "string"},
                    "airlines": {"type": "string"},
                    "emergencyContact": {"type": "string"},
                    "allergies": {"type": "string"}
                },
                "required": ["d", "i", "dt", "employeeId"],
                "additionalProperties": False
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/schema+json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(schema_data, indent=2).encode('utf-8'))
            print("✅ Served schema")
        except Exception as e:
            print(f"Error serving schema: {e}")
            self.send_error(500, f"Error serving schema: {str(e)}")
    
    def serve_welcome(self):
        """Serve welcome page"""
        welcome_html = """
<!DOCTYPE html>
<html>
<head>
    <title>Travlr-ID Credential Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1E40AF; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .endpoint { background: #f0f8ff; padding: 15px; margin: 15px 0; border-left: 4px solid #1E40AF; border-radius: 5px; }
        .success { color: #059669; font-weight: bold; }
        .info { color: #0ea5e9; }
        .warning { color: #f59e0b; }
        code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; }
        a { color: #1E40AF; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Travlr-ID Credential Server</h1>
            <p>Real ACDC Credentials & Schemas via OOBI</p>
        </div>
        
        <h2>Available Endpoints:</h2>
        
        <div class="endpoint">
            <h3>🎯 Real ACDC Credential</h3>
            <p><strong>OOBI:</strong> <a href="/oobi/EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE">/oobi/EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE</a></p>
            <p><strong>SAID:</strong> <span class="info">EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE</span></p>
            <p class="success">✅ Ready for use in your frontend!</p>
        </div>
        
        <div class="endpoint">
            <h3>📋 Travel Preferences Schema</h3>
            <p><strong>OOBI:</strong> <a href="/oobi/EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr">/oobi/EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr</a></p>
            <p><strong>SAID:</strong> <span class="info">EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr</span></p>
            <p class="success">✅ Ready for credential issuance!</p>
        </div>
        
        <h2>How to Use:</h2>
        <ol>
            <li>Your frontend can resolve these via KERIA using the OOBI endpoints above</li>
            <li>KERIA will fetch the schema when issuing credentials</li>
            <li>Your credential issuance should now work with the exact schema SAID</li>
        </ol>
        
        <h2>Integration:</h2>
        <p>Your frontend can now issue credentials using:</p>
        <div class="endpoint">
            <p><strong>Schema SAID:</strong> <code>EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr</code></p>
            <p><strong>Credential SAID:</strong> <code>EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE</code></p>
        </div>
        
        <h2>Status:</h2>
        <p class="success">✅ Server running and ready!</p>
        <p class="info">✅ Real ACDC credential available for resolution</p>
        <p class="info">✅ Schema available for credential issuance</p>
        <p class="warning">⚠️ This is a development server - use only for testing!</p>
    </div>
</body>
</html>
        """
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(welcome_html.encode('utf-8'))
    
    def serve_health(self):
        """Serve health check"""
        health_data = {
            "status": "ok",
            "service": "Travlr-ID Credential Server",
            "version": "1.0.0",
            "credentials": 1,
            "schemas": 1,
            "timestamp": "2025-08-28T12:00:00.000000+00:00"
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(health_data, indent=2).encode('utf-8'))

def start_server(port=3001):
    """Start the credential server"""
    try:
        with socketserver.TCPServer(("", port), CredentialHandler) as httpd:
            print("Travlr-ID Credential Server Started!")
            print("=" * 50)
            print(f"   Listening on port: {port}")
            print(f"   Serving real ACDC credential:")
            print(f"     SAID: EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE")
            print(f"     OOBI: http://localhost:{port}/oobi/EN9eRW0jxOuFdbHdQSm-OhuAbiA3qi_HfGNx-bvMc6HE")
            print(f"   Serving schema:")
            print(f"     SAID: EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr")
            print(f"     OOBI: http://localhost:{port}/oobi/EJMeEfotC4jxZKhdVxeusz1-pfyBkbHrodxVn_cclTJr")
            print(f"\n   Visit: http://localhost:{port}")
            print(f"\n   Press Ctrl+C to stop server")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server error: {e}")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    start_server(port)