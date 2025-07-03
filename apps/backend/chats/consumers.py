import os
import json
import deepl
import traceback
from loguru import logger
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async
from users.models import UserProfile
from chats.models import ChatMessage
import datetime

# Configure loguru
logger.add("logs/chat_consumer.log", rotation="500 MB", level="INFO")

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"
        self.user = self.scope["user"]

        logger.info(f"New connection attempt - Room: {self.room_name}, User: {self.user}")
        if isinstance(self.user, AnonymousUser):
            logger.warning("User is anonymous in WebSocket connection")
        else:
            logger.info(f"User authenticated: {self.user.email}")
        
        # Initialize DeepL translator with error handling
        try:
            api_key = os.getenv("DEEPL_API_KEY")
            if not api_key:
                raise ValueError("DEEPL_API_KEY environment variable not set")
            self.translator = deepl.Translator(api_key)
        except Exception as e:
            self.translator = None
            logger.error(f"DeepL translator initialization failed: {e}. Translation will be disabled.")
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        messages = await self.get_past_messages(self.room_name)
        logger.info(f"Retrieved {len(messages)} past messages for room {self.room_name}")
        
        for msg in messages:
            # Get message data asynchronously
            message_data = await self.get_message_data(msg)
            await self.send(text_data=json.dumps(message_data))

    async def disconnect(self, close_code):
        logger.info(f"Disconnected from room {self.room_name} with code {close_code}")
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")
        logger.debug(f"Received message of type: {msg_type}")
        
        if msg_type == "chat":
            await self.handle_chat_message(data)
        elif msg_type == "translate":
            await self.handle_translation_request(data)

    async def handle_chat_message(self, data):
        message = data.get("message", "")
        # Get user email from UserProfile
        user_email = self.user.email if not isinstance(self.user, AnonymousUser) else "anonymous"
        
        logger.info(f"Processing chat message from {user_email} in room {self.room_name}")
        
        # Save message with proper parameters
        await self.save_message(self.room_name, self.user, message, None, None)
        
        # Create message data with consistent user information
        message_data = {
            "type": "chat_message",
            "message": message,
            "original": message,
            "language": None,
            "sender": user_email,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        # Send to the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                **message_data
            }
        )
        logger.debug(f"Message broadcasted to room {self.room_name}")

    async def handle_translation_request(self, data):
        original = data.get("message", "")
        target_lang = data.get("target", "EN-US")
        
        logger.info(f"Translation request - Target language: {target_lang}")
        
        try:
            result = self.translator.translate_text(original, target_lang=target_lang)
            translated = result.text
            source_lang = result.detected_source_lang
            logger.info(f"Translation successful - Source: {source_lang}, Target: {target_lang}")
        except Exception as e:
            translated = "[Translation Failed]"
            source_lang = "unknown"
            logger.error(f"Translation failed: {str(e)}")
            traceback.print_exc()

        await self.send(text_data=json.dumps({
            "type": "translation_result",
            "message": translated,
            "original": original,
            "language": source_lang,
            "target": target_lang,
            "sender": self.user.email if not isinstance(self.user, AnonymousUser) else "anonymous",
        }))

    async def chat_message(self, event):
        message_data = {k: v for k, v in event.items() if k != 'type'}
        await self.send(text_data=json.dumps(message_data))
        logger.debug("Chat message sent to client")

    @sync_to_async
    def get_message_data(self, msg):
        try:
            user_email = msg.user.email if msg.user else "anonymous"
            return {
                "message": msg.message,
                "translated": msg.translated_message,
                "language": msg.language,
                "sender": user_email,
                "timestamp": msg.timestamp.isoformat(),
            }
        except Exception as e:
            logger.error(f"Error getting message data: {str(e)}")
            return {
                "message": msg.message,
                "translated": msg.translated_message,
                "language": msg.language,
                "sender": "unknown",
                "timestamp": msg.timestamp.isoformat(),
            }

    @sync_to_async
    def save_message(self, room_name, user, original, translated, language):
        user_obj = None
        if not isinstance(user, AnonymousUser):
            try:
                # User is already a UserProfile instance
                user_obj = user
                logger.debug(f"Using existing UserProfile for message: {user.email}")
            except Exception as e:
                logger.error(f"Error accessing user profile: {str(e)}")
        
        try:
            ChatMessage.objects.create(
                room_name=room_name,
                user=user_obj,
                message=original,
                translated_message=translated,
                language=language
            )
            logger.debug(f"Message saved successfully for room {room_name}")
        except Exception as e:
            logger.error(f"Failed to save message: {str(e)}")

    @sync_to_async
    def get_past_messages(self, room_name):
        try:
            messages = list(ChatMessage.objects.filter(room_name=room_name).order_by("-timestamp")[:20][::-1])
            logger.debug(f"Retrieved {len(messages)} messages for room {room_name}")
            return messages
        except Exception as e:
            logger.error(f"Error retrieving past messages: {str(e)}")
            return []