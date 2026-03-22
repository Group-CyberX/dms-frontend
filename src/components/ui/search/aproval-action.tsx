"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the validation schema using Zod
const approvalSchema = z.object({
  comments: z.string().optional(),
});

type ApprovalFormValues = z.infer<typeof approvalSchema>;

export default function ApprovalAction() {
  // Initialize React Hook Form
  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      comments: "",
    },
  });

  // Handle Approve Action
  const onApprove = (data: ApprovalFormValues) => {
    console.log("Approved with comments:", data.comments);
    // Add your API call or Zustand state update here
  };

  // Handle Reject Action
  const onReject = (data: ApprovalFormValues) => {
    console.log("Rejected with comments:", data.comments);
    // Add your API call or Zustand state update here
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-800">
          Approval Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="comments"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel className="text-gray-600">Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add your comments here..."
                      className="resize-none min-h-[100px] bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={form.handleSubmit(onApprove)}
                className="bg-[#8a3c26] hover:bg-[#70301d] text-white w-full"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onReject)}
                className="bg-[#cb3647] hover:bg-[#a82d3b] text-white w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}