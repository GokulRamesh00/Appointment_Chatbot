from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from datetime import datetime, timedelta
import json
from chatbot_service import AppointmentChatbot

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'appointment_chatbot'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD')
}

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {e}")
        raise

# Initialize chatbot service
chatbot = AppointmentChatbot()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'service': 'appointment-chatbot-python'
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        message = data.get('message')
        session_id = data.get('sessionId')
        user_id = data.get('userId')
        user_info = data.get('userInfo', {})
        
        if not all([message, session_id, user_id]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        logger.info(f"Processing chat message for session {session_id}")
        
        # Get conversation history
        conversation_history = get_conversation_history(session_id)
        
        # Process message with chatbot
        response = chatbot.process_message(
            message=message,
            user_id=user_id,
            user_info=user_info,
            conversation_history=conversation_history
        )
        
        # Store bot response in database
        store_message(session_id, 'bot', response['message'], response.get('metadata', {}))
        
        # If appointment was created, update session with appointment_id
        if response.get('appointment_created'):
            update_session_appointment(session_id, response.get('appointment_id'))
        
        return jsonify({
            'message': response['message'],
            'metadata': response.get('metadata', {}),
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def get_conversation_history(session_id):
    """Get conversation history for a session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT message_type, content, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY created_at ASC
            LIMIT 20
        """, (session_id,))
        
        messages = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return [dict(msg) for msg in messages]
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        return []

def store_message(session_id, message_type, content, metadata=None):
    """Store a message in the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO chat_messages (session_id, message_type, content, metadata)
            VALUES (%s, %s, %s, %s)
        """, (session_id, message_type, content, json.dumps(metadata) if metadata else None))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Error storing message: {e}")

def update_session_appointment(session_id, appointment_id):
    """Update session with appointment_id"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE chat_sessions
            SET appointment_id = %s
            WHERE id = %s
        """, (appointment_id, session_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Error updating session appointment: {e}")

@app.route('/appointments', methods=['POST'])
def create_appointment():
    """Create appointment endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['user_id', 'title', 'appointment_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            INSERT INTO appointments 
            (user_id, title, description, appointment_date, duration_minutes, 
             appointment_type, location, notes, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING id, title, description, appointment_date, duration_minutes, 
                      appointment_type, location, notes, status, created_at
        """, (
            data['user_id'],
            data['title'],
            data.get('description'),
            data['appointment_date'],
            data.get('duration_minutes', 60),
            data.get('appointment_type', 'general'),
            data.get('location'),
            data.get('notes')
        ))
        
        appointment = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'appointment_id': appointment['id'],
            'message': 'Appointment created successfully',
            'appointment': dict(appointment)
        })
        
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/appointments/<int:user_id>', methods=['GET'])
def get_user_appointments(user_id):
    """Get appointments for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, title, description, appointment_date, duration_minutes, 
                   status, appointment_type, location, notes, created_at, updated_at
            FROM appointments
            WHERE user_id = %s
            ORDER BY appointment_date DESC
            LIMIT 50
        """, (user_id,))
        
        appointments = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            'appointments': [dict(apt) for apt in appointments]
        })
        
    except Exception as e:
        logger.error(f"Error getting appointments: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Python chatbot service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
