"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface RoofingData {
  material: string
  addGutters: boolean
  gutterLength: string
  pricePerSquare: string
  showPricing: boolean
  scopeNotes: string
}

interface RoofingProductFormProps {
  data: RoofingData
  updateData: (data: RoofingData) => void
}

export default function RoofingProductForm({ data, updateData }: RoofingProductFormProps) {
  const hasUpdatedRef = useRef(false)

  // Generate scope notes function
  function generateScopeNotes(material: string, gutters: boolean): string {
    let notes = `Complete roof replacement with ${material === "shingles" ? "GAF architectural shingles" : material} including:
- Removal of existing roofing material down to the deck
- Inspection and replacement of damaged decking (if necessary)
- Installation of synthetic underlayment
- Installation of ice and water shield in valleys and around penetrations
- Installation of new ${material === "shingles" ? "GAF architectural shingles" : material}
- Installation of ridge vents for proper attic ventilation
- Complete cleanup and haul away of all debris`

    if (gutters) {
      notes += `\n\nAdditional gutter work:
- Remove existing gutters and downspouts
- Install new seamless gutters and downspouts
- Ensure proper drainage away from foundation`
    }

    return notes
  }

  // Initialize state with proper defaults
  const [formData, setFormData] = useState<RoofingData>(() => {
    const material = data.material || "shingles"
    const addGutters = data.addGutters || false

    return {
      material,
      addGutters,
      gutterLength: data.gutterLength || "",
      pricePerSquare: data.pricePerSquare || "",
      showPricing: data.showPricing !== undefined ? data.showPricing : true,
      scopeNotes: data.scopeNotes || generateScopeNotes(material, addGutters),
    }
  })

  // Handle form field changes
  const handleChange = useCallback((field: keyof RoofingData, value: any) => {
    setFormData((prev) => {
      // If value hasn't changed, don't update
      if (prev[field] === value) return prev

      const newData = { ...prev, [field]: value }

      // Auto-generate scope notes when material or gutters change
      if (field === "material" || field === "addGutters") {
        newData.scopeNotes = generateScopeNotes(
          field === "material" ? value : prev.material,
          field === "addGutters" ? value : prev.addGutters,
        )
      }

      // Mark that we need to update the parent
      hasUpdatedRef.current = false

      return newData
    })
  }, [])

  // Update parent component when form data changes
  useEffect(() => {
    // Skip if we've already updated with this data
    if (hasUpdatedRef.current) return

    // Only update if data has actually changed
    if (JSON.stringify(formData) !== JSON.stringify(data)) {
      updateData(formData)
      hasUpdatedRef.current = true
    }
  }, [formData, data, updateData])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Roofing Material</h3>
        <RadioGroup
          value={formData.material}
          onValueChange={(value) => handleChange("material", value)}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {[
            { value: "shingles", label: "Shingles (GAF)", description: "Architectural asphalt shingles" },
            { value: "tile", label: "Tile", description: "Concrete or clay roof tiles" },
            { value: "tpo", label: "TPO", description: "Thermoplastic polyolefin membrane" },
            { value: "tar-gravel", label: "Tar & Gravel", description: "Built-up roofing system" },
            { value: "metal", label: "Metal", description: "Standing seam metal roofing" },
          ].map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer border ${formData.material === option.value ? "border-rose-600" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <RadioGroupItem
                  value={option.value}
                  id={`material-${option.value}`}
                  className={formData.material === option.value ? "text-rose-600" : ""}
                />
                <div className="flex-1">
                  <Label htmlFor={`material-${option.value}`} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Add-ons</h3>
        <div className="flex items-start space-x-3">
          <Checkbox
            id="add-gutters"
            checked={formData.addGutters}
            onCheckedChange={(checked) => handleChange("addGutters", !!checked)}
            className={formData.addGutters ? "text-rose-600" : ""}
          />
          <div className="space-y-1">
            <Label htmlFor="add-gutters" className="font-medium cursor-pointer">
              Gutters & Downspouts
            </Label>
            <p className="text-sm text-gray-500">New seamless gutters and downspouts</p>
          </div>
        </div>

        {formData.addGutters && (
          <div className="pl-7 space-y-2">
            <Label htmlFor="gutter-length">Linear Feet</Label>
            <Input
              id="gutter-length"
              placeholder="Enter linear feet"
              value={formData.gutterLength}
              onChange={(e) => handleChange("gutterLength", e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Pricing</h3>
          <div className="flex items-center space-x-2">
            <Label htmlFor="show-pricing">Show to customer</Label>
            <Switch
              id="show-pricing"
              checked={formData.showPricing}
              onCheckedChange={(checked) => handleChange("showPricing", checked)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price-per-square">Price per Square</Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="price-per-square"
              placeholder="0.00"
              value={formData.pricePerSquare}
              onChange={(e) => handleChange("pricePerSquare", e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Scope Description</h3>
        <Textarea
          value={formData.scopeNotes}
          onChange={(e) => handleChange("scopeNotes", e.target.value)}
          rows={10}
          className="font-mono text-sm"
        />
      </div>
    </div>
  )
}
