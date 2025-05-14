"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import CustomerInfoForm from "@/components/proposal/customer-info-form"
import ScopeOfWorkForm from "@/components/proposal/scope-of-work-form"
import ProductSelectionForm from "@/components/proposal/product-selection-form"
import PricingBreakdownForm from "@/components/proposal/pricing-breakdown-form"
import SignatureDepositForm from "@/components/proposal/signature-deposit-form"
import ProposalStepper from "@/components/proposal/proposal-stepper"
import { createProposal, getProposalById } from "@/app/actions/proposal-actions"
import { toast } from "@/hooks/use-toast"

// Memoize the form components to prevent unnecessary re-renders
const MemoizedCustomerInfoForm = memo(CustomerInfoForm)
const MemoizedScopeOfWorkForm = memo(ScopeOfWorkForm)
const MemoizedProductSelectionForm = memo(ProductSelectionForm)
const MemoizedPricingBreakdownForm = memo(PricingBreakdownForm)
const MemoizedSignatureDepositForm = memo(SignatureDepositForm)

export default function NewProposalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const proposalId = searchParams.get("id")
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    customer: {
      name: "",
      address: "",
      email: "",
      phone: "",
    },
    services: [],
    products: {},
    pricing: {
      subtotal: 0,
      discount: 0,
      total: 0,
      monthlyPayment: 0,
    },
  })

  // Pre-fill form if editing an existing proposal
  useEffect(() => {
    async function fetchProposal() {
      if (proposalId) {
        const proposal = await getProposalById(proposalId)
        if (proposal) {
          setFormData({
            customer: proposal.customer,
            services: proposal.services,
            products: proposal.products,
            pricing: proposal.pricing,
            id: proposal.id,
            proposalNumber: proposal.proposalNumber,
          })
        }
      }
    }
    fetchProposal()
  }, [proposalId])

  const steps = [
    { id: "customer-info", label: "Customer Info" },
    { id: "scope-of-work", label: "Scope of Work" },
    { id: "product-selection", label: "Product Selection" },
    { id: "pricing-breakdown", label: "Pricing Breakdown" },
    { id: "signature-deposit", label: "Signature & Deposit" },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Update the handleSubmit function to handle the case where we're sending a proposal directly
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validate required fields
      if (!formData.customer.name || !formData.customer.email) {
        toast({
          title: "Missing information",
          description: "Please provide customer name and email",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (formData.services.length === 0) {
        toast({
          title: "No services selected",
          description: "Please select at least one service",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Submit the proposal to the database
      const result = await createProposal(formData)

      if (result.success) {
        toast({
          title: "Proposal created",
          description: `Proposal ${result.proposalNumber} has been created successfully`,
        })

        // Update the formData with the new proposal ID
        setFormData((prev) => ({
          ...prev,
          id: result.proposalId,
          proposalNumber: result.proposalNumber,
        }))

        // If we're on the last step, don't redirect
        if (currentStep < steps.length - 1) {
          router.push("/dashboard")
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create proposal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting proposal:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Use useCallback with stable references to prevent unnecessary re-renders
  const updateCustomer = useCallback((data) => {
    setFormData((prev) => {
      if (JSON.stringify(prev.customer) === JSON.stringify(data)) {
        return prev // No change
      }
      return { ...prev, customer: data }
    })
  }, [])

  const updateServices = useCallback((data) => {
    setFormData((prev) => {
      if (JSON.stringify(prev.services) === JSON.stringify(data)) {
        return prev // No change
      }
      return { ...prev, services: data }
    })
  }, [])

  const updateProducts = useCallback((data) => {
    setFormData((prev) => {
      if (JSON.stringify(prev.products) === JSON.stringify(data)) {
        return prev // No change
      }
      return { ...prev, products: data }
    })
  }, [])

  const updatePricing = useCallback((data) => {
    setFormData((prev) => {
      if (JSON.stringify(prev.pricing) === JSON.stringify(data)) {
        return prev // No change
      }
      return { ...prev, pricing: data }
    })
  }, [])

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Proposal</h1>
        <p className="text-gray-500">Generate a detailed sales proposal for your customer</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <ProposalStepper steps={steps} currentStep={currentStep} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].label}</CardTitle>
          <CardDescription>
            {currentStep === 0 && "Enter customer details"}
            {currentStep === 1 && "Select services to include in the proposal"}
            {currentStep === 2 && "Choose products and options for selected services"}
            {currentStep === 3 && "Review pricing breakdown and apply discounts"}
            {currentStep === 4 && "Collect signature and deposit"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && <MemoizedCustomerInfoForm data={formData.customer} updateData={updateCustomer} />}
          {currentStep === 1 && <MemoizedScopeOfWorkForm data={formData.services} updateData={updateServices} />}
          {currentStep === 2 && (
            <MemoizedProductSelectionForm
              services={formData.services}
              data={formData.products}
              updateData={updateProducts}
            />
          )}
          {currentStep === 3 && (
            <MemoizedPricingBreakdownForm
              services={formData.services}
              products={formData.products}
              data={formData.pricing}
              updateData={updatePricing}
            />
          )}
          {currentStep === 4 && <MemoizedSignatureDepositForm formData={formData} />}

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            {currentStep < steps.length - 1 && (
              <Button onClick={handleNext} className="bg-rose-600 hover:bg-rose-700">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
