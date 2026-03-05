import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const UploadPage = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setStatus('idle');
            setProgress(0);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setStatus('uploading');
        setProgress(10);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Small delay to show progress bar
            setTimeout(() => setProgress(40), 500);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            setProgress(80);

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            setProgress(100);
            setStatus('success');
            toast.success(result.message || "File uploaded successfully!");
        } catch (error) {
            console.error(error);
            setStatus('error');
            toast.error("Failed to upload file. Please ensure the backend is running.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto py-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Upload Sales Data</h1>
                <p className="text-muted-foreground mt-2">
                    Upload your CSV or Excel files to sync with the PostgreSQL database.
                </p>
            </div>

            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                    file ? "bg-accent/10 border-accent" : ""
                )}
            >
                <input {...getInputProps()} />

                {status === 'success' ? (
                    <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                ) : status === 'error' ? (
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                ) : (
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6 text-accent-foreground" />
                    </div>
                )}

                {file ? (
                    <div className="text-center">
                        <p className="font-medium text-lg flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="font-medium text-lg">
                            {isDragActive ? "Drop the file here" : "Click or drag file to upload"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Supports .csv, .xlsx, .xls
                        </p>
                    </div>
                )}
            </div>

            {(uploading || status !== 'idle') && (
                <div className="bg-card border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-2">
                            {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                            {status === 'uploading' ? 'Uploading and processing...' :
                                status === 'success' ? 'Completed' :
                                    status === 'error' ? 'Failed' : 'Ready'}
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setFile(null); setStatus('idle'); setProgress(0); }}>
                    Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file || uploading || status === 'success'}>
                    {uploading ? "Processing..." : "Start Upload"}
                </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground italic flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Note:
                </p>
                <ul className="list-disc ml-4 space-y-1">
                    <li>Ensure your CSV headers match the required format (ITEM_CODE, BILL_DATE, etc.)</li>
                    <li>Files are directly synced to the `sales_data` table in PostgreSQL.</li>
                    <li>Date format: DD-MM-YYYY or standard SQL format.</li>
                </ul>
            </div>
        </div>
    );
};

export default UploadPage;
