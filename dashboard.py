import http.server
import socketserver
import subprocess
import os

PORT = 8082

HTML = """
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NodeMind - لوحة التحكم</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: white; text-align: center; padding: 50px; }}
        .card {{ background-color: #1e293b; padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: inline-block; min-width: 350px; border: 1px solid #334155; }}
        h1 {{ color: #38bdf8; margin-bottom: 10px; font-size: 28px; }}
        .subtitle {{ color: #94a3b8; margin-bottom: 30px; font-size: 14px; }}
        .status {{ margin-bottom: 30px; padding: 15px; border-radius: 8px; background: #334155; font-size: 18px; }}
        .btn {{ display: block; width: 100%; padding: 15px; margin: 12px 0; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; text-decoration: none; box-sizing: border-box; }}
        .btn-start {{ background-color: #22c55e; color: white; }}
        .btn-start:hover {{ background-color: #16a34a; transform: translateY(-2px); }}
        .btn-stop {{ background-color: #ef4444; color: white; }}
        .btn-stop:hover {{ background-color: #dc2626; transform: translateY(-2px); }}
        .btn-view {{ background-color: #38bdf8; color: white; }}
        .btn-view:hover {{ background-color: #0ea5e9; transform: translateY(-2px); }}
        .footer {{ margin-top: 40px; color: #64748b; font-size: 13px; line-height: 1.6; }}
        .timer {{ color: #fbbf24; font-size: 14px; margin-top: 10px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>🚀 NodeMind VTON</h1>
        <div class="subtitle">نظام التحكم في موارد السيرفر</div>
        
        <div class="status">
            الحالة: <strong>{status}</strong>
        </div>

        {controls}
        
        <div class="footer">
            💎 المتصفح يعمل الآن في الخلفية 24/7 ويفتح صفحة AI Studio.<br>
            ⚠️ البث المرئي يستهلك موارد السيرفر، يرجى إغلاقه عند الانتهاء لتوفير التكاليف.
        </div>
    </div>

    <script>
        if ("{is_running}" === "True") {{
            // إيقاف تلقائي بعد 20 دقيقة
            setTimeout(() => {{
                fetch('/stop').then(() => window.location.reload());
            }}, 20 * 60 * 1000);
        }}
    </script>
</body>
</html>
"""

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/start':
            subprocess.run(["supervisorctl", "start", "x11vnc", "novnc", "fluxbox"], capture_output=True)
            self.send_response(303)
            self.send_header('Location', '/')
            self.end_headers()
        elif self.path == '/stop':
            subprocess.run(["supervisorctl", "stop", "x11vnc", "novnc", "fluxbox"], capture_output=True)
            self.send_response(303)
            self.send_header('Location', '/')
            self.end_headers()
        elif self.path == '/':
            check = subprocess.run(["supervisorctl", "status", "x11vnc"], capture_output=True, text=True)
            is_running = "RUNNING" in check.stdout
            
            status_text = "🟢 البث المباشر يعمل" if is_running else "🔴 البث متوقف (وضع التوفير)"
            
            if is_running:
                controls = f"""
                <a href="/vnc/" class="btn btn-view" target="_blank">📺 الدخول إلى المتصفح</a>
                <a href="/stop" class="btn btn-stop">⏹️ إيقاف البث فوراً</a>
                <div class="timer">⏱️ سيتم الإيقاف التلقائي خلال 20 دقيقة</div>
                """
            else:
                controls = '<a href="/start" class="btn btn-start">▶️ تشغيل البث المرئي</a>'

            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML.format(status=status_text, controls=controls, is_running=is_running).encode('utf-8'))
        else:
            self.send_error(404)

with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
    print("Dashboard serving at port", PORT)
    httpd.serve_forever()
