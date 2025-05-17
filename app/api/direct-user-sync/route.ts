import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { neon } from "@neondatabase/serverless";

// Hardcoded database URL as fallback in case environment variable is missing
const FALLBACK_DB_URL = "postgres://default:Q1IaokPXMxrg@ep-icy-haze-05477472.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require";

// Use direct database connection if needed
const getDirectDbConnection = () => {
  const dbUrl = process.env.DATABASE_URL || FALLBACK_DB_URL;
  return neon(dbUrl);
};

// Helper function to test database connection
async function testDatabaseConnection() {
  try {
    console.log("DIRECT API: Testing database connection...");
    
    try {
      // First try using the executeQuery helper
      const result = await executeQuery(`SELECT NOW() as time`);
      return { 
        success: true, 
        message: `Database connection successful via helper: ${result[0]?.time || 'unknown'}`,
        method: 'helper'
      };
    } catch (helperError) {
      console.log("DIRECT API: Helper connection failed, trying direct connection...", helperError);
      
      // If that fails, try direct connection
      const sql = getDirectDbConnection();
      // Need to use template literals with neon
      const result = await sql`SELECT NOW() as time`;
      return { 
        success: true, 
        message: `Database connection successful via direct: ${result[0]?.time || 'unknown'}`,
        method: 'direct' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    };
  }
}

export async function POST(request: NextRequest) {
  console.log("DIRECT API: Request received");
  
  // First test the database connection
  const dbTest = await testDatabaseConnection();
  console.log("DIRECT API: Database connection test:", dbTest);
  
  if (!dbTest.success) {
    return NextResponse.json(
      { success: false, error: `Database connection failed: ${dbTest.message}` },
      { status: 500 }
    );
  }
  
  // Choose which database method to use based on connection test
  const useDirectConnection = dbTest.method === 'direct';
  const sql = useDirectConnection ? getDirectDbConnection() : null;
  
  try {
    // Get the user ID from the request body
    console.log("DIRECT API: Parsing request body");
    const body = await request.json();
    const { userId, email = 'pending@example.com', name = '' } = body;
    
    console.log("DIRECT API: Request body parsed:", { userId, email, name });
    
    if (!userId) {
      console.log("DIRECT API: Missing user ID in request");
      return NextResponse.json(
        { success: false, error: "Missing user ID" },
        { status: 400 }
      );
    }
    
    console.log("DIRECT API: Starting user sync for", userId);
    
    try {
      // Check if users table exists and create it if needed
      if (useDirectConnection && sql) {
        // Using direct connection
        console.log("DIRECT API: Using direct database connection");
        
        try {
          // Check if table exists
          console.log("DIRECT API: Checking if users table exists (direct)");
          const tableExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'users'
            ) as exists
          `;
          
          console.log("DIRECT API: Table check result (direct):", tableExists);
          
          if (!tableExists[0]?.exists) {
            console.log("DIRECT API: Creating users table (direct)");
            // Create users table if it doesn't exist
            await sql`
              CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                clerk_id VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50),
                metadata JSONB,
                last_login TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              )
            `;
            console.log("DIRECT API: Users table created successfully (direct)");
          }
          
          // Insert or update the user
          console.log("DIRECT API: Inserting/updating user (direct):", userId);
          await sql`
            INSERT INTO users (clerk_id, email, name, last_login)
            VALUES (${userId}, ${email}, ${name}, CURRENT_TIMESTAMP)
            ON CONFLICT (clerk_id) 
            DO UPDATE SET 
              email = ${email},
              name = ${name},
              last_login = CURRENT_TIMESTAMP
          `;
          
          console.log("DIRECT API: User successfully saved to database (direct):", userId);
          
          // Verify the user was stored
          console.log("DIRECT API: Verifying user in database (direct)");
          const verifyUser = await sql`
            SELECT id, clerk_id, email, last_login FROM users WHERE clerk_id = ${userId}
          `;
          
          console.log("DIRECT API: Verification result (direct):", verifyUser);
          
          if (verifyUser.length === 0) {
            console.error("DIRECT API: User verification failed after insert/update (direct)");
            return NextResponse.json(
              { success: false, error: "Failed to verify user in database" },
              { status: 500 }
            );
          }
          
          console.log("DIRECT API: User verified in database (direct):", verifyUser[0]);
          return NextResponse.json({ 
            success: true, 
            message: "User synced successfully",
            user: {
              id: verifyUser[0].id,
              clerk_id: verifyUser[0].clerk_id,
              email: verifyUser[0].email,
              last_login: verifyUser[0].last_login
            }
          });
        } catch (directDbError) {
          console.error("DIRECT API: Direct database error:", directDbError);
          throw directDbError;
        }
      } else {
        // Using executeQuery helper
        console.log("DIRECT API: Using executeQuery helper");
        
        // Check if users table exists
        console.log("DIRECT API: Checking if users table exists");
        const tableExists = await executeQuery(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          ) as exists
        `);
        
        console.log("DIRECT API: Table check result:", tableExists);
        
        if (!tableExists[0]?.exists) {
          console.log("DIRECT API: Creating users table");
          // Create users table if it doesn't exist
          await executeQuery(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              clerk_id VARCHAR(255) NOT NULL UNIQUE,
              email VARCHAR(255) NOT NULL,
              name VARCHAR(255),
              role VARCHAR(50),
              metadata JSONB,
              last_login TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("DIRECT API: Users table created successfully");
        }
        
        // Insert or update the user
        console.log("DIRECT API: Inserting/updating user:", userId);
        await executeQuery(`
          INSERT INTO users (clerk_id, email, name, last_login)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (clerk_id) 
          DO UPDATE SET 
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            last_login = CURRENT_TIMESTAMP
        `, [userId, email, name]);
        
        console.log("DIRECT API: User successfully saved to database:", userId);
        
        // Verify the user was stored
        console.log("DIRECT API: Verifying user in database");
        const verifyUser = await executeQuery(
          `SELECT id, clerk_id, email, last_login FROM users WHERE clerk_id = $1`,
          [userId]
        );
        
        console.log("DIRECT API: Verification result:", verifyUser);
        
        if (verifyUser.length === 0) {
          console.error("DIRECT API: User verification failed after insert/update");
          return NextResponse.json(
            { success: false, error: "Failed to verify user in database" },
            { status: 500 }
          );
        }
        
        console.log("DIRECT API: User verified in database:", verifyUser[0]);
        return NextResponse.json({ 
          success: true, 
          message: "User synced successfully",
          user: {
            id: verifyUser[0].id,
            clerk_id: verifyUser[0].clerk_id,
            email: verifyUser[0].email,
            last_login: verifyUser[0].last_login
          }
        });
      }
    } catch (dbError) {
      console.error("DIRECT API: Database error:", dbError);
      // Log more details about the error
      console.error("DIRECT API: Error details:", {
        name: dbError instanceof Error ? dbError.name : 'Unknown',
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : 'No stack trace'
      });
      
      return NextResponse.json(
        { success: false, error: `Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("DIRECT API: Request processing error:", error);
    // Log more details about the error
    console.error("DIRECT API: Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json(
      { success: false, error: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 