import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

class AppointmentChatbot:
    def __init__(self):
        """Initialize the appointment chatbot with LangChain"""
        self.llm = ChatOpenAI(
            model=os.getenv('LLM_MODEL', 'gpt-3.5-turbo'),
            temperature=float(os.getenv('TEMPERATURE', '0.7')),
            max_tokens=int(os.getenv('MAX_TOKENS', '1000')),
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # System prompt for appointment scheduling
        self.system_prompt = """You are a helpful appointment scheduling assistant. Your role is to:

1. Help users schedule appointments by collecting necessary information
2. Provide friendly and professional responses
3. Ask clarifying questions when needed
4. Confirm appointment details before scheduling
5. Handle appointment modifications and cancellations

Key information to collect for appointments:
- Type of appointment (medical, consultation, general, follow-up)
- Preferred date and time (accept formats like "tomorrow at 2 PM", "Monday morning", "next Friday at 3:30 PM")
- Duration (default 60 minutes)
- Location preference
- Any special notes or requirements

When users provide date/time information, acknowledge it and confirm the details before creating the appointment.

Always be polite, professional, and helpful. If you're unsure about something, ask for clarification."""

        # Create conversation prompt template
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
        
        # Create conversation chain
        self.conversation_chain = self.prompt_template | self.llm

    def process_message(self, message: str, user_id: int, user_info: Dict, conversation_history: List[Dict]) -> Dict[str, Any]:
        """Process user message and generate response"""
        try:
            # Convert conversation history to LangChain messages
            chat_history = []
            for msg in conversation_history:
                if msg['message_type'] == 'user':
                    chat_history.append(HumanMessage(content=msg['content']))
                elif msg['message_type'] == 'bot':
                    chat_history.append(AIMessage(content=msg['content']))
            
            # Create system message with current context
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            system_message = self.system_prompt.format(current_datetime=current_time)
            
            # Add user info context
            if user_info:
                user_context = f"\nUser Information:\n- Name: {user_info.get('firstName', '')} {user_info.get('lastName', '')}\n- Email: {user_info.get('email', '')}"
                system_message += user_context
            
            # Process the message
            response = self.conversation_chain.invoke({
                "input": message,
                "chat_history": chat_history
            })
            
            # Extract content from response
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Analyze response for appointment creation
            appointment_data = self._extract_appointment_data(message, response_text, user_id)
            
            metadata = {
                'user_id': user_id,
                'timestamp': datetime.now().isoformat(),
                'message_length': len(message),
                'response_length': len(response_text)
            }
            
            if appointment_data:
                metadata['appointment_data'] = appointment_data
                metadata['appointment_created'] = True
                metadata['appointment_id'] = appointment_data.get('id')
            else:
                metadata['appointment_created'] = False
            
            return {
                'message': response_text,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                'message': f"I apologize, but I'm experiencing some technical difficulties. Error: {str(e)}",
                'metadata': {
                    'error': 'processing_error',
                    'timestamp': datetime.now().isoformat(),
                    'error_details': str(e)
                }
            }

    def _extract_appointment_data(self, user_message: str, bot_response: str, user_id: int) -> Optional[Dict]:
        """Extract appointment data from conversation and create appointment if ready"""
        try:
            # Simple keyword detection for appointment scheduling
            appointment_keywords = [
                'schedule', 'book', 'appointment', 'meeting', 'consultation',
                'checkup', 'visit', 'session', 'reservation', 'make an appointment'
            ]
            
            # Check if user wants to schedule something
            if not any(keyword in user_message.lower() for keyword in appointment_keywords):
                return None
            
            # Check if bot response indicates appointment should be created
            confirmation_keywords = [
                'scheduled', 'booked', 'confirmed', 'appointment created',
                'i\'ve scheduled', 'your appointment is', 'appointment has been',
                'i\'ll schedule', 'let me schedule', 'i can schedule'
            ]
            
            # Also check if user provided specific details
            detail_keywords = [
                'tomorrow', 'today', 'next week', 'monday', 'tuesday', 'wednesday', 
                'thursday', 'friday', 'saturday', 'sunday', 'am', 'pm', 'morning',
                'afternoon', 'evening', 'medical', 'consultation', 'checkup'
            ]
            
            has_details = any(keyword in user_message.lower() for keyword in detail_keywords)
            bot_confirms = any(keyword in bot_response.lower() for keyword in confirmation_keywords)
            
            # Create appointment if user provided details or bot confirms scheduling
            if has_details or bot_confirms:
                appointment_data = self._parse_appointment_details(user_message, bot_response)
                
                if appointment_data:
                    # Create appointment in database
                    appointment_id = self._create_appointment(user_id, appointment_data)
                    if appointment_id:
                        appointment_data['id'] = appointment_id
                        return appointment_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting appointment data: {e}")
            return None

    def _parse_appointment_details(self, user_message: str, bot_response: str) -> Optional[Dict]:
        """Parse appointment details from user message and bot response"""
        try:
            # This is a simplified parser - in a real implementation, you'd use more sophisticated NLP
            appointment_data = {
                'title': 'Appointment',
                'description': user_message,
                'appointment_type': 'general',
                'duration_minutes': 60,
                'location': None,
                'notes': None
            }
            
            # Extract appointment type
            if any(word in user_message.lower() for word in ['medical', 'doctor', 'checkup', 'health']):
                appointment_data['appointment_type'] = 'medical'
                appointment_data['title'] = 'Medical Appointment'
            elif any(word in user_message.lower() for word in ['consultation', 'consult']):
                appointment_data['appointment_type'] = 'consultation'
                appointment_data['title'] = 'Consultation'
            elif any(word in user_message.lower() for word in ['follow', 'follow-up']):
                appointment_data['appointment_type'] = 'follow-up'
                appointment_data['title'] = 'Follow-up Appointment'
            
            # Parse date and time with better logic
            appointment_data['appointment_date'] = self._parse_date_time(user_message)
            
            # Extract duration
            if '30 minutes' in user_message.lower() or 'half hour' in user_message.lower():
                appointment_data['duration_minutes'] = 30
            elif '45 minutes' in user_message.lower():
                appointment_data['duration_minutes'] = 45
            elif '90 minutes' in user_message.lower() or '1.5 hours' in user_message.lower():
                appointment_data['duration_minutes'] = 90
            elif '2 hours' in user_message.lower() or '120 minutes' in user_message.lower():
                appointment_data['duration_minutes'] = 120
            
            return appointment_data
            
        except Exception as e:
            logger.error(f"Error parsing appointment details: {e}")
            return None

    def _parse_date_time(self, user_message: str) -> str:
        """Parse date and time from user message"""
        import re
        from datetime import datetime, timedelta
        
        message_lower = user_message.lower()
        
        # Default to tomorrow at 10 AM if no specific time mentioned
        base_date = datetime.now() + timedelta(days=1)
        base_date = base_date.replace(hour=10, minute=0, second=0, microsecond=0)
        
        # Parse "today" 
        if 'today' in message_lower:
            base_date = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
        
        # Parse "tomorrow"
        elif 'tomorrow' in message_lower:
            base_date = datetime.now() + timedelta(days=1)
            base_date = base_date.replace(hour=10, minute=0, second=0, microsecond=0)
        
        # Parse specific days of the week
        days_of_week = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        
        for day_name, day_num in days_of_week.items():
            if day_name in message_lower:
                days_ahead = day_num - datetime.now().weekday()
                if days_ahead <= 0:  # Target day already happened this week
                    days_ahead += 7
                base_date = datetime.now() + timedelta(days=days_ahead)
                base_date = base_date.replace(hour=10, minute=0, second=0, microsecond=0)
                break
        
        # Parse time patterns
        time_patterns = [
            r'(\d{1,2}):(\d{2})\s*(am|pm)?',  # 2:30 PM, 14:30
            r'(\d{1,2})\s*(am|pm)',           # 2 PM, 2pm
            r'(\d{1,2})\s*o\'?clock',         # 2 o'clock
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, message_lower)
            if match:
                if ':' in match.group(0):  # Format like 2:30 PM
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    ampm = match.group(3) if len(match.groups()) > 2 else None
                else:  # Format like 2 PM
                    hour = int(match.group(1))
                    minute = 0
                    ampm = match.group(2) if len(match.groups()) > 1 else None
                
                # Convert to 24-hour format
                if ampm:
                    if ampm.lower() == 'pm' and hour != 12:
                        hour += 12
                    elif ampm.lower() == 'am' and hour == 12:
                        hour = 0
                
                base_date = base_date.replace(hour=hour, minute=minute)
                break
        
        # Parse time descriptions
        if 'morning' in message_lower:
            base_date = base_date.replace(hour=9, minute=0)
        elif 'afternoon' in message_lower:
            base_date = base_date.replace(hour=14, minute=0)
        elif 'evening' in message_lower:
            base_date = base_date.replace(hour=18, minute=0)
        
        return base_date.isoformat()

    def _create_appointment(self, user_id: int, appointment_data: Dict) -> Optional[int]:
        """Create appointment in database"""
        try:
            conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                database=os.getenv('DB_NAME', 'appointment_chatbot'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD')
            )
            
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO appointments 
                (user_id, title, description, appointment_date, duration_minutes, 
                 appointment_type, location, notes, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                RETURNING id
            """, (
                user_id,
                appointment_data['title'],
                appointment_data['description'],
                appointment_data['appointment_date'],
                appointment_data['duration_minutes'],
                appointment_data['appointment_type'],
                appointment_data.get('location'),
                appointment_data.get('notes')
            ))
            
            appointment_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Created appointment {appointment_id} for user {user_id}")
            return appointment_id
            
        except Exception as e:
            logger.error(f"Error creating appointment: {e}")
            return None

    def get_user_appointments(self, user_id: int) -> List[Dict]:
        """Get appointments for a user"""
        try:
            conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                database=os.getenv('DB_NAME', 'appointment_chatbot'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD')
            )
            
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
            
            return [dict(apt) for apt in appointments]
            
        except Exception as e:
            logger.error(f"Error getting appointments: {e}")
            return []
