"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface WindowsDoorsData {
  windowType: string
  windowColor: string
  doorTypes: string[]
  windowCount: string
  doorCount: string
  customColors: boolean
  scopeNotes: string
}

interface WindowsDoorsProductFormProps {
  data: WindowsDoorsData
  updateData: (data: WindowsDoorsData) => void
}

export default function WindowsDoorsProductForm({ data, updateData }: WindowsDoorsProductFormProps) {
  const [formData, setFormData] = useState<WindowsDoorsData>({
    windowType: data.windowType || "vinyl",
    windowColor: data.windowColor || "white",
    doorTypes: data.doorTypes || [],
    windowCount: data.windowCount || "0",
    doorCount: data.doorCount || "0",
    customColors: data.customColors || false,
    scopeNotes: data.scopeNotes || generateScopeNotes("vinyl", "white", [], false),
  })

  const windowTypes = [
    { value: "vinyl", label: "Vinyl", description: "Durable, low-maintenance vinyl windows" },
    { value: "dual-pane", label: "Dual Pane", description: "Energy-efficient dual pane glass" },
    { value: "retrofit", label: "Retrofit", description: "Replacement windows for existing frames" },
  ]

  const windowColors = [
    { value: "white", label: "Standard White" },
    { value: "bronze", label: "Bronze", premium: true },
    { value: "black", label: "Black", premium: true },
    { value: "tan", label: "Tan", premium: true },
  ]

  const doorOptions = [
    { value: "slider", label: "Slider Door", description: "Horizontal sliding glass door" },
    { value: "patio", label: "Patio Door", description: "Hinged patio door with glass panels" },
    { value: "french", label: "French Door", description: "Double door with glass panels" },
    { value: "entry", label: "Entry Door", description: "Front entry door" },
    { value: "interior", label: "Interior Door", description: "Interior passage door" },
  ]

  function generateScopeNotes(
    windowType: string,
    windowColor: string,
    doorTypes: string[],
    customColors: boolean,
  ): string {
    let notes = ""

    if (windowType) {
      notes += `Window Installation:\n- ${windowType.charAt(0).toUpperCase() + windowType.slice(1)} windows with ${
        windowColor
      } frames\n- Custom order to fit existing openings\n- Remove and dispose of existing windows\n- Professional installation with proper sealing and caulking\n- Clean up and haul away of all debris\n`

      if (customColors && windowColor !== "white") {
        notes += "- Premium color upgrade\n"
      }
    }

    if (doorTypes.length > 0) {
      notes += "\nDoor Installation:\n"
      doorTypes.forEach((type) => {
        notes += `- ${type.charAt(0).toUpperCase() + type.slice(1)} door installation\n`
      })
      notes +=
        "- Remove and dispose of existing doors\n- Professional installation with proper sealing\n- Hardware installation and adjustment\n"
    }

    return notes
  }

  const handleChange = (field: keyof WindowsDoorsData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      // Auto-generate scope notes when key fields change
      if (field === "windowType" || field === "windowColor" || field === "doorTypes" || field === "customColors") {
        newData.scopeNotes = generateScopeNotes(
          field === "windowType" ? value : prev.windowType,
          field === "windowColor" ? value : prev.windowColor,
          field === "doorTypes" ? value : prev.doorTypes,
          field === "customColors" ? value : prev.customColors,
        )
      }

      return newData
    })
  }

  const handleDoorToggle = (door: string) => {
    setFormData((prev) => {
      const newDoorTypes = prev.doorTypes.includes(door)
        ? prev.doorTypes.filter((d) => d !== door)
        : [...prev.doorTypes, door]

      const newData = { ...prev, doorTypes: newDoorTypes }
      newData.scopeNotes = generateScopeNotes(prev.windowType, prev.windowColor, newDoorTypes, prev.customColors)

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
      <Tabs defaultValue="windows" className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="windows" className="flex-1">
            Windows
          </TabsTrigger>
          <TabsTrigger value="doors" className="flex-1">
            Doors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="windows" className="pt-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Window Type</h3>
            <RadioGroup
              value={formData.windowType}
              onValueChange={(value) => handleChange("windowType", value)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {windowTypes.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer border ${formData.windowType === type.value ? "border-rose-600" : ""}`}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <RadioGroupItem
                      value={type.value}
                      id={`window-${type.value}`}
                      className={formData.windowType === type.value ? "text-rose-600" : ""}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`window-${type.value}`} className="font-medium cursor-pointer">
                        {type.label}
                      </Label>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Window Color</h3>
            <RadioGroup
              value={formData.windowColor}
              onValueChange={(value) => handleChange("windowColor", value)}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {windowColors.map((color) => (
                <Card
                  key={color.value}
                  className={`cursor-pointer border ${formData.windowColor === color.value ? "border-rose-600" : ""}`}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <RadioGroupItem
                      value={color.value}
                      id={`color-${color.value}`}
                      className={formData.windowColor === color.value ? "text-rose-600" : ""}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`color-${color.value}`} className="font-medium cursor-pointer">
                        {color.label}
                      </Label>
                      {color.premium && <p className="text-xs text-rose-600">Premium option</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="window-count">Number of Windows</Label>
            <Input
              id="window-count"
              type="number"
              min="0"
              value={formData.windowCount}
              onChange={(e) => handleChange("windowCount", e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="custom-colors"
              checked={formData.customColors}
              onCheckedChange={(checked) => handleChange("customColors", checked)}
              className={formData.customColors ? "text-rose-600" : ""}
            />
            <div className="space-y-1">
              <Label htmlFor="custom-colors" className="font-medium cursor-pointer">
                Premium Color Upgrade
              </Label>
              <p className="text-sm text-gray-500">Additional charge for non-standard colors</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="doors" className="pt-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Door Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doorOptions.map((door) => (
                <div key={door.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={`door-${door.value}`}
                    checked={formData.doorTypes.includes(door.value)}
                    onCheckedChange={() => handleDoorToggle(door.value)}
                    className={formData.doorTypes.includes(door.value) ? "text-rose-600" : ""}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`door-${door.value}`} className="font-medium cursor-pointer">
                      {door.label}
                    </Label>
                    <p className="text-sm text-gray-500">{door.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="door-count">Number of Doors</Label>
            <Input
              id="door-count"
              type="number"
              min="0"
              value={formData.doorCount}
              onChange={(e) => handleChange("doorCount", e.target.value)}
              className="max-w-xs"
            />
          </div>
        </TabsContent>
      </Tabs>

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
