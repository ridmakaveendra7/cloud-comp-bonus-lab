from django.shortcuts import render

# Create your views here.
# chats/views.py
from django.http import JsonResponse
from django.db.models import Q, Max, Count
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from users.models import UserProfile
from products.models import Product
from .models import ChatMessage
import json

@require_http_methods(["GET"])
def get_user_chat_rooms(request, user_id):
    """
    Get all chat rooms for a specific user with the latest message info
    """
    try:
        user = UserProfile.objects.get(user_id=user_id)
        
        # Get all rooms where the user is either the seller or buyer
        # Room format: product_{product_id}_{smaller_user_id}_{larger_user_id}
        rooms_as_seller = ChatMessage.objects.filter(
            room_name__contains=f"_{user_id}_"
        ).values('room_name').distinct()
        
        rooms_as_buyer = ChatMessage.objects.filter(
            room_name__endswith=f"_{user_id}"
        ).values('room_name').distinct()
        
        # Combine and get unique room names
        all_rooms = set()
        for room in rooms_as_seller:
            all_rooms.add(room['room_name'])
        for room in rooms_as_buyer:
            all_rooms.add(room['room_name'])
        
        chat_rooms = []
        
        for room_name in all_rooms:
            # Get the latest message for this room
            latest_message = ChatMessage.objects.filter(
                room_name=room_name
            ).order_by('-timestamp').first()
            
            if not latest_message:
                continue
                
            # Parse room name to extract info
            # Format: product_{product_id}_{smaller_user_id}_{larger_user_id}
            parts = room_name.split('_')
            if len(parts) >= 4:
                try:
                    product_id = int(parts[1])
                    user1_id = int(parts[2])
                    user2_id = int(parts[3])
                    
                    # Determine the other user
                    other_user_id = user1_id if user2_id == user_id else user2_id
                    other_user = UserProfile.objects.get(user_id=other_user_id)
                    
                    # Get product info
                    product = None
                    product_name = None
                    try:
                        product = Product.objects.get(product_id=product_id)
                        product_name = product.name
                    except Product.DoesNotExist:
                        product_name = "Product not found"
                    
                    # Count unread messages (messages from other user after user's last read)
                    unread_count = ChatMessage.objects.filter(
                        room_name=room_name,
                        user=other_user,
                        timestamp__gt=latest_message.timestamp
                    ).count()
                    
                    chat_rooms.append({
                        'room_name': room_name,
                        'last_message': latest_message.message,
                        'last_message_time': latest_message.timestamp.isoformat(),
                        'other_user_email': other_user.email,
                        'other_user_name': other_user.first_name + ' ' + other_user.last_name,
                        'product_name': product_name,
                        'product_id': str(product_id),
                        'unread_count': unread_count
                    })
                    
                except (ValueError, UserProfile.DoesNotExist, IndexError):
                    continue
        
        # Sort by latest message time
        chat_rooms.sort(key=lambda x: x['last_message_time'], reverse=True)
        
        return JsonResponse(chat_rooms, safe=False)
        
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_chat_messages(request, room_name):
    """
    Get all messages for a specific chat room
    """
    try:
        messages = ChatMessage.objects.filter(
            room_name=room_name
        ).order_by('timestamp')
        
        message_list = []
        for msg in messages:
            message_list.append({
                'id': msg.id,
                'message': msg.message,
                'translated_message': msg.translated_message,
                'language': msg.language,
                'sender': msg.user.email if msg.user else 'anonymous',
                'timestamp': msg.timestamp.isoformat(),
                'room_name': msg.room_name
            })
        
        return JsonResponse(message_list, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def create_chat_room(request):
    """
    Create or get existing chat room between two users for a product
    """
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        user1_id = data.get('user1_id')  # Usually the buyer
        user2_id = data.get('user2_id')  # Usually the seller
        
        if not all([product_id, user1_id, user2_id]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        # Ensure users exist
        try:
            user1 = UserProfile.objects.get(user_id=user1_id)
            user2 = UserProfile.objects.get(user_id=user2_id)
            product = Product.objects.get(product_id=product_id)
        except (UserProfile.DoesNotExist, Product.DoesNotExist):
            return JsonResponse({'error': 'User or product not found'}, status=404)
        
        # Create room name with smaller user_id first for consistency
        sorted_user_ids = sorted([user1_id, user2_id])
        room_name = f"product_{product_id}_{sorted_user_ids[0]}_{sorted_user_ids[1]}"
        
        # Check if room already exists
        existing_messages = ChatMessage.objects.filter(room_name=room_name).exists()
        
        response_data = {
            'room_name': room_name,
            'product_id': product_id,
            'product_name': product.name,
            'user1_email': user1.email,
            'user2_email': user2.email,
            'is_new_room': not existing_messages
        }
        
        return JsonResponse(response_data)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_user_active_chats_count(request, user_id):
    """
    Get count of active chats for a user (for notification purposes)
    """
    try:
        user = UserProfile.objects.get(user_id=user_id)
        
        # Count distinct rooms where user has messages
        rooms_as_participant = ChatMessage.objects.filter(
            Q(room_name__contains=f"_{user_id}_") | Q(room_name__endswith=f"_{user_id}")
        ).values('room_name').distinct().count()
        
        return JsonResponse({'active_chats_count': rooms_as_participant})
        
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)