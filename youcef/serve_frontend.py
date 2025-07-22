"""
Simple HTTP Server for Frontend
Serves the frontend on http://localhost:8080
"""
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 8080
FRONTEND_DIR = "front"

def serve_frontend():
    # Change to frontend directory
    frontend_path = Path(__file__).parent / FRONTEND_DIR
    if not frontend_path.exists():
        print(f"❌ Frontend directory '{FRONTEND_DIR}' not found!")
        return
    
    os.chdir(frontend_path)
    
    # Create HTTP server
    Handler = http.server.SimpleHTTPRequestHandler
    Handler.extensions_map.update({
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
    })
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🌐 Frontend server starting...")
        print(f"📂 Serving files from: {frontend_path}")
        print(f"🚀 Server running at: http://localhost:{PORT}")
        print(f"📋 Available pages:")
        print(f"   - Overview: http://localhost:{PORT}/index.html")
        print(f"   - Workers:  http://localhost:{PORT}/khadama.html")
        print(f"   - Groups:   http://localhost:{PORT}/groups.html")
        print("")
        print("💡 Make sure the Flask backend is running on http://127.0.0.1:5000")
        print("   To start backend: python back/app.py")
        print("")
        print("🔄 Press Ctrl+C to stop the server")
        
        # Auto-open browser
        try:
            webbrowser.open(f'http://localhost:{PORT}/khadama.html')
            print("🌐 Opening browser automatically...")
        except:
            print("📝 Please open your browser manually")
        
        # Start serving
        httpd.serve_forever()

if __name__ == "__main__":
    try:
        serve_frontend()
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")
