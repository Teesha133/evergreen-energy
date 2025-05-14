"use server"

import { executeQuery } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Get dashboard metrics
export async function getDashboardMetrics() {
  try {
    // Count total proposals
    const totalProposalsResult = await executeQuery(`
      SELECT COUNT(*) as count FROM proposals
    `)
    const totalProposals = Number.parseInt(totalProposalsResult[0].count) || 0

    // Count active customers
    const activeCustomersResult = await executeQuery(`
      SELECT COUNT(DISTINCT customer_id) as count FROM proposals
    `)
    const activeCustomers = Number.parseInt(activeCustomersResult[0].count) || 0

    // Calculate conversion rate (signed proposals / total proposals)
    const conversionRateResult = await executeQuery(`
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND((COUNT(*) FILTER (WHERE status = 'signed' OR status = 'completed')) * 100.0 / COUNT(*), 1)
        END as rate
      FROM proposals
    `)
    const conversionRate = Number.parseFloat(conversionRateResult[0].rate) || 0

    return {
      totalProposals,
      activeCustomers,
      conversionRate,
    }
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return {
      totalProposals: 0,
      activeCustomers: 0,
      conversionRate: 0,
    }
  }
}

// Get recent proposals
export async function getRecentProposals(limit = 5) {
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
      GROUP BY 
        p.id, c.name
      ORDER BY 
        p.created_at DESC
      LIMIT $1
    `,
      [limit],
    )

    return proposals
  } catch (error) {
    console.error("Error fetching recent proposals:", error)
    return []
  }
}

// Get proposal by ID
export async function getProposalById(id: string) {
  try {
    // Get proposal details
    const proposalResult = await executeQuery(
      `
      SELECT 
        p.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address
      FROM 
        proposals p
      JOIN 
        customers c ON p.customer_id = c.id
      WHERE 
        p.id = $1
    `,
      [id],
    )

    if (proposalResult.length === 0) {
      return null
    }

    const proposal = proposalResult[0]

    // Get services for this proposal
    const servicesResult = await executeQuery(
      `
      SELECT 
        s.name,
        s.display_name
      FROM 
        proposal_services ps
      JOIN 
        services s ON ps.service_id = s.id
      WHERE 
        ps.proposal_id = $1
    `,
      [id],
    )

    // Get products for this proposal
    const productsResult = await executeQuery(
      `
      SELECT 
        p.service_id,
        s.name as service_name,
        p.product_data,
        p.scope_notes
      FROM 
        products p
      JOIN 
        services s ON p.service_id = s.id
      WHERE 
        p.proposal_id = $1
    `,
      [id],
    )

    // Format the response
    return {
      id: proposal.id,
      proposalNumber: proposal.proposal_number,
      customer: {
        name: proposal.customer_name,
        email: proposal.customer_email,
        phone: proposal.customer_phone,
        address: proposal.customer_address,
      },
      services: servicesResult.map((s) => s.name),
      serviceNames: servicesResult.map((s) => s.display_name),
      products: productsResult.reduce((acc, product) => {
        acc[product.service_name] = {
          ...product.product_data,
          scopeNotes: product.scope_notes,
        }
        return acc
      }, {}),
      pricing: {
        subtotal: Number.parseFloat(proposal.subtotal),
        discount: Number.parseFloat(proposal.discount),
        total: Number.parseFloat(proposal.total),
        monthlyPayment: Number.parseFloat(proposal.monthly_payment) || 0,
        financingTerm: proposal.financing_term || 60,
        interestRate: Number.parseFloat(proposal.interest_rate) || 5.99,
      },
      status: proposal.status,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      sentAt: proposal.sent_at,
      viewedAt: proposal.viewed_at,
      signedAt: proposal.signed_at,
      completedAt: proposal.completed_at,
    }
  } catch (error) {
    console.error("Error fetching proposal:", error)
    return null
  }
}

// Create a new proposal
export async function createProposal(data: any) {
  try {
    // Start a transaction
    await executeQuery("BEGIN")

    // 1. Create or update customer
    const customerResult = await executeQuery(
      `
      INSERT INTO customers (name, email, phone, address)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
      [data.customer.name, data.customer.email, data.customer.phone, data.customer.address],
    )

    const customerId = customerResult[0].id

    // 2. Generate a proposal number
    const proposalNumber = `PRO-${Math.floor(10000 + Math.random() * 90000)}`

    // 3. Create the proposal
    const proposalResult = await executeQuery(
      `
      INSERT INTO proposals (
        proposal_number, customer_id, status, subtotal, discount, total, 
        monthly_payment, financing_term, interest_rate, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `,
      [
        proposalNumber,
        customerId,
        "draft",
        data.pricing.subtotal,
        data.pricing.discount,
        data.pricing.total,
        data.pricing.monthlyPayment,
        data.pricing.financingTerm || 60,
        data.pricing.interestRate || 5.99,
        data.createdBy || "system",
      ],
    )

    const proposalId = proposalResult[0].id

    // 4. Add services to the proposal
    for (const serviceName of data.services) {
      // Get service ID
      const serviceResult = await executeQuery(
        `
        SELECT id FROM services WHERE name = $1
      `,
        [serviceName],
      )

      if (serviceResult.length > 0) {
        const serviceId = serviceResult[0].id

        // Add to proposal_services
        await executeQuery(
          `
          INSERT INTO proposal_services (proposal_id, service_id)
          VALUES ($1, $2)
        `,
          [proposalId, serviceId],
        )

        // Add product data if available
        if (data.products && data.products[serviceName]) {
          const productData = data.products[serviceName]
          const scopeNotes = productData.scopeNotes || ""

          // Remove scopeNotes from productData to avoid duplication
          const { scopeNotes: _, ...productDataWithoutNotes } = productData

          await executeQuery(
            `
            INSERT INTO products (proposal_id, service_id, product_data, scope_notes)
            VALUES ($1, $2, $3, $4)
          `,
            [proposalId, serviceId, JSON.stringify(productDataWithoutNotes), scopeNotes],
          )
        }
      }
    }

    // 5. Log the activity
    await executeQuery(
      `
      INSERT INTO activity_log (proposal_id, user_id, action, details)
      VALUES ($1, $2, $3, $4)
    `,
      [proposalId, data.createdBy || "system", "create_proposal", JSON.stringify({ proposalNumber })],
    )

    // Commit the transaction
    await executeQuery("COMMIT")

    // Revalidate the dashboard path to update metrics
    revalidatePath("/dashboard")

    return {
      success: true,
      proposalId,
      proposalNumber,
    }
  } catch (error) {
    // Rollback on error
    await executeQuery("ROLLBACK")
    console.error("Error creating proposal:", error)
    return {
      success: false,
      error: "Failed to create proposal",
    }
  }
}

