import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";

interface PreviewData {
  email: string;
  name?: string;
  status: "valid" | "invalid";
  error?: string;
}

export default function BulkSubscriberUpload({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingStatus("Reading CSV file...");
    setPreviewData([]);
    setUploadProgress(0);

    Papa.parse(file, {
      complete: (results) => {
        const rows = results.data as any[];

        // Check file size
        if (rows.length > 10000) {
          toast({
            title: "Error",
            description: "Maximum 10,000 subscribers can be imported at once",
            variant: "destructive",
          });
          return;
        }

        setProcessingStatus("Validating data...");

        const validatedData: PreviewData[] = rows
          .filter((row: any) => row.email) // Skip empty rows
          .map((row: any) => ({
            email: row.email?.trim(),
            name: row.name?.trim(),
            status: validateEmail(row.email) ? "valid" : "invalid",
            error: validateEmail(row.email)
              ? undefined
              : "Invalid email format",
          }));

        setPreviewData(validatedData);
        setProcessingStatus("");
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        toast({
          title: "Error",
          description: `Failed to parse CSV: ${error.message}`,
          variant: "destructive",
        });
        setProcessingStatus("");
      },
    });
  };

  const importMutation = useMutation({
    mutationFn: async (data: PreviewData[]) => {
      const validSubscribers = data
        .filter((item) => item.status === "valid")
        .map((item) => ({
          email: item.email,
          name: item.name,
        }));

      setProcessingStatus("Importing subscribers...");
      const res = await apiRequest(
        "POST",
        "/api/subscribers/bulk",
        validSubscribers
      );
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      onOpenChange(false);
      setPreviewData([]);
      setProcessingStatus("");

      toast({
        title: "Import Complete",
        description: result.message,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      setProcessingStatus("");
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const columns = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            row.original.status === "valid"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "error",
      header: "Error",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Subscribers</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-1">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
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
                  Format: email (required), name (optional)
                </span>
                <span className="text-xs text-muted-foreground">
                  Maximum 10,000 subscribers per upload
                </span>
              </label>
            </div>

            {processingStatus && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{processingStatus}</span>
                  {uploadProgress > 0 && <span>{uploadProgress}%</span>}
                </div>
                {uploadProgress > 0 && (
                  <Progress value={uploadProgress} className="w-full" />
                )}
              </div>
            )}

            {previewData.length > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    Total: {previewData.length} subscribers
                    <span className="mx-2">|</span>
                    Valid:{" "}
                    {previewData.filter((d) => d.status === "valid").length}
                    <span className="mx-2">|</span>
                    Invalid:{" "}
                    {previewData.filter((d) => d.status === "invalid").length}
                  </div>
                </div>

                <div className="border rounded-lg">
                  <DataTable columns={columns} data={previewData} />
                </div>
              </>
            )}
          </div>
        </div>

        {previewData.length > 0 && (
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewData([]);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate(previewData)}
              disabled={
                importMutation.isPending ||
                !previewData.some((d) => d.status === "valid") ||
                !!processingStatus
              }
            >
              {importMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Import Valid Subscribers
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
