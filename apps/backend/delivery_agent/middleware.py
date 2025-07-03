from django.http import JsonResponse
from ninja.errors import HttpError
from loguru import logger
import jwt
from django.conf import settings
from .models import DeliveryAgent
from typing import Callable
from django.http import HttpRequest, HttpResponse

class DeliveryAgentAuthMiddleware:
    def __init__(self, get_response: Callable):
        self.get_response = get_response
        # List of paths that don't require authentication
        self.public_paths = [
            '/api/delivery-agent/signup',
            '/api/delivery-agent/login'
        ]

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Check if the request is for delivery agent API
        if not request.path.startswith('/api/delivery-agent'):
            return self.get_response(request)

        # Allow access to public paths
        if request.path in self.public_paths:
            return self.get_response(request)

        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Authentication required'}, 
                status=401
            )

        try:
            # Extract and verify the token
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            # Get the agent from database
            agent = DeliveryAgent.objects.get(agent_id=payload['agent_id'])
            
            # Check if agent is approved
            if agent.approval_status != 'approved':
                return JsonResponse(
                    {'error': 'Account is not approved'}, 
                    status=403
                )
            
            # Add agent to request for use in views
            request.delivery_agent = agent
            
            return self.get_response(request)

        except jwt.ExpiredSignatureError:
            return JsonResponse(
                {'error': 'Token has expired'}, 
                status=401
            )
        except jwt.InvalidTokenError:
            return JsonResponse(
                {'error': 'Invalid token'}, 
                status=401
            )
        except DeliveryAgent.DoesNotExist:
            return JsonResponse(
                {'error': 'Delivery agent not found'}, 
                status=401
            )
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return JsonResponse(
                {'error': 'Authentication failed'}, 
                status=500
            )