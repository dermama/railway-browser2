import os
import subprocess
from flask import Flask, render_template_string, jsonify, request

app = Flask(__name__)

# CSS & HTML Template for a Premium Look
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NodeMind | مركز التحكم</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0f172a;
            --card: #1e293b;
            --primary: #38bdf8;
            --success: #22c55e;
            --danger: #ef4444;
            --text: #f8fafc;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            background: var(--card);
            padding: 2rem;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            width: 400px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        h1 { font-weight: 600; margin-bottom: 0.5rem; color: var(--primary); }
        p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem; }
        .status-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 99px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 2rem;
            transition: all 0.3s;
        }
        .status-online { background: rgba(34, 197, 94, 0.2); color: var(--success); }
        .status-offline { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        
        .btn {
            display: block;
            width: 100%;
            padding: 1rem;
            margin-bottom: 1rem;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }
        .btn-start { background: var(--primary); color: #000; }
        .btn-start:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(56, 189, 248, 0.4); }
        .btn-stop { background: rgba(255, 255, 255, 0.05); color: var(--text); border: 1px solid rgba(255, 255, 255, 0.1); }
        .btn-stop:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: var(--danger); }
        
        .vnc-link {
            margin-top: 1.5rem;
            display: block;
            color: var(--primary);
            text-decoration: none;
            font-size: 0.9rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 1rem;
        }
        .footer { margin-top: 2rem; font-size: 0.7rem; color: #475569; }
    </style>
</head>
<body>
    <div class="container">
        <h1>NodeMind</h1>
        <p>مركز تحكم البث البعيد</p>
        
        <div id="statusBadge" class="status-badge status-offline">جاري فحص الحالة...</div>
        
        <button onclick="control('start')" class="btn btn-start">🚀 تشغيل بث الشاشة</button>
        <button onclick="control('stop')" class="btn btn-stop">⏹️ قطع البث (توفير الموارد)</button>
        
        <div id="vncArea" style="display:none;">
            <a href="/vnc/vnc_lite.html" target="_blank" class="vnc-link">👁️ فتح نافذة البث في صفحة جديدة</a>
        </div>
        
        <div class="footer">NodeMind Browser Protocol v3.5 | Railway Edition</div>
    </div>

    <script>
        function updateStatus() {
            fetch('/status').then(r => r.json()).then(data => {
                const badge = document.getElementById('statusBadge');
                const vncArea = document.getElementById('vncArea');
                if (data.online) {
                    badge.innerText = '● البث يعمل الآن';
                    badge.className = 'status-badge status-online';
                    vncArea.style.display = 'block';
                } else {
                    badge.innerText = '○ البث متوقف حالياً';
                    badge.className = 'status-badge status-offline';
                    vncArea.style.display = 'none';
                }
            });
        }

        function control(action) {
            const btn = event.target;
            btn.style.opacity = '0.5';
            btn.innerText = 'جاري التنفيذ...';
            
            fetch('/control/' + action).then(r => r.json()).then(data => {
                setTimeout(() => {
                    location.reload();
                }, 1000);
            });
        }

        updateStatus();
        setInterval(updateStatus, 5000);
    </script>
</body>
</html>
"""

def is_vnc_running():
    try:
        output = subprocess.check_output(["supervisorctl", "status", "x11vnc"]).decode()
        return "RUNNING" in output
    except:
        return False

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/status')
def status():
    return jsonify({"online": is_vnc_running()})

@app.route('/control/<action>')
def control(action):
    if action == "start":
        subprocess.run(["supervisorctl", "start", "x11vnc", "novnc"])
        return jsonify({"status": "started"})
    elif action == "stop":
        subprocess.run(["supervisorctl", "stop", "x11vnc", "novnc"])
        return jsonify({"status": "stopped"})
    return jsonify({"status": "error"})

if __name__ == '__main__':
    # Get port from environment or default to 8080
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
