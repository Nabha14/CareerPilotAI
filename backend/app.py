import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)

# 3. Grab the key securely from the environment
API_KEY = os.getenv("GEMINI_API_KEY")

# 4. Configure Gemini using that safe variable
genai.configure(api_key=API_KEY)

# --- DATABASE CONFIGURATION ---
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")       
    )
    
# --- EMAIL CONFIGURATION ---
SENDER_EMAIL = "nabhapote@gmail.com" 
APP_PASSWORD = "jwmmxagpaznybgoh" 

def send_welcome_email(receiver_email, user_name):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email
        msg['Subject'] = "Welcome to CareerPilot AI! 🚀"

        body = f"Hello {user_name},\n\nWelcome to CareerPilot AI! Your account is created and your data is securely saved in our database."
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Email Error: {e}")
        return False

# --- API ENDPOINTS ---

# 1. REGISTER ROUTE
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    
    # Grab all the data from the frontend
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    degree = data.get('degree')
    cgpa = data.get('cgpa')
    skills = data.get('skills')
    current_role = data.get('current_role')
    target_role = data.get('target_role')

    if not email or not password or not full_name:
        return jsonify({"status": "error", "message": "Missing required fields!"}), 400

    try:
        # Connect to database
        db = get_db_connection()
        cursor = db.cursor()

        # Encrypt the password
        hashed_password = generate_password_hash(password)

        # Insert into MySQL
        sql = """INSERT INTO users 
                 (full_name, email, password_hash, degree, cgpa, skills, current_role, target_role) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (full_name, email, hashed_password, degree, cgpa, skills, current_role, target_role)
        
        cursor.execute(sql, values)
        db.commit() # Save the changes!
        
        # Send the welcome email
        send_welcome_email(email, full_name)

        return jsonify({"status": "success", "message": "Registration successful! Welcome email sent."}), 200

    except mysql.connector.IntegrityError:
        return jsonify({"status": "error", "message": "An account with this email already exists."}), 409
    except Exception as e:
        print(f"Database Error: {e}")
        return jsonify({"status": "error", "message": "Server error while creating account."}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

# 2. LOGIN ROUTE
@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    # Handle CORS preflight request safely
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"status": "error", "message": "Missing email or password!"}), 400

    try:
        db = get_db_connection()
        # dictionary=True makes sure we get columns by name (like user['password_hash'])
        cursor = db.cursor(dictionary=True) 
        
        # Find the user by email
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        # Check if user exists AND password matches the encrypted hash
        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                "status": "success", 
                "message": "Login successful!",
                "user": {
                    "name": user['full_name'],
                    "role": user['target_role']
                }
            }), 200
        else:
            return jsonify({"status": "error", "message": "Invalid email or password."}), 401
            
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"status": "error", "message": "Server error during login."}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    data = request.get_json()
    topic = data.get('topic')
    timeframe = data.get('timeframe')

    if not topic or not timeframe:
        return jsonify({"status": "error", "message": "Missing topic or timeframe"}), 400

    try:
        # Initialize the new client 
        client = genai.Client(api_key="AIzaSyAMpXq_bGNqxYqvk8WZHPbpsSrUkMlXT6Q")

        # 1. We write a highly specific prompt for the AI
        prompt = f"""
        You are an expert career coach and technical tutor.
        Create a detailed, actionable, week-by-week study plan for a student who wants to learn "{topic}" in exactly {timeframe} weeks.
        
        CRITICAL INSTRUCTIONS:
        - Format your entire response using ONLY clean HTML tags (like <h3>, <h4>, <ul>, <li>, <strong>).
        - Do not use any markdown backticks (like ```html). 
        - Make it look professional and easy to read.
        """

        # 2. Call the Gemini API using the new syntax
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt
        )

        # 3. Send the HTML directly back to the frontend
        return jsonify({
            "status": "success",
            "plan_html": response.text
        })

    except Exception as e:
        print("AI Error:", e) # This prints the exact error in your terminal!
        return jsonify({
            "status": "error",
            "message": "The AI is currently resting. Please try again."
        }), 500
        
# --- START THE SERVER (MUST BE AT THE VERY BOTTOM) ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)