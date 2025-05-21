import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

interface PricingItem {
  plan_number: string;
  rate_name: string;
  payment_factor: number;
  merchant_fee: number;
  notes?: string;
  visible?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pricingItems: PricingItem[] = body.pricingItems;

    if (!Array.isArray(pricingItems) || pricingItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty pricing data" },
        { status: 400 }
      );
    }

    // Process each pricing item
    const results = [];
    let inserted = 0;
    let updated = 0;

    for (const item of pricingItems) {
      // Validate the item
      if (!item.rate_name) {
        continue; // Skip invalid items
      }

      // Check if this pricing item already exists (by plan_number and rate_name)
      const existingItems = await executeQuery(
        `
        SELECT id FROM pricing 
        WHERE 
          plan_number = $1 
          AND rate_name = $2
        `,
        [item.plan_number || '', item.rate_name]
      );

      let result;

      if (existingItems.length > 0) {
        // Update existing item
        const id = existingItems[0].id;
        result = await executeQuery(
          `
          UPDATE pricing
          SET
            payment_factor = $3,
            merchant_fee = $4,
            notes = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            item.payment_factor || 0,
            item.merchant_fee || 0,
            item.notes || null
          ]
        );
        updated++;
      } else {
        // Insert new item
        result = await executeQuery(
          `
          INSERT INTO pricing (
            plan_number, rate_name, payment_factor, merchant_fee, notes, visible
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
          `,
          [
            item.plan_number || null,
            item.rate_name,
            item.payment_factor || 0,
            item.merchant_fee || 0,
            item.notes || null,
            item.visible !== undefined ? item.visible : true
          ]
        );
        inserted++;
      }

      if (result && result.length > 0) {
        results.push(result[0]);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Imported ${pricingItems.length} items: ${inserted} inserted, ${updated} updated`,
        items: results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error importing pricing data:", error);
    return NextResponse.json(
      { error: "Failed to import pricing data" },
      { status: 500 }
    );
  }
} 