import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Phone } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

interface PhoneUpdateModalProps {
  currentPhone: string;
  onClose: () => void;
  onSuccess: (newPhone: string) => void;
}

export function PhoneUpdateModal({ currentPhone, onClose, onSuccess }: PhoneUpdateModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!newPhone || newPhone === currentPhone) {
      toast.error("Please enter a new, valid phone number");
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.post("/api/profile/phone/send-otp", { newPhone });
      setStep(2);
      toast.success("Verification code sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.post("/api/profile/phone/verify-otp", { otp });
      toast.success("Phone number updated successfully!");
      onSuccess(response.phone || newPhone);
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[400px] bg-white rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Phone className="text-[#953002]" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Update Phone Number</h2>
            <p className="text-sm text-gray-500">
              {step === 1 ? "Enter your new phone number" : "Enter the verification code"}
            </p>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label>Current Phone Number</Label>
              <Input value={currentPhone || "Not set"} disabled className="mt-1 bg-gray-50 text-gray-500" />
            </div>
            <div>
              <Label>New Phone Number</Label>
              <Input 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)} 
                placeholder="+1 (555) 000-0000"
                className="mt-1"
                autoFocus
              />
            </div>
            <Button 
              className="w-full bg-[#953002] hover:bg-[#7a2401] text-white mt-2" 
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Verification Code</Label>
              <Input 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                placeholder="000000"
                maxLength={6}
                className="mt-1 text-center tracking-[0.5em] font-mono text-lg"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                We sent a 6-digit code to your email address. It expires in 15 minutes.
              </p>
            </div>
            <Button 
              className="w-full bg-[#953002] hover:bg-[#7a2401] text-white mt-2" 
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Update"}
            </Button>
            <button 
              onClick={() => setStep(1)}
              className="w-full text-sm text-gray-500 hover:text-gray-800 mt-2 text-center"
            >
              Back to edit phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
