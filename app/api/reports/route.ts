import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Helper to format date for SQL queries
const formatDateForSQL = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split("T")[0]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "30"
    const daysAgo = Number.parseInt(timeRange)

    const startDate = formatDateForSQL(daysAgo)

    // Fetch proposal status distribution
    const statusDistribution = await sql`
      SELECT status, COUNT(*) as count
      FROM proposals
      WHERE created_at >= ${startDate}
      GROUP BY status
      ORDER BY count DESC
    `

    // Fetch revenue trend (monthly)
    const revenueTrend = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(total) as revenue
      FROM proposals
      WHERE created_at >= ${startDate}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `

    // Fetch popular services
    const popularServices = await sql`
      SELECT 
        s.name as product_type, 
        COUNT(*) as count
      FROM proposal_services ps
      JOIN proposals p ON p.id = ps.proposal_id
      JOIN services s ON s.id = ps.service_id
      WHERE p.created_at >= ${startDate}
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 5
    `

    // Fetch conversion rate
    const conversionRate = await sql`
      WITH proposal_counts AS (
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed
        FROM proposals
        WHERE created_at >= ${startDate}
        GROUP BY DATE_TRUNC('week', created_at)
      )
      SELECT 
        week,
        total,
        signed,
        CASE 
          WHEN total > 0 THEN (signed * 100.0 / total)::numeric(10,2)
          ELSE 0 
        END as rate
      FROM proposal_counts
      ORDER BY week
    `

    return NextResponse.json({
      statusDistribution,
      revenueTrend,
      popularServices,
      conversionRate,
    })
  } catch (error) {
    console.error("Error fetching report data:", error)
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 })
  }
}
