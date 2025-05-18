import { executeQuery } from "./db";
import { auth } from "@clerk/nextjs/server";

export type Role = 'admin' | 'user';

export interface UserData {
  id: number;
  clerk_id: string;
  email: string;
  name: string | null;
  role: Role;
  last_login: Date;
}

// Admin user IDs - fallback if metadata is unavailable
// These are Clerk user IDs that should have admin access
export const ADMIN_USER_IDS: string[] = [
  // Add admin user IDs here, e.g. 'user_2xB9Hk2...'
];

/**
 * Get the role for a user from our database or fallback list
 */
export async function getUserRole(userId: string): Promise<Role> {
  try {
    // Try to get from our database first
    const users = await executeQuery(
      `SELECT role FROM users WHERE clerk_id = $1`,
      [userId]
    );
    
    if (users.length > 0 && users[0].role) {
      return users[0].role as Role;
    }
    
    // If not in database, use fallback list
    return ADMIN_USER_IDS.includes(userId) ? 'admin' : 'user';
  } catch (error) {
    console.error(`Error getting user role:`, error);
    // Fallback to hardcoded list
    return ADMIN_USER_IDS.includes(userId) ? 'admin' : 'user';
  }
}

/**
 * Get the current user's data from the database
 */
export async function getCurrentUser(): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("AUTH-UTILS: No user ID in auth context");
      return null;
    }
    
    const users = await executeQuery(
      `SELECT * FROM users WHERE clerk_id = $1`,
      [userId]
    );
    
    if (users.length === 0) {
      console.log(`AUTH-UTILS: User ${userId} not found in database`);
      return null;
    }
    
    return users[0] as UserData;
  } catch (error) {
    console.error("AUTH-UTILS: Error getting current user:", error);
    return null;
  }
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;
    
    // First try to get role from our database
    const currentUser = await getCurrentUser();
    if (currentUser) {
      return currentUser.role === 'admin';
    }
    
    // If not in our database, check Clerk metadata
    const role = await getUserRole(userId);
    return role === 'admin';
  } catch (error) {
    console.error("AUTH-UTILS: Error checking admin status:", error);
    return false;
  }
}

/**
 * Get user by ID from the database
 */
export async function getUserById(userId: string): Promise<UserData | null> {
  try {
    const users = await executeQuery(
      `SELECT * FROM users WHERE clerk_id = $1`,
      [userId]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    return users[0] as UserData;
  } catch (error) {
    console.error(`AUTH-UTILS: Error getting user ${userId}:`, error);
    return null;
  }
}

/**
 * Get all users from the database
 */
export async function getAllUsers(): Promise<UserData[]> {
  try {
    const users = await executeQuery(`SELECT * FROM users ORDER BY id`);
    return users as UserData[];
  } catch (error) {
    console.error("AUTH-UTILS: Error getting all users:", error);
    return [];
  }
}

/**
 * Verify if a user can access specific data
 * Admin users can access any data
 * Regular users can only access their own data
 */
export async function canAccessData(dataOwnerId: string): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;
    
    // Admins can access all data
    if (currentUser.role === 'admin') return true;
    
    // Regular users can only access their own data
    return currentUser.clerk_id === dataOwnerId;
  } catch (error) {
    console.error("AUTH-UTILS: Error checking data access:", error);
    return false;
  }
}

/**
 * Apply user filters to a SQL query
 * For admin users, returns all data
 * For regular users, only returns their own data
 */
export async function applyUserFilter(query: string, params: any[] = []): Promise<{ query: string, params: any[] }> {
  const isUserAdmin = await isAdmin();
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("User not authenticated");
  }
  
  if (isUserAdmin) {
    // Admin users can see all data
    return { query, params };
  } else {
    // Regular users can only see their own data
    // This assumes your tables have a user_id or owner_id column
    if (query.toLowerCase().includes('where')) {
      // If the query already has a WHERE clause, add user filter with AND
      const modifiedQuery = query + ` AND user_id = $${params.length + 1}`;
      return { 
        query: modifiedQuery, 
        params: [...params, userId] 
      };
    } else {
      // If no WHERE clause, add one for user_id
      const modifiedQuery = query + ` WHERE user_id = $${params.length + 1}`;
      return { 
        query: modifiedQuery, 
        params: [...params, userId] 
      };
    }
  }
} 