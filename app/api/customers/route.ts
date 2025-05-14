import { executeQuery } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const customers = await executeQuery(
      `
      SELECT 
        c.*,
        COUNT(p.id) as proposal_count
      FROM 
        customers c
      LEFT JOIN 
        proposals p ON c.id = p.customer_id
      GROUP BY 
        c.id
      ORDER BY 
        c.name ASC
    `,
    )

    return NextResponse.json({ success: true, customers })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 })
  }
}