// Update proposal status
export async function updateProposalStatus(id: string, status: string, userId?: string) {
  try {
    let updateFields = ""
    const params = [id, status]

    // Set appropriate timestamp based on status
    switch (status) {
      case "sent":
        updateFields = ", sent_at = CURRENT_TIMESTAMP"
        break
      case "viewed":
        updateFields = ", viewed_at = CURRENT_TIMESTAMP"
        break
      case "signed":
        updateFields = ", signed_at = CURRENT_TIMESTAMP"
        break
      case "completed":
        updateFields = ", completed_at = CURRENT_TIMESTAMP"
        break
    }

    await executeQuery(
      `
      UPDATE proposals
      SET status = $2, updated_at = CURRENT_TIMESTAMP ${updateFields}
      WHERE id = $1
    `,
      params,
    )

    // Log the activity
    await executeQuery(
      `
      INSERT INTO activity_log (proposal_id, user_id, action, details)
      VALUES ($1, $2, $3, $4)
    `,
      [id, userId || "system", `update_status_${status}`, JSON.stringify({ status })],
    )

    // Revalidate the dashboard path to update metrics
    revalidatePath("/dashboard")
    revalidatePath(`/proposals/view/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error updating proposal status:", error)
    return { success: false, error: "Failed to update proposal status" }
  }
}

// Get all services
export async function getAllServices() {
  try {
    const services = await executeQuery(`
      SELECT * FROM services ORDER BY display_name
    `)
    return services
  } catch (error) {
    console.error("Error fetching services:", error)
    return []
  }
}

// Mark proposal as sent
export async function markProposalAsSent(proposalId: string) {
  try {
    await executeQuery(
      `
      UPDATE proposals
      SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [proposalId]
    );

    // Log the activity
    await executeQuery(
      `
      INSERT INTO activity_log (proposal_id, user_id, action, details)
      VALUES ($1, $2, $3, $4)
      `,
      [proposalId, "system", "send_proposal_email", JSON.stringify({ method: "api" })]
    );

    return { success: true };
  } catch (error) {
    console.error("Error marking proposal as sent:", error);
    return { success: false, error: "Failed to update proposal status" };
  }
}
