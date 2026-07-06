import React, { useState } from "react";
import { useListDocuments, useGetCorpusStats, useGetDocument, CorpusDocument } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Shield, Globe, FileText, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataPage() {
  const { data: stats } = useGetCorpusStats();
  const { data: documents } = useListDocuments();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { data: docDetail, isLoading: isLoadingDetail } = useGetDocument(selectedDocId || "", {
    query: { enabled: !!selectedDocId, queryKey: ['document', selectedDocId] }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-tf-navy">Data Governance</h1>
        <p className="text-muted-foreground text-lg">Manage the governed corpus and metadata contracts backing Hub SSoT.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-tf-blue-tint rounded-full text-tf-blue">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Documents</p>
              <h3 className="text-3xl font-bold text-tf-navy mt-1">{stats?.totalDocuments || 0}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-tf-success-bg rounded-full text-tf-success">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Chunks</p>
              <h3 className="text-3xl font-bold text-tf-navy mt-1">{stats?.totalChunks || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-tf-warning-bg rounded-full text-tf-warning">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Countries</p>
              <h3 className="text-3xl font-bold text-tf-navy mt-1">{stats?.byCountry?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-tf-error-bg rounded-full text-tf-error">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Quarantined</p>
              <h3 className="text-3xl font-bold text-tf-navy mt-1">{stats?.quarantined || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
            <FileText className="w-5 h-5 text-tf-blue" />
            <span>Governed Corpus</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-widest">Title</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-widest">Brand</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-widest">Confidentiality</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-widest">Validity</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-widest">Chunks</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.map((doc) => (
                <TableRow 
                  key={doc.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedDocId(doc.id)}
                >
                  <TableCell className="font-semibold text-tf-navy max-w-[300px] truncate">{doc.title}</TableCell>
                  <TableCell className="text-muted-foreground font-medium">{doc.brand}</TableCell>
                  <TableCell>
                    <Badge variant={doc.confidentiality === 'public' ? 'secondary' : 'destructive'} className="uppercase text-[10px] tracking-widest rounded-full font-bold">
                      {doc.confidentiality}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.validity === 'approved' ? 'default' : 'secondary'} className={cn(
                      "uppercase text-[10px] tracking-widest rounded-full font-bold",
                      doc.validity === 'approved' ? "bg-tf-success hover:bg-tf-success text-white" : ""
                    )}>
                      {doc.validity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{doc.chunkCount}</TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Drawer open={!!selectedDocId} onOpenChange={(open) => !open && setSelectedDocId(null)}>
        <DrawerContent className="max-h-[90vh]">
          <div className="mx-auto w-full max-w-4xl px-6 pb-8 pt-4 flex flex-col h-full overflow-hidden">
            {isLoadingDetail ? (
              <div className="py-20 flex justify-center items-center">
                <div className="w-8 h-8 rounded-full border-2 border-tf-blue border-t-transparent animate-spin" />
              </div>
            ) : docDetail ? (
              <>
                <DrawerHeader className="px-0 pb-4 shrink-0 border-b border-border mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-tf-blue-tint text-tf-blue hover:bg-tf-blue-tint text-xs uppercase tracking-widest font-bold">
                      {docDetail.document.type}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Badge variant={docDetail.document.validity === 'approved' ? 'default' : 'secondary'} className={cn(
                        "uppercase tracking-widest text-[10px] font-bold",
                        docDetail.document.validity === 'approved' ? "bg-tf-success text-white" : ""
                      )}>
                        {docDetail.document.validity}
                      </Badge>
                      <Badge variant={docDetail.document.confidentiality === 'public' ? 'secondary' : 'destructive'} className="uppercase tracking-widest text-[10px] font-bold">
                        {docDetail.document.confidentiality}
                      </Badge>
                    </div>
                  </div>
                  <DrawerTitle className="text-3xl font-bold text-tf-navy">{docDetail.document.title}</DrawerTitle>
                  <DrawerDescription className="text-base mt-2 flex items-center space-x-4">
                    <span>{docDetail.document.country} • {docDetail.document.brand}</span>
                    <span className="text-muted-foreground">Owner: {docDetail.document.owner}</span>
                  </DrawerDescription>
                </DrawerHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-6">
                    <div className="bg-muted p-5 rounded-xl text-sm leading-relaxed text-foreground font-medium">
                      {docDetail.document.summary}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                        Document Chunks ({docDetail.chunks.length})
                      </h4>
                      <div className="space-y-3">
                        {docDetail.chunks.map((chunk) => (
                          <div key={chunk.id} className="border border-border rounded-xl p-4 hover:shadow-sm transition-shadow bg-card">
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                              {chunk.breadcrumb}
                            </div>
                            <h5 className="font-bold text-tf-navy mb-2">{chunk.heading}</h5>
                            <p className="text-sm text-foreground/80 leading-relaxed font-serif">
                              "{chunk.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="py-20 flex flex-col justify-center items-center text-tf-error">
                <XCircle className="w-12 h-12 mb-4" />
                <h3 className="font-bold text-xl">Failed to load document</h3>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
