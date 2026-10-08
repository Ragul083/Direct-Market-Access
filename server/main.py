#!/usr/bin/env python3
"""
Farmlink DMA Platform - Python Backend Service
Provides RESTful APIs for User Management, Crop DMA Marketplace,
AI Price Predictions, Chat/Negotiations, and Notifications.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import socketserver

DB_PATH = (
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "farmlink.db")
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "farmlink.db"))
    else os.path.join(os.path.dirname(os.path.abspath(__file__)), "framlink.db")
)

# ---------------------------------------------------------
# Database Initialization & Helpers
# ---------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        location TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        aadharNumber TEXT,
        created_at INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crops (
        id TEXT PRIMARY KEY,
        farmerId TEXT NOT NULL,
        farmerName TEXT NOT NULL,
        name TEXT NOT NULL,
        variety TEXT NOT NULL,
        quantity REAL NOT NULL,
        expectedPrice REAL NOT NULL,
        imageUrl TEXT,
        location TEXT NOT NULL,
        uploadDate TEXT NOT NULL,
        created_at INTEGER,
        FOREIGN KEY (farmerId) REFERENCES users(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participants TEXT NOT NULL, -- JSON string mapping userId -> userName
        lastMessage TEXT,
        lastMessageTimestamp INTEGER,
        unreadCount INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        audioUrl TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (conversationId) REFERENCES conversations(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        read INTEGER DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id)
    )
    """)

    conn.commit()

    # Seed initial users if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        default_users = [
            ("user-1", "Rajesh Kumar", "rajesh.k@gmail.com", "password123", "FARMER", "Nashik, Maharashtra", 1, "123456789012", int(time.time() * 1000)),
            ("user-2", "Priya Singh", "priya.s@gmail.com", "password123", "BUYER", "Delhi Market, Delhi", 1, "987654321098", int(time.time() * 1000)),
            ("user-3", "Admin Manager", "admin@gmail.com", "password123", "ADMIN", "Mumbai HQ", 1, "", int(time.time() * 1000)),
            ("user-4", "Anjali Desai", "anjali.d@gmail.com", "password123", "FARMER", "Mysuru, Karnataka", 0, "456123789012", int(time.time() * 1000)),
        ]
        cursor.executemany("""
            INSERT INTO users (id, name, email, password, role, location, verified, aadharNumber, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_users)

        default_crops = [
            ("crop-1", "user-1", "Rajesh Kumar", "Onions", "Nashik Red", 1200, 32.5, "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=60", "Nashik, Maharashtra", datetime.now().strftime("%Y-%m-%d"), int(time.time() * 1000)),
            ("crop-2", "user-1", "Rajesh Kumar", "Tomatoes", "Hybrid Vaishali", 850, 24.0, "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60", "Nashik, Maharashtra", datetime.now().strftime("%Y-%m-%d"), int(time.time() * 1000)),
        ]
        cursor.executemany("""
            INSERT INTO crops (id, farmerId, farmerName, name, variety, quantity, expectedPrice, imageUrl, location, uploadDate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_crops)

        default_notifications = [
            ("notif-1", "user-1", "success", "Your account has been successfully verified!", int(time.time() * 1000) - 300000, 0),
            ("notif-2", "user-1", "info", "Priya Singh is interested in your Onions.", int(time.time() * 1000) - 3600000, 1),
            ("notif-3", "user-4", "warning", "Your farmer verification is still pending. Please complete your profile.", int(time.time() * 1000) - 86400000, 0),
            ("notif-4", "user-3", "info", 'New farmer "Anjali Desai" requires verification.', int(time.time() * 1000) - 600000, 0),
        ]
        cursor.executemany("""
            INSERT INTO notifications (id, userId, type, message, timestamp, read)
            VALUES (?, ?, ?, ?, ?, ?)
        """, default_notifications)

        conn.commit()

    conn.close()

# ---------------------------------------------------------
# Agricultural Intelligence / Market Analysis Engine
# ---------------------------------------------------------

# Import Econometric and XAI Algorithms
try:
    from server.algorithms.agricultural_economics import (
        run_econometric_pricing_algorithm,
        generate_commodity_trend_data,
        COMMODITY_BENCHMARKS,
    )
    from server.algorithms.xai_explainer import (
        generate_complete_prediction,
    )
except ImportError:
    # If running directly inside the server folder
    from algorithms.agricultural_economics import (
        run_econometric_pricing_algorithm,
        generate_commodity_trend_data,
        COMMODITY_BENCHMARKS,
    )
    from algorithms.xai_explainer import (
        generate_complete_prediction,
    )

def get_historical_trends(crop_name, location='Tamil Nadu'):
    """
    Returns monthly price trends generated by econometric seasonality decomposition.
    """
    try:
        return generate_commodity_trend_data(crop_name, location)
    except Exception as e:
        sys.stderr.write(f"Trend data fallback triggered: {e}\n")
        months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
        base = 28.0
        return [{'month': m, 'price': base + (i * 1.5)} for i, m in enumerate(months)]

def compute_ai_prediction(crop_name, variety, quantity, location, language='en'):
    """
    Executes the Python Econometric & Explainable AI Pricing Algorithm pipeline.
    """
    return generate_complete_prediction(
        crop_name=crop_name,
        variety=variety,
        quantity=float(quantity),
        location=location,
        language=language
    )

# ---------------------------------------------------------
# HTTP Request Handler
# ---------------------------------------------------------

class FarmlinkAPIHandler(BaseHTTPRequestHandler):

    def _set_cors(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors(204)

    def _read_json(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(body)
        except Exception:
            return {}

    def _send_json(self, data, status=200):
        self._set_cors(status)
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _send_error(self, message, status=400):
        self._send_json({'error': message, 'success': False}, status)

    # ---------------- GET Routes ----------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Health Check
        if path == '/api/health':
            self._send_json({
                'status': 'healthy',
                'backend': f'Python {sys.version.split()[0]}',
                'service': 'Farmlink Direct Market Access Backend',
                'timestamp': int(time.time() * 1000)
            })
            return

        # Users
        if path == '/api/users':
            conn = get_db()
            users = conn.execute("SELECT id, name, email, role, location, verified, aadharNumber FROM users").fetchall()
            conn.close()
            user_list = [
                {
                    'id': u['id'],
                    'name': u['name'],
                    'email': u['email'],
                    'role': u['role'],
                    'location': u['location'],
                    'verified': bool(u['verified']),
                    'aadharNumber': u['aadharNumber'] or ''
                }
                for u in users
            ]
            self._send_json(user_list)
            return

        # Crops
        if path == '/api/crops':
            conn = get_db()
            sql = "SELECT * FROM crops ORDER BY created_at DESC"
            crops = conn.execute(sql).fetchall()
            conn.close()
            crop_list = [
                {
                    'id': c['id'],
                    'farmerId': c['farmerId'],
                    'farmerName': c['farmerName'],
                    'name': c['name'],
                    'variety': c['variety'],
                    'quantity': c['quantity'],
                    'expectedPrice': c['expectedPrice'],
                    'imageUrl': c['imageUrl'] or '',
                    'location': c['location'],
                    'uploadDate': c['uploadDate']
                }
                for c in crops
            ]
            self._send_json(crop_list)
            return

        # Crop Historical Prices
        if path == '/api/crops/history':
            crop_name = query.get('crop', ['Onions'])[0]
            location = query.get('location', ['Tamil Nadu'])[0]
            trends = get_historical_trends(crop_name, location)
            self._send_json(trends)
            return

        # Conversations
        if path == '/api/conversations':
            user_id = query.get('userId', [''])[0]
            conn = get_db()
            convs = conn.execute("SELECT * FROM conversations ORDER BY lastMessageTimestamp DESC").fetchall()
            conn.close()
            res = []
            for c in convs:
                participants = json.loads(c['participants'])
                if not user_id or user_id in participants:
                    res.append({
                        'id': c['id'],
                        'participants': participants,
                        'lastMessage': c['lastMessage'] or '',
                        'lastMessageTimestamp': c['lastMessageTimestamp'] or 0,
                        'unreadCount': c['unreadCount'] or 0
                    })
            self._send_json(res)
            return

        # Messages for Conversation
        match_messages = re.match(r'^/api/conversations/([^/]+)/messages$', path)
        if match_messages:
            conv_id = match_messages.group(1)
            conn = get_db()
            msgs = conn.execute("SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC", (conv_id,)).fetchall()
            conn.close()
            msg_list = [
                {
                    'id': m['id'],
                    'conversationId': m['conversationId'],
                    'senderId': m['senderId'],
                    'text': m['text'],
                    'type': m['type'] or 'text',
                    'audioUrl': m['audioUrl'] or '',
                    'timestamp': m['timestamp']
                }
                for m in msgs
            ]
            self._send_json(msg_list)
            return

        # Notifications
        if path == '/api/notifications':
            user_id = query.get('userId', [''])[0]
            conn = get_db()
            if user_id:
                notifs = conn.execute("SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC", (user_id,)).fetchall()
            else:
                notifs = conn.execute("SELECT * FROM notifications ORDER BY timestamp DESC").fetchall()
            conn.close()
            notif_list = [
                {
                    'id': n['id'],
                    'userId': n['userId'],
                    'type': n['type'],
                    'message': n['message'],
                    'timestamp': n['timestamp'],
                    'read': bool(n['read'])
                }
                for n in notifs
            ]
            self._send_json(notif_list)
            return

        # Admin Overview Stats
        if path == '/api/stats/overview':
            conn = get_db()
            users = conn.execute("SELECT role, verified FROM users").fetchall()
            crops = conn.execute("SELECT quantity, expectedPrice FROM crops").fetchall()
            conn.close()

            total_users = len(users)
            farmers = sum(1 for u in users if u['role'] == 'FARMER')
            buyers = sum(1 for u in users if u['role'] == 'BUYER')
            pending = sum(1 for u in users if u['role'] in ('FARMER', 'BUYER') and not u['verified'])
            total_listings = len(crops)
            total_quantity = sum(c['quantity'] for c in crops)

            self._send_json({
                'totalUsers': total_users,
                'farmers': farmers,
                'buyers': buyers,
                'pendingVerifications': pending,
                'totalListings': total_listings,
                'totalVolumeKg': total_quantity
            })
            return

        self._send_error('Not Found', 404)

    # ---------------- POST Routes ----------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_json()

        # Auth Login
        if path == '/api/auth/login':
            email = body.get('email', '').strip()
            password = body.get('password', '')
            conn = get_db()
            user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            conn.close()
            if not user or user['password'] != password:
                self._send_error('Invalid email or password.', 401)
                return

            self._send_json({
                'success': True,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role'],
                    'location': user['location'],
                    'verified': bool(user['verified']),
                    'aadharNumber': user['aadharNumber'] or ''
                }
            })
            return

        # Auth Register
        if path == '/api/auth/register':
            name = body.get('name', '').strip()
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            role = body.get('role', 'FARMER')
            location = body.get('location', '').strip()
            aadhar = body.get('aadharNumber', '').strip()

            if not name or not email or not password:
                self._send_error('Name, email, and password are required.')
                return

            if not email.endswith('@gmail.com'):
                self._send_error('Please use a valid @gmail.com address.')
                return

            if not re.match(r'^\d{12}$', aadhar):
                self._send_error('Please enter a valid 12-digit Aadhar number.')
                return

            conn = get_db()
            existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            if existing:
                conn.close()
                self._send_error('User with this email already exists.')
                return

            user_id = f"user-{int(time.time() * 1000)}"
            verified = 0
            created_at = int(time.time() * 1000)

            conn.execute("""
                INSERT INTO users (id, name, email, password, role, location, verified, aadharNumber, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, name, email, password, role, location, verified, aadhar, created_at))

            # Trigger notification for admins
            admin_users = conn.execute("SELECT id FROM users WHERE role = 'ADMIN'").fetchall()
            for admin in admin_users:
                notif_id = f"notif-{int(time.time() * 1000)}-{admin['id']}"
                conn.execute("""
                    INSERT INTO notifications (id, userId, type, message, timestamp, read)
                    VALUES (?, ?, ?, ?, ?, 0)
                """, (notif_id, admin['id'], 'info', f'New {role.lower()} "{name}" registered and requires verification.', created_at))

            conn.commit()
            conn.close()

            self._send_json({
                'success': True,
                'message': 'Registration successful! Please login.',
                'user': {
                    'id': user_id,
                    'name': name,
                    'email': email,
                    'role': role,
                    'location': location,
                    'verified': False,
                    'aadharNumber': aadhar
                }
            })
            return

        # Add Crop
        if path == '/api/crops':
            farmer_id = body.get('farmerId', '')
            farmer_name = body.get('farmerName', '')
            name = body.get('name', '').strip()
            variety = body.get('variety', '').strip()
            quantity = float(body.get('quantity', 0))
            expected_price = float(body.get('expectedPrice', 0))
            image_url = body.get('imageUrl', '')
            location = body.get('location', '')
            upload_date = body.get('uploadDate', datetime.now().strftime('%Y-%m-%d'))

            if not name or quantity <= 0 or expected_price <= 0:
                self._send_error('Invalid crop listing details.')
                return

            crop_id = f"crop-{int(time.time() * 1000)}"
            now = int(time.time() * 1000)

            conn = get_db()
            conn.execute("""
                INSERT INTO crops (id, farmerId, farmerName, name, variety, quantity, expectedPrice, imageUrl, location, uploadDate, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (crop_id, farmer_id, farmer_name, name, variety, quantity, expected_price, image_url, location, upload_date, now))
            conn.commit()
            conn.close()

            new_crop = {
                'id': crop_id,
                'farmerId': farmer_id,
                'farmerName': farmer_name,
                'name': name,
                'variety': variety,
                'quantity': quantity,
                'expectedPrice': expected_price,
                'imageUrl': image_url,
                'location': location,
                'uploadDate': upload_date
            }
            self._send_json({'success': True, 'crop': new_crop})
            return

        # AI Prediction
        if path == '/api/ai/predict':
            crop_name = body.get('cropName', 'Onions')
            variety = body.get('variety', 'Standard')
            quantity = float(body.get('quantity', 500))
            location = body.get('location', 'Tamil Nadu')
            language = body.get('language', 'en')

            prediction = compute_ai_prediction(crop_name, variety, quantity, location, language)
            self._send_json(prediction)
            return

        # Send Message
        match_send_msg = re.match(r'^/api/conversations/([^/]+)/messages$', path)
        if match_send_msg:
            conv_id = match_send_msg.group(1)
            sender_id = body.get('senderId', '')
            text = body.get('text', '')
            msg_type = body.get('type', 'text')
            audio_url = body.get('audioUrl', '')

            msg_id = f"msg-{int(time.time() * 1000)}"
            now = int(time.time() * 1000)

            conn = get_db()
            conn.execute("""
                INSERT INTO messages (id, conversationId, senderId, text, type, audioUrl, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (msg_id, conv_id, sender_id, text, msg_type, audio_url, now))

            conn.execute("""
                UPDATE conversations
                SET lastMessage = ?, lastMessageTimestamp = ?
                WHERE id = ?
            """, (text, now, conv_id))
            conn.commit()
            conn.close()

            new_msg = {
                'id': msg_id,
                'conversationId': conv_id,
                'senderId': sender_id,
                'text': text,
                'type': msg_type,
                'audioUrl': audio_url,
                'timestamp': now
            }
            self._send_json(new_msg)
            return

        # Create/Initiate Conversation
        if path == '/api/conversations':
            user_a = body.get('userA') # {id, name}
            user_b = body.get('userB') # {id, name}
            initial_message = body.get('initialMessage', '')

            if not user_a or not user_b:
                self._send_error('Both users required.')
                return

            conv_id = f"conv-{user_a['id']}-{user_b['id']}"
            participants = {user_a['id']: user_a['name'], user_b['id']: user_b['name']}
            now = int(time.time() * 1000)

            conn = get_db()
            existing = conn.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,)).fetchone()
            if not existing:
                conn.execute("""
                    INSERT INTO conversations (id, participants, lastMessage, lastMessageTimestamp, unreadCount)
                    VALUES (?, ?, ?, ?, 0)
                """, (conv_id, json.dumps(participants), initial_message, now))
                if initial_message:
                    msg_id = f"msg-{now}"
                    conn.execute("""
                        INSERT INTO messages (id, conversationId, senderId, text, type, audioUrl, timestamp)
                        VALUES (?, ?, ?, ?, 'text', '', ?)
                    """, (msg_id, conv_id, user_a['id'], initial_message, now))
                conn.commit()
            conn.close()

            self._send_json({'id': conv_id, 'participants': participants})
            return

        # Mark all notifications read
        if path == '/api/notifications/read-all':
            user_id = body.get('userId', '')
            conn = get_db()
            conn.execute("UPDATE notifications SET read = 1 WHERE userId = ?", (user_id,))
            conn.commit()
            conn.close()
            self._send_json({'success': True})
            return

        # Add Notification (e.g. buyer interest)
        if path == '/api/notifications':
            user_id = body.get('userId', '')
            notif_type = body.get('type', 'info')
            message = body.get('message', '')
            notif_id = f"notif-{int(time.time() * 1000)}"
            now = int(time.time() * 1000)

            conn = get_db()
            conn.execute("""
                INSERT INTO notifications (id, userId, type, message, timestamp, read)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (notif_id, user_id, notif_type, message, now))
            conn.commit()
            conn.close()

            self._send_json({'success': True, 'id': notif_id})
            return

        self._send_error('Not Found', 404)

    # ---------------- PATCH Routes ----------------
    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_json()

        # Update User (Profile or Verification)
        match_user = re.match(r'^/api/users/([^/]+)$', path)
        if match_user:
            user_id = match_user.group(1)
            conn = get_db()
            user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user:
                conn.close()
                self._send_error('User not found', 404)
                return

            new_name = body.get('name', user['name'])
            new_location = body.get('location', user['location'])
            new_verified = int(body.get('verified', user['verified'])) if 'verified' in body else user['verified']

            conn.execute("""
                UPDATE users
                SET name = ?, location = ?, verified = ?
                WHERE id = ?
            """, (new_name, new_location, new_verified, user_id))

            # If user was verified, notify them
            if 'verified' in body and bool(new_verified) and not bool(user['verified']):
                notif_id = f"notif-{int(time.time() * 1000)}"
                conn.execute("""
                    INSERT INTO notifications (id, userId, type, message, timestamp, read)
                    VALUES (?, ?, 'success', 'Your account has been officially verified by Admin!', ?, 0)
                """, (notif_id, user_id, int(time.time() * 1000)))

            conn.commit()
            updated_user = conn.execute("SELECT id, name, email, role, location, verified, aadharNumber FROM users WHERE id = ?", (user_id,)).fetchone()
            conn.close()

            self._send_json({
                'success': True,
                'user': {
                    'id': updated_user['id'],
                    'name': updated_user['name'],
                    'email': updated_user['email'],
                    'role': updated_user['role'],
                    'location': updated_user['location'],
                    'verified': bool(updated_user['verified']),
                    'aadharNumber': updated_user['aadharNumber'] or ''
                }
            })
            return

        # Mark single notification as read
        match_notif = re.match(r'^/api/notifications/([^/]+)/read$', path)
        if match_notif:
            notif_id = match_notif.group(1)
            conn = get_db()
            conn.execute("UPDATE notifications SET read = 1 WHERE id = ?", (notif_id,))
            conn.commit()
            conn.close()
            self._send_json({'success': True})
            return

        self._send_error('Not Found', 404)

    # ---------------- DELETE Routes ----------------
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Delete User
        match_user = re.match(r'^/api/users/([^/]+)$', path)
        if match_user:
            user_id = match_user.group(1)
            conn = get_db()
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.execute("DELETE FROM crops WHERE farmerId = ?", (user_id,))
            conn.execute("DELETE FROM notifications WHERE userId = ?", (user_id,))
            conn.commit()
            conn.close()
            self._send_json({'success': True, 'deletedId': user_id})
            return

        # Delete Crop
        match_crop = re.match(r'^/api/crops/([^/]+)$', path)
        if match_crop:
            crop_id = match_crop.group(1)
            conn = get_db()
            conn.execute("DELETE FROM crops WHERE id = ?", (crop_id,))
            conn.commit()
            conn.close()
            self._send_json({'success': True, 'deletedId': crop_id})
            return

        self._send_error('Not Found', 404)

# ---------------------------------------------------------
# Server Runner
# ---------------------------------------------------------

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True

def run(port=5001, host='127.0.0.1'):
    init_db()
    server_address = (host, port)
    httpd = ThreadedHTTPServer(server_address, FarmlinkAPIHandler)
    print(f"[*] Farmlink Python Backend running on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down Farmlink Python Backend...")
        httpd.server_close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Farmlink Python Backend")
    parser.add_argument('--port', type=int, default=5001, help="Port to listen on (default: 5001)")
    parser.add_argument('--host', type=str, default='127.0.0.1', help="Host interface (default: 127.0.0.1)")
    args = parser.parse_args()
    run(port=args.port, host=args.host)
