"use client";

import { Bookmark, Camera, ImageIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Action = { title: string; description: string; icon: typeof Camera; onClick: () => void };

export default function AddFoodActions({ open, onOpenChange, onCamera, onGallery, onDatabase, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCamera: () => void;
  onGallery: () => void;
  onDatabase: () => void;
  onSaved: () => void;
}) {
  const actions: Action[] = [
    { title: "Scan foto", description: "Kenali makanan dengan kamera", icon: Camera, onClick: onCamera },
    { title: "Pilih dari galeri", description: "Gunakan foto yang tersimpan", icon: ImageIcon, onClick: onGallery },
    { title: "Food database", description: "Cari makanan dan porsinya", icon: Search, onClick: onDatabase },
    { title: "Saved foods", description: "Pakai makanan tersimpan", icon: Bookmark, onClick: onSaved },
  ];

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" showCloseButton={false} className="fc-add-actions-sheet">
      <SheetHeader className="fc-add-actions-heading">
        <SheetTitle>Tambah makanan</SheetTitle>
        <SheetDescription>Pilih cara mencatat makananmu.</SheetDescription>
      </SheetHeader>
      <div className="fc-add-actions-grid">
        {actions.map(({ title, description, icon: Icon, onClick }) => <Card className="fc-add-action-card" key={title}>
          <CardContent>
            <Button variant="ghost" className="fc-add-action-button" onClick={onClick}>
              <Icon aria-hidden="true" />
              <span><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></span>
            </Button>
          </CardContent>
        </Card>)}
      </div>
      <Button variant="ghost" size="icon" className="fc-add-actions-close" onClick={() => onOpenChange(false)} aria-label="Tutup pilihan tambah makanan"><X /></Button>
    </SheetContent>
  </Sheet>;
}
