import { executeQuery } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
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
        p.status NOT IN ('completed', 'cancelled', 'rejected')
      GROUP BY 
        p.id, c.name
      ORDER BY 
        p.created_at DESC
    `,
    )

    return NextResponse.json({ success: true, proposals })
  } catch (error) {
    console.error("Error fetching active proposals:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch active proposals" }, { status: 500 })
  }
} 