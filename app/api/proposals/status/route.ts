import { executeQuery } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    
    if (!status) {
      return NextResponse.json({ 
        success: false, 
        error: "Status parameter is required" 
      }, { status: 400 })
    }
    
    const proposals = await executeQuery(
      `
      SELECT 
        p.id, 
        p.proposal_number, 
        c.name as customer_name, 
        p.status, 
        p.total, 
        p.created_at,
        ARRAY_AGG(s.display_name) as services
      FROM 
        proposals p
      JOIN 
        customers c ON p.customer_id = c.id
      LEFT JOIN 
        proposal_services ps ON p.id = ps.proposal_id
      LEFT JOIN 
        services s ON ps.service_id = s.id
      WHERE 
        p.status = $1
      GROUP BY 
        p.id, c.name
      ORDER BY 
        p.created_at DESC
    `,
      [status]
    )

    return NextResponse.json({ success: true, proposals })
  } catch (error) {
    console.error(`Error fetching proposals with status:`, error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch proposals" 
    }, { status: 500 })
  }
} 