import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Download,
  Filter,
  Plus,
  File,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DocumentCategory =
  | "animal_registration"
  | "movement_permit"
  | "health_certificate"
  | "vaccination_record"
  | "breeding_certificate"
  | "import_export_permit"
  | "woah_report"
  | "efi_certificate"
  | "training_record"
  | "ministry_directive"
  | "other";

interface ComplianceDocument {
  id: string;
  district_id: string | null;
  title: string;
  category: DocumentCategory;
  file_url: string;
  file_name: string;
  uploaded_by: string | null;
  date_of_document: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

const categoryLabels: Record<DocumentCategory, string> = {
  animal_registration: "Animal Registration",
  movement_permit: "Movement Permit",
  health_certificate: "Health Certificate",
  vaccination_record: "Vaccination Record",
  breeding_certificate: "Breeding Certificate",
  import_export_permit: "Import / Export Permit",
  woah_report: "WOAH / Disease Report",
  efi_certificate: "EFI Certificate",
  training_record: "Training Record",
  ministry_directive: "Ministry Directive",
  other: "Other",
};

const categoryGroups: Record<string, DocumentCategory[]> = {
  "Livestock & Breeding": [
    "animal_registration",
    "movement_permit",
    "breeding_certificate",
  ],
  "Health & Veterinary": [
    "health_certificate",
    "vaccination_record",
    "woah_report",
  ],
  "Trade & Exports": ["import_export_permit", "efi_certificate"],
  "Ministry & Admin": ["ministry_directive", "training_record", "other"],
};

const categoryColor: Partial<Record<DocumentCategory, string>> = {
  woah_report: "bg-destructive/10 text-destructive border-destructive/20",
  import_export_permit: "bg-info/10 text-info border-info/20",
  health_certificate: "bg-success/10 text-success border-success/20",
  vaccination_record: "bg-success/10 text-success border-success/20",
  efi_certificate: "bg-accent/10 text-accent border-accent/20",
  ministry_directive: "bg-primary/10 text-primary border-primary/20",
};

function isExpiringSoon(expiryDate: string | null) {
  if (!expiryDate) return false;
  const days = (new Date(expiryDate).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 60;
}

function isExpired(expiryDate: string | null) {
  if (!expiryDate) return false;
  return new Date(expiryDate).getTime() < Date.now();
}

export default function DocumentVault() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("other");
  const [uploadDate, setUploadDate] = useState("");
  const [uploadExpiry, setUploadExpiry] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    setLoading(true);
    let query = supabase
      .from("compliance_documents")
      .select("*")
      .order("created_at", { ascending: false });

    // Non-admins see only their district's docs
    if (profile?.district_id && profile.role !== "system_admin") {
      query = query.eq("district_id", profile.district_id);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: "Failed to load documents", variant: "destructive" });
    } else {
      setDocuments((data as ComplianceDocument[]) || []);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !user?.id) {
      toast({ title: "Missing Information", description: "Please provide a file and title.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileExt = uploadFile.name.split(".").pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: storageErr } = await supabase.storage
        .from("compliance-documents")
        .upload(storagePath, uploadFile);
      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage
        .from("compliance-documents")
        .getPublicUrl(storagePath);

      const { error: insertErr } = await supabase
        .from("compliance_documents")
        .insert({
          district_id: profile?.district_id ?? null,
          title: uploadTitle,
          category: uploadCategory,
          file_url: urlData.publicUrl,
          file_name: uploadFile.name,
          uploaded_by: user.id,
          date_of_document: uploadDate || null,
          expiry_date: uploadExpiry || null,
          notes: uploadNotes || null,
        });
      if (insertErr) throw insertErr;

      toast({ title: "Uploaded", description: `${uploadTitle} saved to vault.` });
      setIsUploadOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadCategory("other");
    setUploadDate("");
    setUploadExpiry("");
    setUploadNotes("");
  };

  const deleteDocument = async (doc: ComplianceDocument) => {
    const filePath = doc.file_url.split("/compliance-documents/").pop();
    if (filePath) {
      await supabase.storage.from("compliance-documents").remove([filePath]);
    }
    const { error } = await supabase
      .from("compliance_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Document removed from vault." });
      fetchDocuments();
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = doc.title.toLowerCase().includes(q) || doc.file_name.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || doc.category === filterCategory;
    return matchSearch && matchCat;
  });

  const expiryAlerts = documents.filter(
    (d) => isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date)
  ).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Document Vault
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ministry compliance documents, permits and certificates
            </p>
          </div>
          <div className="flex items-center gap-2">
            {expiryAlerts > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {expiryAlerts} expiring soon
              </Badge>
            )}
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Category summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(categoryGroups).map(([group, cats]) => {
            const count = documents.filter((d) => cats.includes(d.category)).length;
            return (
              <div
                key={group}
                className="card-elevated p-4 cursor-pointer hover:border-primary/40"
                onClick={() => setFilterCategory(cats[0])}
              >
                <p className="text-xs text-muted-foreground">{group}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents grid */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading documents…</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload the first document
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const expired = isExpired(doc.expiry_date);
              const expiring = isExpiringSoon(doc.expiry_date);
              return (
                <div
                  key={doc.id}
                  className={`card-elevated p-4 group ${expired ? "border-destructive/30" : expiring ? "border-warning/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                      <Badge
                        variant="outline"
                        className={`mt-1.5 text-xs ${categoryColor[doc.category] ?? ""}`}
                      >
                        {categoryLabels[doc.category]}
                      </Badge>
                      {doc.date_of_document && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.date_of_document).toLocaleDateString("en-LS")}
                        </p>
                      )}
                      {doc.expiry_date && (
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${expired ? "text-destructive" : expiring ? "text-warning" : "text-muted-foreground"}`}>
                          <Calendar className="w-3 h-3" />
                          Expires {new Date(doc.expiry_date).toLocaleDateString("en-LS")}
                          {expired && " · EXPIRED"}
                          {expiring && !expired && " · Expiring soon"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(doc.file_url, "_blank")}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteDocument(doc)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>File *</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Movement Permit — Quthing 2026"
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={uploadCategory}
                  onValueChange={(v) => setUploadCategory(v as DocumentCategory)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryGroups).map(([group, cats]) => (
                      <div key={group}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                        {cats.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {categoryLabels[cat]}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Document Date</Label>
                  <Input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={uploadExpiry}
                    onChange={(e) => setUploadExpiry(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Any additional notes…"
                  rows={2}
                />
              </div>
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? "Uploading…" : "Upload Document"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
