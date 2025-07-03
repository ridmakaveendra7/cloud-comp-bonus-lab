from ninja import Router
from ninja.errors import HttpError
from loguru import logger
from .models import DeliveryRequest
from .schemas import DeliveryRequestOut, DeliveryRequestIn, DeliveryAgentSignup, DeliveryAgentOut, DeliveryAgentLogin, AuthResponse, RefreshTokenRequest, DeliveryDetailsOut
from .database import (
    get_accepted_requests_for_agent,
    create_delivery_request,
    get_previous_deliveries_for_agent,
    create_delivery_agent,
    login_delivery_agent,
    refresh_access_token,
    accept_delivery_request
)

delivery_agent_router = Router()

@delivery_agent_router.get("/previous-deliveries/{agent_id}", response=list[DeliveryRequestOut], tags=["DeliveryAgent"])
def get_previous_deliveries_api(request, agent_id: int):
    """
    API endpoint to fetch previous deliveries for a specific delivery agent.
    """
    try:
        deliveries = get_previous_deliveries_for_agent(agent_id)
        if not deliveries:
            raise HttpError(404, f"No previous deliveries found for agent ID {agent_id}.")
        return deliveries
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error in API while fetching previous deliveries for agent ID {agent_id}: {e}")
        raise HttpError(500, f"An error occurred while fetching previous deliveries: {str(e)}")
    
@delivery_agent_router.get("/pending-requests/{agent_id}", response=list[DeliveryRequestOut], tags=["DeliveryAgent"])
def get_pending_requests_api(request, agent_id: int):
    """
    API endpoint to fetch pending delivery requests for a specific delivery agent.
    """
    try:
        from .database import get_pending_requests_for_agent
        return get_pending_requests_for_agent(agent_id)
    except Exception as e:
        logger.error(f"Error fetching pending requests for agent ID {agent_id}: {e}")
        raise HttpError(500, f"An error occurred: {str(e)}")

@delivery_agent_router.post("/accept-request/{request_id}/{agent_id}", tags=["DeliveryAgent"])  # moved the import to the top
def accept_request_api(request, request_id: int, agent_id: int):
    """
    Assigns a delivery request to the agent and marks it accepted.
    """
    try:
        return accept_delivery_request(request_id, agent_id)
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error accepting request {request_id} by agent {agent_id}: {e}")
        raise HttpError(500, f"Failed to accept request: {str(e)}")
    
@delivery_agent_router.get("/accepted-deliveries/{agent_id}", response=list[DeliveryRequestOut], tags=["DeliveryAgent"])
def get_accepted_deliveries_api(request, agent_id: int):
    """
    API endpoint to fetch accepted deliveries for a specific delivery agent.
    """
    try:
        deliveries = get_accepted_requests_for_agent(agent_id)
        if not deliveries:
            raise HttpError(404, f"No accepted deliveries found for agent ID {agent_id}.")
        return deliveries
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error in API while fetching accepted deliveries for agent ID {agent_id}: {e}")
        raise HttpError(500, f"An error occurred while fetching accepted deliveries: {str(e)}")

@delivery_agent_router.post("/create-delivery-request", response=DeliveryRequestOut, tags=["DeliveryAgent"])
def create_delivery_request_api(request, delivery_request: DeliveryRequestIn):
    """
    API endpoint to create a new delivery request.
    """
    try:
        return create_delivery_request(delivery_request)
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error creating delivery request: {e}")
        raise HttpError(500, f"Failed to create delivery request: {str(e)}")
@delivery_agent_router.post("/update-status/{request_id}", tags=["DeliveryAgent"])
def update_delivery_status_api(request, request_id: int, status: str):
    """
    Update the delivery status (out_for_delivery, on_the_way, delivered) for a request.
    Once status is delivered, no further updates are allowed.
    """
    from .database import update_delivery_status, get_current_status
    allowed_statuses = ["out_for_delivery", "on_the_way", "delivered"]

    if status not in allowed_statuses:
        raise HttpError(400, f"Invalid status. Allowed values: {allowed_statuses}")

    try:
        current_status = get_current_status(request_id)
        if current_status == "delivered":
            raise HttpError(400, "Status cannot be changed once marked as delivered")

        return update_delivery_status(request_id, status)

    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Failed to update status for request {request_id}: {e}")
        raise HttpError(500, f"Error updating delivery status: {str(e)}")

@delivery_agent_router.post("/signup", response=DeliveryAgentOut, tags=["DeliveryAgent"])
def signup_delivery_agent(request, agent_data: DeliveryAgentSignup):
    """
    API endpoint for delivery agent signup.
    """
    try:
        return create_delivery_agent(agent_data)
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error in signup API: {e}")
        raise HttpError(500, f"Failed to create delivery agent account: {str(e)}")

@delivery_agent_router.post("/login", response=AuthResponse, tags=["DeliveryAgent"])
def login_agent(request, login_data: DeliveryAgentLogin):
    """
    API endpoint for delivery agent login.
    """
    try:
        return login_delivery_agent(login_data)
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error in login API: {e}")
        raise HttpError(500, f"Login failed: {str(e)}")

@delivery_agent_router.post("/refresh-token", response=AuthResponse, tags=["DeliveryAgent"])
def refresh_token(request, refresh_data: RefreshTokenRequest):
    """
    API endpoint to refresh the access token using a refresh token.
    """
    try:
        return refresh_access_token(refresh_data)
    except HttpError:
        raise
    except Exception as e:
        logger.error(f"Error in refresh token API: {e}")
        raise HttpError(500, f"Failed to refresh token: {str(e)}")
    
@delivery_agent_router.get("/accepted-delivery-details/{request_id}", response=DeliveryDetailsOut)
def get_delivery_details(request, request_id: int):
    try:
        delivery = DeliveryRequest.objects.get(request_id=request_id)
        if delivery.status not in ["accepted", "completed"]:
            raise HttpError(400, "Delivery is not accepted or completed yet.")
        
        delivery_date = delivery.delivery_date.strftime("%Y-%m-%d") if delivery.delivery_date else None
        delivery_time = delivery.delivery_date.strftime("%H:%M:%S") if delivery.delivery_date else None
        
        return DeliveryDetailsOut(
            pickup_location=delivery.pickup_location,
            dropoff_location=delivery.dropoff_location,
            delivery_date=delivery_date,
            delivery_time=delivery_time
        )
    except DeliveryRequest.DoesNotExist:
        raise HttpError(404, "Delivery request not found.")
    except Exception as e:
        logger.error(f"Error fetching delivery details: {e}")
        raise HttpError(500, "Failed to fetch delivery details.")
