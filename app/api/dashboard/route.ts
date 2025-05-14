import { executeQuery, sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get total proposals count
    const totalProposalsResult = await sql`
      SELECT COUNT(*) as total FROM proposals
    `
    const totalProposals = totalProposalsResult[0]?.total || 0

    // Get active customers count (customers with at least one non-completed/cancelled proposal)
    const activeCustomersResult = await sql`
      SELECT COUNT(DISTINCT customer_id) as active 
      FROM proposals 
      WHERE status NOT IN ('completed', 'cancelled')
    `
    const activeCustomers = activeCustomersResult[0]?.active || 0

    // Get conversion rate (signed / total)
    const conversionRateResult = await sql`
      SELECT 
        COUNT(CASE WHEN status = 'signed' OR status = 'completed' THEN 1 END) as converted,
        COUNT(*) as total,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN status = 'signed' OR status = 'completed' THEN 1 END) * 100.0 / COUNT(*))::numeric, 1)
          ELSE 0 
        END as rate
      FROM proposals
    `
    const conversionRate = conversionRateResult[0]?.rate || 0

    return NextResponse.json({
      success: true,
      metrics: {
        totalProposals,
        activeCustomers,
        conversionRate
      }
    })
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard metrics" }, { status: 500 })
  }
} 