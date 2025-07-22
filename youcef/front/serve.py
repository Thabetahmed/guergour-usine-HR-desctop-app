"""
Simple HTTP Server for GPLAST Frontend
Serves the frontend files on http://localhost:8080
"""
import http.server
import socketserver
import os
import webbrowser
import threading
import time

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pin')
        super().end_headers()

def start_frontend_server():
    PORT = 8080
    
    # Change to frontend directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = CustomHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🌐 Frontend server starting on http://localhost:{PORT}")
        print(f"📁 Serving files from: {os.getcwd()}")
        print("📋 Available pages:")
        print(f"   - http://localhost:{PORT}/launcher.html (System Launcher)")
        print(f"   - http://localhost:{PORT}/khadama.html (Workers Management)")
        print(f"   - http://localhost:{PORT}/groups.html (Groups Management)")
        print(f"   - http://localhost:{PORT}/index.html (Overview)")
        print("\n✅ Frontend server ready!")
        print("   Press Ctrl+C to stop the server")
        
        # Auto-open browser
        def open_browser():
            time.sleep(1)
            webbrowser.open(f'http://localhost:{PORT}/launcher.html')
        
        threading.Thread(target=open_browser, daemon=True).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Frontend server stopped")

if __name__ == "__main__":
    start_frontend_server()
