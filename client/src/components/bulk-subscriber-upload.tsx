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
import Papa from 'papaparse';

interface PreviewData {
  email: string;
  name?: string;
  status: 'valid' | 'invalid';
  error?: string;
}

export default function BulkSubscriberUpload({ 
  isOpen, 
  onOpenChange 
}: { 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const validatedData: PreviewData[] = results.data
          .filter((row: any) => row.email) // Skip empty rows
          .map((row: any) => ({
            email: row.email?.trim(),
            name: row.name?.trim(),
            status: validateEmail(row.email) ? 'valid' : 'invalid',
            error: validateEmail(row.email) ? undefined : 'Invalid email format'
          }));
        setPreviewData(validatedData);
      },
      header: true,
      skipEmptyLines: true
    });
  };

  const bulkImportMutation = useMutation({
    mutationFn: async (data: PreviewData[]) => {
      const validSubscribers = data.filter(item => item.status === 'valid');
      const res = await apiRequest("POST", "/api/subscribers/bulk", validSubscribers);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      onOpenChange(false);
      setPreviewData([]);
      toast({
        title: "Success",
        description: "Subscribers imported successfully",
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
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.original.status === 'valid' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Subscribers</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
            </label>
          </div>

          {previewData.length > 0 && (
            <>
              <div className="border rounded-lg">
                <DataTable 
                  columns={columns} 
                  data={previewData} 
                />
              </div>

              <div className="flex justify-end gap-2">
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
                  onClick={() => bulkImportMutation.mutate(previewData)}
                  disabled={bulkImportMutation.isPending || !previewData.some(d => d.status === 'valid')}
                >
                  {bulkImportMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Import Valid Subscribers
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
