import type { Product } from "./productapi";
import { API_BASE_URL } from "../config";


// Fetch product list for currently logged in user
export const fetchUserListings = async (userId: number): Promise<Product[]> => {
    try {
      const url = `${API_BASE_URL}/users/my-listings/${userId}`;
  
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const userListings = await response.json()
      return userListings
    } catch (error) {
      console.error("Fetch Error:", error);
      throw new Error(error instanceof Error ? error.message : "Unexpected fetch error");
    }
  };