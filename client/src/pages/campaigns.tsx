import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import NewsletterEditor from "@/components/newsletter-editor";
import { INewsletter, ICampaign, insertNewsletterSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Send, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Campaigns() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: newsletters = [] } = useQuery<INewsletter[]>({
    queryKey: ["/api/newsletters"],
  });

  const { data: campaigns = [] } = useQuery<ICampaign[]>({
    queryKey: ["/api/campaigns"],
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  const form = useForm({
    defaultValues: {
      subject: "",
      content: "",
      userId: user?._id || "",
    },
    resolver: zodResolver(insertNewsletterSchema),
  });

  const createNewsletterMutation = useMutation({
    mutationFn: async (data: {
      subject: string;
      content: string;
      userId: string;
    }) => {
      const res = await apiRequest("POST", "/api/newsletters", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Newsletter created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendNewsletterMutation = useMutation({
    mutationFn: async (newsletterId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/newsletters/${newsletterId}/send`
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Started",
        description: `Starting to send to ${data.totalEmails} subscribers`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Newsletter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Newsletter</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((data) =>
                createNewsletterMutation.mutate({
                  ...data,
                  userId: user?._id || "",
                })
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...form.register("subject")} />
                {form.formState.errors.subject && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.subject.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <NewsletterEditor
                  content={form.watch("content")}
                  onChange={(content) => form.setValue("content", content)}
                />
                {form.formState.errors.content && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.content.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createNewsletterMutation.isPending}
              >
                {createNewsletterMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Newsletter
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {newsletters.map((newsletter) => {
          const campaign = campaigns.find(
            (c) => c.newsletterId === newsletter._id
          );
          const isSending = campaign?.status === "processing";
          const isSuccess = campaign?.status === "completed";
          const isFailed = campaign?.status === "failed";

          return (
            <Card key={newsletter._id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium line-clamp-1">
                  {newsletter.subject}
                </CardTitle>
                {!campaign && (
                  <Button
                    size="sm"
                    onClick={() =>
                      sendNewsletterMutation.mutate(newsletter._id)
                    }
                    disabled={sendNewsletterMutation.isPending}
                  >
                    {sendNewsletterMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-h-24 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: newsletter.content }}
                />
                {campaign && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      {isSending && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm">Sending...</span>
                        </>
                      )}
                      {isSuccess && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Sent successfully</span>
                        </>
                      )}
                      {isFailed && (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm">Failed to send</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sent on: {new Date(campaign.sentAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Opens: {campaign.opens}
                    </div>
                    {campaign.emailsSent && campaign.totalEmails && (
                      <div className="text-sm text-muted-foreground">
                        Progress: {campaign.emailsSent} / {campaign.totalEmails}{" "}
                        emails sent
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
