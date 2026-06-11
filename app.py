import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
CORS(app)  # 允許跨網域請求

# 資料庫連線配置
# 請根據您的 MySQL 設定修改以下參數
db_config = {
    'host': '127.0.0.1',
    'database': 'columbarium_db',
    'user': 'root',       # 預設通常是 root
    'password': '', # 請輸入您的 MySQL 密碼
    'charset': 'utf8mb4'
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# ==========================================
# 1. 使用者與驗證 (UC-01)
# ==========================================

@app.route('/users', methods=['POST'])
def register():
    data = request.json
    account = data.get('account')
    password = data.get('password')
    name = data.get('name')
    id_card_num = data.get('id_card_num')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    try:
        cursor = conn.cursor()
        query = "INSERT INTO user (account, password_hash, name, id_card_num, role) VALUES (%s, %s, %s, %s, '會員')"
        cursor.execute(query, (account, password, name, id_card_num)) # 實務上應使用 hash
        conn.commit()
        return jsonify({"message": "User registered"}), 201
    except Error as e:
        return jsonify({"message": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    account = data.get('account')
    password = data.get('password')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT user_id, name as user_name, role FROM user WHERE account = %s AND password_hash = %s"
        cursor.execute(query, (account, password))
        user = cursor.fetchone()
        
        if user:
            return jsonify(user), 200
        else:
            return jsonify({"message": "Invalid credentials"}), 401
    finally:
        cursor.close()
        conn.close()

# 更新家屬資料 (UC-09)
@app.route('/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    data = request.json
    name = data.get('name')
    phone = data.get('phone_number')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if name and phone:
            query = "UPDATE user SET name = %s, phone_number = %s WHERE user_id = %s"
            cursor.execute(query, (name, phone, user_id))
        elif name:
            query = "UPDATE user SET name = %s WHERE user_id = %s"
            cursor.execute(query, (name, user_id))
        elif phone:
            query = "UPDATE user SET phone_number = %s WHERE user_id = %s"
            cursor.execute(query, (phone, user_id))
        
        conn.commit()
        return jsonify({"message": "Profile updated"}), 200
    except Error as e:
        return jsonify({"message": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 2. 塔位管理 (UC-02, UC-04, UC-07)
# ==========================================

@app.route('/slots', methods=['GET'])
def get_slots():
    floor = request.args.get('floor')
    budget = request.args.get('budget')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT s.*, d.name as deceased_name 
            FROM slot s 
            LEFT JOIN deceased d ON s.slot_id = d.slot_id 
            WHERE 1=1
        """
        params = []
        if floor:
            query += " AND s.floor = %s"
            params.append(floor)
        if budget:
            query += " AND s.price <= %s"
            params.append(budget)
            
        cursor.execute(query, params)
        slots = cursor.fetchall()
        return jsonify(slots), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/slots/<int:slot_id>', methods=['PATCH'])
def update_slot(slot_id):
    data = request.json
    status = data.get('status')
    owner_id = data.get('owner_user_id')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if owner_id:
            query = "UPDATE slot SET status = %s, owner_user_id = %s WHERE slot_id = %s"
            cursor.execute(query, (status, owner_id, slot_id))
        else:
            query = "UPDATE slot SET status = %s WHERE slot_id = %s"
            cursor.execute(query, (status, slot_id))
        conn.commit()
        return jsonify({"message": "Slot updated"}), 200
    except Error as e:
        return jsonify({"message": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/users/<int:user_id>/slots', methods=['GET'])
def get_user_slots(user_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        # 獲取名下塔位
        query_slots = """
            SELECT s.slot_id, s.floor, s.zone, s.cabinet, d.name as deceased_name 
            FROM slot s 
            LEFT JOIN deceased d ON s.slot_id = d.slot_id 
            WHERE s.owner_user_id = %s
        """
        cursor.execute(query_slots, (user_id,))
        slots = cursor.fetchall()
        
        # 獲取已故親友 (對應留言對象)
        query_deceased = """
            SELECT d.deceased_id, d.name 
            FROM deceased d 
            JOIN slot s ON d.slot_id = s.slot_id 
            WHERE s.owner_user_id = %s
        """
        cursor.execute(query_deceased, (user_id,))
        deceased = cursor.fetchall()
        
        return jsonify({"slots": slots, "deceased": deceased}), 200
    finally:
        cursor.close()
        conn.close()

# 帳單管理 (UC-06)
@app.route('/bills', methods=['GET'])
def get_bills():
    user_id = request.args.get('user_id')
    year = request.args.get('year')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM billing WHERE member_id = %s"
        params = [user_id]
        
        if year:
            query += " AND bill_year = %s"
            params.append(year)
            
        cursor.execute(query, params)
        bills = cursor.fetchall()
        for bill in bills:
            bill['due_date'] = bill['due_date'].strftime('%Y-%m-%d')
        return jsonify(bills), 200
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 3. 公告管理 (UC-10)
# ==========================================

@app.route('/announcements', methods=['GET'])
def get_announcements():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM announcement ORDER BY publish_date DESC"
        cursor.execute(query)
        res = cursor.fetchall()
        # 轉換日期格式以便前端讀取
        for item in res:
            if item['publish_date']:
                item['publish_date'] = item['publish_date'].strftime('%Y-%m-%d')
        return jsonify(res), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/announcements', methods=['POST'])
def create_announcement():
    data = request.json
    title = data.get('title')
    category = data.get('category')
    content = data.get('content')
    admin_id = 1 # 簡化起見，預設為 ID 1 的管理員
    publish_date = datetime.date.today().strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "INSERT INTO announcement (admin_id, title, category, content, publish_date) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(query, (admin_id, title, category, content, publish_date))
        conn.commit()
        return jsonify({"message": "Announcement created"}), 201
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 4. 預約管理 (UC-03, UC-08)
# ==========================================

@app.route('/reservations', methods=['POST'])
def create_reservation():
    data = request.json
    user_id = data.get('user_id')
    slot_id = data.get('slot_id')
    reserve_date = data.get('reserve_date')
    time_slot = data.get('time_slot')
    amount_of_people = data.get('amount_of_people')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # 簡單邏輯：隨機分配一個空的停車位
        cursor.execute("SELECT parking_spot_id FROM parking_spot WHERE status = '空的' LIMIT 1")
        spot = cursor.fetchone()
        spot_id = spot[0] if spot else None
        
        query = """
            INSERT INTO reservation (user_id, slot_id, parking_spot_id, reserve_date, time_slot, amount_of_people, status) 
            VALUES (%s, %s, %s, %s, %s, %s, '已確認')
        """
        cursor.execute(query, (user_id, slot_id, spot_id, reserve_date, time_slot, amount_of_people))
        conn.commit()
        return jsonify({"message": "Reservation created", "parking_spot_id": spot_id}), 201
    except Error as e:
        return jsonify({"message": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/reservations', methods=['GET'])
def get_reservations():
    date_range = request.args.get('date_range')
    status = request.args.get('reservation_status')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT r.*, u.name as user_name 
            FROM reservation r 
            JOIN user u ON r.user_id = u.user_id 
            WHERE 1=1
        """
        params = []
        if date_range:
            start, end = date_range.split(',')
            query += " AND r.reserve_date BETWEEN %s AND %s"
            params.extend([start, end])
        if status:
            query += " AND r.status = %s"
            params.append(status)
            
        cursor.execute(query, params)
        res = cursor.fetchall()
        for item in res:
            item['reserve_date'] = item['reserve_date'].strftime('%Y-%m-%d')
            item['time_slot'] = str(item['time_slot'])
        return jsonify(res), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/reservations/<int:reserve_id>', methods=['DELETE'])
def delete_reservation(reserve_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reservation WHERE reserve_id = %s", (reserve_id,))
        conn.commit()
        return jsonify({"message": "Reservation deleted"}), 200
    finally:
        cursor.close()
        conn.close()

# ==========================================
# 5. 留言與統計
# ==========================================

@app.route('/messages', methods=['POST'])
def create_message():
    data = request.json
    member_id = data.get('member_id')
    deceased_id = data.get('deceased_id')
    item_type = data.get('item_type')
    content = data.get('content')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "INSERT INTO message (member_id, deceased_id, item_type, content) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (member_id, deceased_id, item_type, content))
        conn.commit()
        return jsonify({"message": "Message posted"}), 201
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM slot")
        total_slots = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM slot WHERE status = '空置'")
        empty_slots = cursor.fetchone()[0]
        
        today = datetime.date.today().strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) FROM reservation WHERE reserve_date = %s", (today,))
        today_res = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM billing WHERE status = '未繳'")
        unpaid_bills = cursor.fetchone()[0]
        
        return jsonify({
            "total_slots": total_slots,
            "empty_slots": empty_slots,
            "today_reservations": today_res,
            "unpaid_bills": unpaid_bills
        }), 200
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
