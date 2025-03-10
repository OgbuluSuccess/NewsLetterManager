import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSmtpConfigSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

interface SmtpConfig {
  _id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string;
  isDefault: boolean;
  dailyLimit: number;
}

export default function SmtpSettings() {
  const [open, setOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertSmtpConfigSchema),
    defaultValues: {
      isDefault: false,
      dailyLimit: 500,
    },
  });

  const { data: configs = [] } = useQuery<SmtpConfig[]>({
    queryKey: ["/api/smtp-configs"],
  });

  const createSmtpMutation = useMutation({
    mutationFn: async (data: typeof insertSmtpConfigSchema._type) => {
      const res = await apiRequest("POST", "/api/smtp-configs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smtp-configs"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "SMTP configuration added successfully",
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

  const deleteSmtpMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/smtp-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smtp-configs"] });
      toast({
        title: "Success",
        description: "SMTP configuration deleted successfully",
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

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/smtp-configs/${id}`, { isDefault: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smtp-configs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const smtpConfigs = results.data.map((row: any) => ({
          name: row.name,
          host: row.host,
          port: parseInt(row.port),
          username: row.username,
          password: row.password,
          fromEmail: row.fromEmail,
          fromName: row.fromName,
          dailyLimit: parseInt(row.dailyLimit) || 500,
          isDefault: false,
        }));

        bulkCreateSmtpMutation.mutate(smtpConfigs);
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const bulkCreateSmtpMutation = useMutation({
    mutationFn: async (smtps: any[]) => {
      const results = await Promise.all(
        smtps.map(async (smtp) => {
          try {
            const res = await apiRequest("POST", "/api/smtp-configs", smtp);
            return await res.json();
          } catch (error) {
            return { error: String(error), data: smtp };
          }
        })
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/smtp-configs"] });
      setBulkUploadOpen(false);
      const successful = results.filter((r) => !r.error).length;
      const failed = results.filter((r) => r.error).length;
      toast({
        title: "Bulk Import Complete",
        description: `Successfully imported ${successful} SMTP configs. ${failed} failed.`,
      });
    },
  });

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">SMTP Settings</h1>
        <div className="flex gap-2">
          <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import SMTP Servers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload CSV file
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Required columns: name, host, port, username, password,
                      fromEmail, fromName
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Optional: dailyLimit (default: 500)
                    </span>
                  </label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add SMTP Server
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add SMTP Server</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createSmtpMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g., Primary Gmail SMTP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    {...form.register("host")}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    {...form.register("port", { valueAsNumber: true })}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...form.register("username")}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    placeholder="Your app-specific password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    {...form.register("fromEmail")}
                    placeholder="newsletters@yourdomain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    {...form.register("fromName")}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Sending Limit</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    {...form.register("dailyLimit", { valueAsNumber: true })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={form.watch("isDefault")}
                    onCheckedChange={(checked) =>
                      form.setValue("isDefault", checked)
                    }
                  />
                  <Label htmlFor="isDefault">Set as default SMTP server</Label>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createSmtpMutation.isPending}
                >
                  {createSmtpMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add SMTP Server
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Daily Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config._id}>
                <TableCell className="font-medium">{config.name}</TableCell>
                <TableCell>{config.host}</TableCell>
                <TableCell>{config.username}</TableCell>
                <TableCell>
                  {config.fromName} &lt;{config.fromEmail}&gt;
                </TableCell>
                <TableCell>{config.dailyLimit}</TableCell>
                <TableCell>
                  {config.isDefault ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Default
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(config._id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Set as Default
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSmtpMutation.mutate(config._id)}
                    disabled={deleteSmtpMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
