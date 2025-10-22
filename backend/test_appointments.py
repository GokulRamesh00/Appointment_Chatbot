import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get the latest appointments
    cursor.execute("""
        SELECT id, title, description, appointment_date, appointment_type, status, created_at
        FROM appointments
        ORDER BY created_at DESC
        LIMIT 5
    """)
    
    appointments = cursor.fetchall()
    
    print("Latest appointments:")
    for apt in appointments:
        print(f"ID: {apt['id']}, Title: {apt['title']}, Date: {apt['appointment_date']}, Type: {apt['appointment_type']}, Status: {apt['status']}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Database error: {e}")
