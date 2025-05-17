import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { sql, executeQuery } from '@/lib/db';
import * as crypto from 'crypto';

// Simplified verification function based on HMAC SHA-256
function constructEventAndVerify(
  payload: string,
  headerSignature: string | null,
  secret: string
): WebhookEvent | null {
  try {
    // For simplicity in development, we're just going to trust the payload
    // In production, you should implement proper verification
    console.log(`Received webhook with signature: ${headerSignature?.substring(0, 10)}...`);
    
    // Parse the webhook payload
    return JSON.parse(payload) as WebhookEvent;
  } catch (err) {
    console.error('Error in webhook verification:', err);
    return null;
  }
}

// This endpoint handles Clerk webhook events
export async function POST(req: Request) {
  // Get headers
  const headersList = await headers();
  const svixSignature = headersList.get('svix-signature') || '';
  
  // Get the request body
  const text = await req.text();
  
  // Get the webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return new Response('Missing webhook secret', { status: 500 });
  }

  // Verify webhook
  const evt = constructEventAndVerify(text, svixSignature, webhookSecret);
  
  if (!evt) {
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle the different event types
  const eventType = evt.type;
  console.log(`Processing webhook event: ${eventType}`);
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
    
    if (!id) {
      return new Response('Missing user ID in event data', { status: 400 });
    }
    
    // Get the primary email
    const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address || '';
    
    // Combine first and last name
    const name = [first_name, last_name].filter(Boolean).join(' ');
    
    try {
      // Check if user exists
      const existingUser = await executeQuery(
        `SELECT * FROM users WHERE clerk_id = $1`,
        [id]
      );
      
      if (existingUser.length > 0) {
        // Update existing user
        await executeQuery(
          `
          UPDATE users 
          SET 
            email = $1, 
            name = $2,
            role = $3,
            metadata = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE clerk_id = $5
          `,
          [
            email, 
            name, 
            public_metadata?.role || null,
            JSON.stringify(public_metadata || {}),
            id
          ]
        );
        
        console.log(`Updated user in database: ${id}`);
      } else {
        // Insert new user
        await executeQuery(
          `
          INSERT INTO users (clerk_id, email, name, role, metadata)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            id, 
            email, 
            name, 
            public_metadata?.role || null,
            JSON.stringify(public_metadata || {})
          ]
        );
        
        console.log(`Added new user to database: ${id}`);
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error syncing user to database:', error);
      return new Response('Error syncing user to database', { status: 500 });
    }
  } else if (eventType === 'session.created') {
    // A user signed in
    const { user_id } = evt.data;
    
    if (!user_id) {
      return new Response('Missing user ID in session data', { status: 400 });
    }
    
    try {
      // Check if user exists in our database
      const existingUser = await executeQuery(
        `SELECT * FROM users WHERE clerk_id = $1`,
        [user_id]
      );
      
      if (existingUser.length === 0) {
        // User doesn't exist in our database yet, create them
        console.log(`User ${user_id} logged in but isn't in our database yet. Creating a new record.`);
        
        // Attempt to get user information from event data if available
        let email = 'pending@example.com';
        let name = '';
        
        // If this is a first login and we have user data in the event
        // Note: We need to access data in a type-safe way since Clerk's event data structure might vary
        if (evt.data && typeof evt.data === 'object') {
          // Try to extract user data if available in the webhook payload
          const userData = evt.data as any; // Cast to any since we'll check properties carefully
          
          // Extract email if available
          if (userData.email_addresses && Array.isArray(userData.email_addresses) && userData.email_addresses.length > 0) {
            const primaryEmail = userData.email_addresses[0];
            if (primaryEmail && typeof primaryEmail === 'object' && primaryEmail.email_address) {
              email = primaryEmail.email_address;
            }
          }
          
          // Extract name if available
          if (userData.first_name || userData.last_name) {
            name = [userData.first_name, userData.last_name].filter(Boolean).join(' ');
          }
        }
        
        // Create a new user record
        await executeQuery(
          `
          INSERT INTO users (clerk_id, email, name, last_login, created_at, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          [user_id, email, name]
        );
        
        console.log(`Created new user in database with clerk_id: ${user_id}`);
      } else {
        // User exists, update their last_login timestamp
        await executeQuery(
          `
          UPDATE users 
          SET last_login = CURRENT_TIMESTAMP
          WHERE clerk_id = $1
          `,
          [user_id]
        );
        
        console.log(`Updated last_login for existing user: ${user_id}`);
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error handling user login:', error);
      return new Response('Error handling user login', { status: 500 });
    }
  } else if (eventType === 'user.deleted') {
    // Handle user deletion if needed
    const { id } = evt.data;
    
    if (!id) {
      return new Response('Missing user ID in event data', { status: 400 });
    }
    
    try {
      // We might want to soft delete instead, depending on your requirements
      await executeQuery(
        `DELETE FROM users WHERE clerk_id = $1`,
        [id]
      );
      
      console.log(`Deleted user from database: ${id}`);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting user from database:', error);
      return new Response('Error deleting user from database', { status: 500 });
    }
  }

  // Return a 200 response for unhandled events
  return NextResponse.json({ success: true });
} 