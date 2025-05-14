"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

interface PaintData {
  serviceType: string
  squareFootage: string
  coats: string
  includePaint: boolean
  includePrimer: boolean
  includePrep: boolean
  scopeNotes: string
}

interface PaintProductFormProps {
  data: PaintData
  updateData: (data: PaintData) => void
}

export default function PaintProductForm({ data, updateData }: PaintProductFormProps) {
  const [formData, setFormData] = useState<PaintData>({
    serviceType: data.serviceType || "exterior",
    squareFootage: data.squareFootage || "",
    coats: data.coats || "2",
    includePaint: data.includePaint || false,
    includePrimer: data.includePrimer || true,
    includePrep: data.includePrep || true,
    scopeNotes: data.scopeNotes || generateScopeNotes("exterior", "2", true, true, false),
  })

  const serviceTypes = [
    { value: "exterior", label: "Exterior", description: "Exterior house painting" },
    { value: "interior", label: "Interior", description: "Interior room painting" },
    { value: "both", label: "Both", description: "Complete interior and exterior painting" },
  ]

  function generateScopeNotes(
    serviceType: string,
    coats: string,
    includePrep: boolean,
    includePrimer: boolean,
    includePaint: boolean,
  ): string {
    let notes = `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Painting Services:\n`

    if (includePrep) {
      notes += "- Surface preparation including cleaning, scraping, and sanding\n"
      if (serviceType === "exterior" || serviceType === "both") {
        notes += "- Pressure washing of exterior surfaces\n"
      }
      notes += "- Repair of minor surface imperfections\n"
      notes += "- Masking and protection of non-painted surfaces\n"
    }

    if (includePrimer) {
      notes += "- Application of primer to prepared surfaces\n"
    }

    notes += `- Application of ${coats} coat${coats !== "1" ? "s" : ""} of paint\n`

    if (includePaint) {
      notes += "- Paint provided by contractor\n"
    } else {
      notes += "- Color to be chosen by homeowner; paint provided by homeowner unless agreed otherwise\n"
    }

    notes += "- Clean up and removal of all painting materials\n"
    notes += "- Final inspection with homeowner\n"

    return notes
  }

  const handleChange = (field: keyof PaintData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      // Auto-generate scope notes when key fields change
      if (
        field === "serviceType" ||
        field === "coats" ||
        field === "includePrep" ||
        field === "includePrimer" ||
        field === "includePaint"
      ) {
        newData.scopeNotes = generateScopeNotes(
          field === "serviceType" ? value : prev.serviceType,
          field === "coats" ? value : prev.coats,
          field === "includePrep" ? value : prev.includePrep,
          field === "includePrimer" ? value : prev.includePrimer,
          field === "includePaint" ? value : prev.includePaint,
        )
      }

      return newData
    })
  }

  useEffect(() => {
    // Avoid unnecessary updates that could cause render loops
    const currentFormDataString = JSON.stringify(formData)
    const newDataString = JSON.stringify(data)

    if (currentFormDataString !== newDataString) {
      updateData(formData)
    }
  }, [formData, updateData, data])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Service Type</h3>
        <RadioGroup
          value={formData.serviceType}
          onValueChange={(value) => handleChange("serviceType", value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {serviceTypes.map((service) => (
            <Card
              key={service.value}
              className={`cursor-pointer border ${formData.serviceType === service.value ? "border-rose-600" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <RadioGroupItem
                  value={service.value}
                  id={`service-${service.value}`}
                  className={formData.serviceType === service.value ? "text-rose-600" : ""}
                />
                <div className="flex-1">
                  <Label htmlFor={`service-${service.value}`} className="font-medium cursor-pointer">
                    {service.label}
                  </Label>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="square-footage">Square Footage</Label>
          <Input
            id="square-footage"
            type="number"
            min="0"
            placeholder="Enter square footage"
            value={formData.squareFootage}
            onChange={(e) => handleChange("squareFootage", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coats">Number of Coats</Label>
          <RadioGroup
            id="coats"
            value={formData.coats}
            onValueChange={(value) => handleChange("coats", value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="coats-1" />
              <Label htmlFor="coats-1">1 Coat</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="coats-2" />
              <Label htmlFor="coats-2">2 Coats</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="coats-3" />
              <Label htmlFor="coats-3">3 Coats</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="include-prep"
              checked={formData.includePrep}
              onCheckedChange={(checked) => handleChange("includePrep", checked)}
              className={formData.includePrep ? "text-rose-600" : ""}
            />
            <div className="space-y-1">
              <Label htmlFor="include-prep" className="font-medium cursor-pointer">
                Surface Preparation
              </Label>
              <p className="text-sm text-gray-500">Cleaning, scraping, and sanding</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="include-primer"
              checked={formData.includePrimer}
              onCheckedChange={(checked) => handleChange("includePrimer", checked)}
              className={formData.includePrimer ? "text-rose-600" : ""}
            />
            <div className="space-y-1">
              <Label htmlFor="include-primer" className="font-medium cursor-pointer">
                Include Primer
              </Label>
              <p className="text-sm text-gray-500">Apply primer before paint</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="include-paint"
              checked={formData.includePaint}
              onCheckedChange={(checked) => handleChange("includePaint", checked)}
              className={formData.includePaint ? "text-rose-600" : ""}
            />
            <div className="space-y-1">
              <Label htmlFor="include-paint" className="font-medium cursor-pointer">
                Include Paint
              </Label>
              <p className="text-sm text-gray-500">Contractor provides paint</p>
            </div>
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
