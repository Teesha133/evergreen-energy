"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

interface GarageDoorsData {
  model: string
  width: string
  height: string
  addons: string[]
  quantity: string
  scopeNotes: string
}

interface GarageDoorsProductFormProps {
  data: GarageDoorsData
  updateData: (data: GarageDoorsData) => void
}

export default function GarageDoorsProductForm({ data, updateData }: GarageDoorsProductFormProps) {
  const [formData, setFormData] = useState<GarageDoorsData>({
    model: data.model || "t50l",
    width: data.width || "16",
    height: data.height || "7",
    addons: data.addons || [],
    quantity: data.quantity || "1",
    scopeNotes: data.scopeNotes || generateScopeNotes("t50l", [], "16", "7"),
  })

  const models = [
    { value: "t50l", label: "T50L", description: "Standard non-insulated garage door" },
    { value: "t50s", label: "T50S", description: "Standard non-insulated garage door with windows" },
    { value: "4050", label: "4050", description: "Insulated garage door for energy efficiency" },
    { value: "4053", label: "4053", description: "Insulated garage door with windows" },
  ]

  const addonOptions = [
    { value: "clear-glass", label: "Clear Glass", description: "Clear glass window panels" },
    { value: "obscure-glass", label: "Obscure Glass", description: "Frosted glass for privacy" },
    { value: "liftmaster", label: "LiftMaster Opener", description: "Automatic door opener with remotes" },
  ]

  function generateScopeNotes(model: string, addons: string[], width: string, height: string): string {
    const isInsulated = model === "4050" || model === "4053"
    const hasWindows = model === "t50s" || model === "4053"

    let notes = `Garage Door Installation:\n- Model ${model.toUpperCase()} garage door (${width}' x ${height}')\n`

    if (isInsulated) {
      notes += "- Insulated door for improved energy efficiency\n"
    }

    if (hasWindows) {
      notes += "- Built-in window panels\n"
    }

    notes +=
      "- Remove and dispose of existing garage door\n- Professional installation with all hardware\n- Track and spring system installation\n- Testing and adjustment\n"

    if (addons.includes("clear-glass")) {
      notes += "- Clear glass window upgrade\n"
    }

    if (addons.includes("obscure-glass")) {
      notes += "- Obscure glass window upgrade for privacy\n"
    }

    if (addons.includes("liftmaster")) {
      notes += "- LiftMaster automatic opener with 2 remotes\n- Safety sensors and wall control\n"
    }

    return notes
  }

  const handleChange = (field: keyof GarageDoorsData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      // Auto-generate scope notes when key fields change
      if (field === "model" || field === "addons" || field === "width" || field === "height") {
        newData.scopeNotes = generateScopeNotes(
          field === "model" ? value : prev.model,
          field === "addons" ? value : prev.addons,
          field === "width" ? value : prev.width,
          field === "height" ? value : prev.height,
        )
      }

      return newData
    })
  }

  const handleAddonToggle = (addon: string) => {
    setFormData((prev) => {
      const newAddons = prev.addons.includes(addon) ? prev.addons.filter((a) => a !== addon) : [...prev.addons, addon]

      const newData = { ...prev, addons: newAddons }
      newData.scopeNotes = generateScopeNotes(prev.model, newAddons, prev.width, prev.height)

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
        <h3 className="text-lg font-medium">Garage Door Model</h3>
        <RadioGroup
          value={formData.model}
          onValueChange={(value) => handleChange("model", value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {models.map((model) => (
            <Card
              key={model.value}
              className={`cursor-pointer border ${formData.model === model.value ? "border-rose-600" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <RadioGroupItem
                  value={model.value}
                  id={`model-${model.value}`}
                  className={formData.model === model.value ? "text-rose-600" : ""}
                />
                <div className="flex-1">
                  <Label htmlFor={`model-${model.value}`} className="font-medium cursor-pointer">
                    {model.label}
                  </Label>
                  <p className="text-sm text-gray-500">{model.description}</p>
                  {(model.value === "4050" || model.value === "4053") && (
                    <p className="text-xs text-rose-600 mt-1">Insulated upgrade</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="door-width">Width (feet)</Label>
          <Input
            id="door-width"
            type="number"
            min="8"
            max="20"
            step="1"
            value={formData.width}
            onChange={(e) => handleChange("width", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="door-height">Height (feet)</Label>
          <Input
            id="door-height"
            type="number"
            min="6"
            max="10"
            step="1"
            value={formData.height}
            onChange={(e) => handleChange("height", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="door-quantity">Quantity</Label>
          <Input
            id="door-quantity"
            type="number"
            min="1"
            max="4"
            value={formData.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Add-ons</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {addonOptions.map((addon) => (
            <div key={addon.value} className="flex items-start space-x-3">
              <Checkbox
                id={`addon-${addon.value}`}
                checked={formData.addons.includes(addon.value)}
                onCheckedChange={() => handleAddonToggle(addon.value)}
                className={formData.addons.includes(addon.value) ? "text-rose-600" : ""}
              />
              <div className="space-y-1">
                <Label htmlFor={`addon-${addon.value}`} className="font-medium cursor-pointer">
                  {addon.label}
                </Label>
                <p className="text-sm text-gray-500">{addon.description}</p>
              </div>
            </div>
          ))}
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
