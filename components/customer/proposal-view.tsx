"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, CreditCard, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { updateProposalStatus } from "@/app/actions/proposal-actions"
import { toast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Add type for props
interface CustomerProposalViewProps {
  proposal: any;
  readOnly?: boolean;
}

export default function CustomerProposalView({ proposal, readOnly = false }: CustomerProposalViewProps) {
  const [currentTab, setCurrentTab] = useState("review")
  const [paymentMethod, setPaymentMethod] = useState("credit-card")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [signature, setSignature] = useState("")
  
  // Rejection states
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionFeedback, setRejectionFeedback] = useState("")
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  // Mark the proposal as viewed when the customer opens it
  useEffect(() => {
    // Only update status if we're not in readOnly mode (customer view) and the proposal is in 'sent' status
    if (!readOnly && proposal?.id && proposal?.status === "sent") {
      const markAsViewed = async () => {
        try {
          // Call the API route to mark as viewed
          const response = await fetch(`/api/proposals/view/${proposal.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          const result = await response.json();
          
          if (!result.success) {
            console.error("Failed to mark proposal as viewed:", result.error);
          }
        } catch (error) {
          console.error("Error marking proposal as viewed:", error);
        }
      };
      
      markAsViewed();
    }
    
    // Check if proposal is already rejected
    if (proposal?.status === "rejected") {
      setIsRejected(true);
    }
  }, [proposal?.id, proposal?.status, readOnly]);
  
  // Handle tab change with sequential control
  const handleTabChange = (value: string) => {
    // Only allow proceeding to sign if on review tab
    if (value === "sign" && currentTab === "review") {
      setCurrentTab("sign");
    }
    // Only allow proceeding to payment if on sign tab and signature exists
    else if (value === "payment" && currentTab === "sign" && signature.trim()) {
      setCurrentTab("payment");
    }
    // Always allow going back to review tab
    else if (value === "review") {
      setCurrentTab("review");
    }
    // Stay on the current tab if trying to skip ahead
    else {
      // If trying to go to payment without signature, show a warning
      if (value === "payment" && currentTab === "sign" && !signature.trim()) {
        toast({
          title: "Signature Required",
          description: "Please sign the proposal before proceeding to payment.",
          variant: "destructive"
        });
      }
    }
  };

  // Add a function to send confirmation email
  const sendConfirmationEmail = async () => {
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: proposal?.customer?.email,
          name: proposal?.customer?.name,
          proposalId: proposal?.id,
          proposalNumber: proposal?.proposalNumber,
          message: `Your proposal has been signed and your deposit has been processed successfully. Thank you for choosing Evergreen Energy Upgrades. Our team will contact you shortly to schedule your project.`,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Error sending confirmation email:', result.error);
      }
      return result.success;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }
  };

  // Update the handleSubmit function
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Validate that the customer has provided a signature
      if (!signature.trim()) {
        toast({
          title: "Signature Required",
          description: "Please type your full name to sign the proposal.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Update proposal status to signed
      if (proposal?.id) {
        const result = await updateProposalStatus(proposal.id.toString(), "signed");
        
        if (!result.success) {
          toast({
            title: "Error",
            description: "Failed to update proposal status.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Simulate processing payment
      setTimeout(async () => {
        // Send confirmation email after successful payment
        await sendConfirmationEmail();
        
        setIsSubmitting(false);
        setIsComplete(true);
      }, 1500);
    } catch (error) {
      console.error("Error updating proposal status:", error);
      setIsSubmitting(false);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle proposal rejection
  const handleRejectProposal = async () => {
    setIsRejecting(true);
    
    try {
      // Validate inputs
      if (!rejectionReason) {
        toast({
          title: "Reason Required",
          description: "Please select a reason for rejecting the proposal.",
          variant: "destructive"
        });
        setIsRejecting(false);
        return;
      }
      
      if (proposal?.id) {
        // First update proposal status to rejected
        const result = await updateProposalStatus(proposal.id.toString(), "rejected");
        
        if (!result.success) {
          toast({
            title: "Error",
            description: "Failed to update proposal status.",
            variant: "destructive"
          });
          setIsRejecting(false);
          return;
        }
        
        // Then try to save feedback - but don't fail the whole process if this doesn't work
        // This way, the proposal will still be marked as rejected even if feedback saving fails
        try {
          console.log("Saving feedback with data:", {
            proposalId: proposal.id,
            reason: rejectionReason,
            feedback: rejectionFeedback || ""
          });
          
          const response = await fetch('/api/proposals/feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              proposalId: Number(proposal.id),
              reason: rejectionReason,
              feedback: rejectionFeedback || ""
            }),
          });

          const feedbackResult = await response.json();
          
          if (!response.ok || !feedbackResult.success) {
            console.error("Failed to save feedback:", feedbackResult);
            // Don't return - we still want to show success for the rejection
          }
        } catch (feedbackError) {
          console.error("Error saving feedback:", feedbackError);
          // Don't return - we still want to show success for the rejection
        }
        
        toast({
          title: "Proposal Rejected",
          description: "Thank you for your feedback. The proposal has been rejected.",
        });
        
        setIsRejected(true);
        setShowRejectionDialog(false);
      }
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Format date function
  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card>
          <CardHeader className="bg-rose-50 border-b py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="/evergreen.png" alt="Evergreen Energy Upgrades Logo" className="h-24 w-auto drop-shadow-md" />
                <CardTitle className="text-2xl">Your Proposal</CardTitle>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Proposal #{proposal?.proposalNumber}</p>
                <p className="text-sm text-gray-500">Created: {formatDate(proposal?.createdAt)}</p>
                {isRejected && (
                  <p className="text-sm font-medium text-red-600 mt-1">Status: Rejected</p>
                )}
              </div>
            </div>
          </CardHeader>

          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <div className="px-6 pt-6">
              {readOnly ? (
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="review">Review Proposal</TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="review">Review Proposal</TabsTrigger>
                  <TabsTrigger value="sign" disabled={isRejected}>Sign</TabsTrigger>
                  <TabsTrigger value="payment" disabled={isRejected || currentTab !== "sign" || !signature.trim()}>
                    Payment
                  </TabsTrigger>
                </TabsList>
              )}
            </div>

            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {currentTab === "review" && (
                  <motion.div
                    key="review"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={fadeIn}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Services Included</h3>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-wrap gap-2"
                      >
                        {proposal?.serviceNames?.map((service: any, index: any) => (
                          <motion.span
                            key={index}
                            variants={fadeIn}
                            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full"
                          >
                            {service}
                          </motion.span>
                        ))}
                      </motion.div>

                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-medium mb-4">Scope of Work</h3>
                        <div className="prose max-w-none">
                          {proposal?.services?.map((service: any, index: any) => {
                            const productData = proposal.products[service]
                            if (!productData) return null

                            return (
                              <div key={index} className="mb-6">
                                <h4 className="text-md font-medium mb-2">
                                  {service.charAt(0).toUpperCase() + service.slice(1).replace("-", " & ")}
                                </h4>
                                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md border">
                                  {productData.scopeNotes}
                                </pre>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="border-t pt-4 mt-4"
                      >
                        <h3 className="text-lg font-medium mb-4">Pricing</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${proposal?.pricing?.subtotal?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Discount</span>
                            <span>-${proposal?.pricing?.discount?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total</span>
                            <span>${proposal?.pricing?.total?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between text-rose-600">
                            <span>Monthly Payment Option</span>
                            <span>${proposal?.pricing?.monthlyPayment?.toFixed(2) || "0.00"}/mo</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {!readOnly && !isRejected && (
                      <div className="flex gap-4">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                          <Button 
                            onClick={() => setCurrentTab("sign")} 
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Continue to Sign
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            onClick={() => setShowRejectionDialog(true)} 
                            variant="outline" 
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject Proposal
                          </Button>
                        </motion.div>
                      </div>
                    )}
                    
                    {isRejected && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <h3 className="text-lg font-medium text-red-800">Proposal Rejected</h3>
                        <p className="text-red-600 mt-1">
                          You have rejected this proposal. Thank you for your feedback.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {!readOnly && currentTab === "sign" && !isRejected && (
                  <motion.div
                    key="sign"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={fadeIn}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Sign Your Proposal</h3>
                      <p className="text-gray-600">
                        Please type your full name below to electronically sign this proposal.
                      </p>

                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="signature">Your Full Name</Label>
                        <Input
                          id="signature"
                          placeholder="Type your full name"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                        />
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="border p-4 rounded-md bg-gray-50"
                      >
                        <p className="text-sm text-gray-600">
                          By typing my name above and clicking "Sign & Continue to Payment", I agree to the terms and
                          conditions of this proposal and authorize the work to proceed as described.
                        </p>
                      </motion.div>
                    </div>

                    <div className="flex gap-4">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button
                          onClick={() => signature.trim() ? setCurrentTab("payment") : null}
                          disabled={!signature.trim()}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Sign & Continue to Payment
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => setCurrentTab("review")} 
                          variant="outline" 
                          className="w-full"
                        >
                          Back to Review
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {!readOnly && currentTab === "payment" && !isRejected && (
                  <motion.div
                    key="payment"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={fadeIn}
                    className="space-y-6"
                  >
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-green-50 border border-green-200 rounded-md p-6 text-center"
                      >
                        <Check className="h-10 w-10 text-green-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-green-800 mb-2">Thank You!</h3>
                        <p className="text-green-600 mb-4">
                          Your proposal has been signed and your deposit has been processed successfully.
                        </p>
                        <p className="text-gray-600">
                          A confirmation email has been sent to your email address. Our team will contact you shortly to
                          schedule your project.
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Deposit Method</h3>
                          <p className="text-gray-600">Please select your preferred payment method for the deposit.</p>

                          <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                            <TabsList className="grid w-full max-w-md grid-cols-2">
                              <TabsTrigger value="credit-card" className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Credit Card
                              </TabsTrigger>
                              <TabsTrigger value="paypal" className="flex items-center gap-2">
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M19.5 8.5H4.5C3.4 8.5 2.5 9.4 2.5 10.5V17.5C2.5 18.6 3.4 19.5 4.5 19.5H19.5C20.6 19.5 21.5 18.6 21.5 17.5V10.5C21.5 9.4 20.6 8.5 19.5 8.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7 15.5H7.01"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M3.5 11.5H20.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                PayPal
                              </TabsTrigger>
                            </TabsList>

                            <AnimatePresence mode="wait">
                              {paymentMethod === "credit-card" && (
                                <motion.div
                                  key="credit-card"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-4"
                                >
                                  <Card>
                                    <CardContent className="p-6 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="card-name">Name on Card</Label>
                                          <Input id="card-name" placeholder="John Smith" />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="card-number">Card Number</Label>
                                          <Input id="card-number" placeholder="•••• •••• •••• ••••" />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="expiry">Expiry Date</Label>
                                          <Input id="expiry" placeholder="MM/YY" />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="cvv">CVV</Label>
                                          <Input id="cvv" placeholder="•••" />
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              )}

                              {paymentMethod === "paypal" && (
                                <motion.div
                                  key="paypal"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-4"
                                >
                                  <Card>
                                    <CardContent className="p-6 text-center">
                                      <p className="mb-4">You'll be redirected to PayPal to complete your payment.</p>
                                      <Button className="bg-[#0070ba] hover:bg-[#005ea6]">Continue with PayPal</Button>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Tabs>

                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="border-t pt-4 mt-4"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Deposit Amount (25%)</span>
                              <span className="font-bold text-xl">
                                ${((proposal?.pricing?.total || 0) * 0.25).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                              The remaining balance will be due upon completion of the project.
                            </p>
                          </motion.div>
                        </div>

                        <div className="flex gap-4">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                            <Button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {isSubmitting ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex items-center"
                                >
                                  <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Processing...
                                </motion.div>
                              ) : (
                                "Submit Deposit"
                              )}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                              onClick={() => setCurrentTab("sign")} 
                              variant="outline" 
                              className="w-full"
                            >
                              Back to Sign
                            </Button>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Tabs>
        </Card>
      </motion.div>
      
      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Proposal</DialogTitle>
            <DialogDescription>
              Please provide a reason why you're rejecting this proposal. This helps us improve our services.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for Rejection</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger id="rejection-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="too-expensive">Price is too high</SelectItem>
                  <SelectItem value="scope-incorrect">Scope of work is incorrect</SelectItem>
                  <SelectItem value="going-elsewhere">Chose another provider</SelectItem>
                  <SelectItem value="postponing">Postponing the project</SelectItem>
                  <SelectItem value="other">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Please provide any additional feedback..."
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectProposal}
              disabled={isRejecting || !rejectionReason}
            >
              {isRejecting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Reject Proposal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
