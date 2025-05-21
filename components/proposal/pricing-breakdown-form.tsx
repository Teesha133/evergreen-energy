"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface PricingData {
  subtotal: number
  discount: number
  total: number
  monthlyPayment: number
  showLineItems: boolean
  financingTerm: number
  interestRate: number
}

interface PricingBreakdownFormProps {
  services: string[]
  products: any
  data: Partial<PricingData>
  updateData: (data: Partial<PricingData>) => void
}

function PricingBreakdownForm({ services, products, data, updateData }: PricingBreakdownFormProps) {
  // Use a ref to track if we've already updated the parent
  const hasUpdatedRef = useRef(false)

  // Calculate initial values only once
  const initialSubtotal = useRef(calculateSubtotal(services))
  const initialDiscount = useRef(calculateDiscount(services))

  // Initialize state with proper initial values
  const [formData, setFormData] = useState<PricingData>(() => {
    const subtotal = data.subtotal !== undefined ? data.subtotal : initialSubtotal.current
    const discount = data.discount !== undefined ? data.discount : initialDiscount.current
    const total = subtotal - discount
    const term = data.financingTerm || 60
    const rate = data.interestRate || 5.99

    return {
      subtotal,
      discount,
      total,
      monthlyPayment: calculateMonthlyPayment(total, term, rate),
      showLineItems: data.showLineItems !== undefined ? data.showLineItems : true,
      financingTerm: term,
      interestRate: rate,
    }
  })

  // Calculate subtotal based on services
  function calculateSubtotal(serviceList: string[]): number {
    let subtotal = 0
    if (serviceList.includes("roofing")) subtotal += 12500
    if (serviceList.includes("hvac")) subtotal += 8500
    if (serviceList.includes("windows-doors")) subtotal += 6800
    if (serviceList.includes("garage-doors")) subtotal += 2200
    if (serviceList.includes("paint")) subtotal += 4500
    return subtotal
  }

  // Calculate discount based on services
  function calculateDiscount(serviceList: string[]): number {
    let discount = 0
    if (serviceList.includes("roofing") && serviceList.includes("windows-doors")) {
      discount += 0.05 * (12500 + 6800)
    }
    if (serviceList.includes("hvac") && serviceList.length > 1) {
      discount += 0.03 * 8500
    }
    return discount
  }

  // Calculate monthly payment
  function calculateMonthlyPayment(total: number, term: number, rate: number): number {
    if (term === 0 || rate === 0) return 0
    const monthlyRate = rate / 100 / 12
    if (monthlyRate === 0) return total / term
    const numerator = total * monthlyRate * Math.pow(1 + monthlyRate, term)
    const denominator = Math.pow(1 + monthlyRate, term) - 1
    return denominator === 0 ? 0 : numerator / denominator
  }

  // Handle user input changes
  const handleChange = useCallback((field: keyof PricingData, value: any) => {
    setFormData((prev) => {
      // If the value hasn't changed, don't update state
      if (prev[field] === value) return prev

      const newData = { ...prev, [field]: value }

      // Recalculate total and monthly payment when relevant fields change
      if (field === "subtotal" || field === "discount") {
        const total = field === "subtotal" ? value - prev.discount : prev.subtotal - value
        newData.total = total
        newData.monthlyPayment = calculateMonthlyPayment(total, prev.financingTerm, prev.interestRate)
      } else if (field === "financingTerm" || field === "interestRate") {
        newData.monthlyPayment = calculateMonthlyPayment(
          prev.total,
          field === "financingTerm" ? value : prev.financingTerm,
          field === "interestRate" ? value : prev.interestRate,
        )
      }

      return newData
    })

    // Mark that we need to update the parent
    hasUpdatedRef.current = false
  }, [])

  // Update subtotal and discount when services change
  useEffect(() => {
    // Skip this effect on initial render
    const newSubtotal = calculateSubtotal(services)
    const newDiscount = calculateDiscount(services)

    // Only update if values have actually changed significantly
    if (Math.abs(formData.subtotal - newSubtotal) > 0.01 || Math.abs(formData.discount - newDiscount) > 0.01) {
      const newTotal = newSubtotal - newDiscount
      setFormData((prev) => ({
        ...prev,
        subtotal: newSubtotal,
        discount: newDiscount,
        total: newTotal,
        monthlyPayment: calculateMonthlyPayment(newTotal, prev.financingTerm, prev.interestRate),
      }))

      // Mark that we need to update the parent
      hasUpdatedRef.current = false
    }
  }, [services, formData.subtotal, formData.discount])

  // Notify parent component of changes, but only when necessary
  useEffect(() => {
    // If we've already updated the parent with this data, skip
    if (hasUpdatedRef.current) return

    // Create a copy of the data to compare
    const currentData = {
      subtotal: formData.subtotal,
      discount: formData.discount,
      total: formData.total,
      monthlyPayment: formData.monthlyPayment,
      showLineItems: formData.showLineItems,
      financingTerm: formData.financingTerm,
      interestRate: formData.interestRate,
    }

    // Only update if data has actually changed
    if (JSON.stringify(currentData) !== JSON.stringify(data)) {
      updateData(currentData)
      hasUpdatedRef.current = true
    }
  }, [formData, updateData, data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Pricing Breakdown</h3>
        <div className="flex items-center space-x-2">
          <Label htmlFor="show-line-items">Show line items to customer</Label>
          <Switch
            id="show-line-items"
            checked={formData.showLineItems}
            onCheckedChange={(checked) => handleChange("showLineItems", checked)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {services.length > 1 && (
            <Alert className="bg-green-50 border-green-200">
              <InfoIcon className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Smart bundle discount applied! Combining {services.join(" and ")} saves the customer money.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  value={formData.subtotal.toFixed(2)}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value) || 0
                    handleChange("subtotal", value)
                  }}
                  className="pl-8 text-right"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Discount</span>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  value={formData.discount.toFixed(2)}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value) || 0
                    handleChange("discount", value)
                  }}
                  className="pl-8 text-right"
                />
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center font-bold">
              <span>Total</span>
              <span className="text-xl">${formData.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Monthly Payment Calculator</h3>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="financing-term">Financing Term (months)</Label>
                  <span className="font-medium">{formData.financingTerm} months</span>
                </div>
                <Slider
                  id="financing-term"
                  min={12}
                  max={120}
                  step={12}
                  value={[formData.financingTerm]}
                  onValueChange={(value) => handleChange("financingTerm", value[0])}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="interest-rate">Interest Rate</Label>
                  <span className="font-medium">{formData.interestRate}%</span>
                </div>
                <Slider
                  id="interest-rate"
                  min={0}
                  max={15}
                  step={0.25}
                  value={[formData.interestRate]}
                  onValueChange={(value) => handleChange("interestRate", value[0])}
                  className="w-full"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-gray-500 mb-1">Estimated Monthly Payment</div>
                <div className="text-3xl font-bold text-rose-600">${formData.monthlyPayment.toFixed(2)}/mo</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Export a memoized version to prevent unnecessary re-renders
export default PricingBreakdownForm
