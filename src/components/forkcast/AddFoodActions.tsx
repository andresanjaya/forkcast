"use client";

import { Bookmark, Camera, ImageIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tr, useLanguage } from "@/lib/language";

type Action = { title: string; description: string; icon: typeof Camera; onClick: () => void };

export default function AddFoodActions({ open, onOpenChange, onCamera, onGallery, onDatabase, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCamera: () => void;
  onGallery: () => void;
  onDatabase: () => void;
  onSaved: () => void;
}) {
  const { language } = useLanguage();
  const actions: Action[] = [
    { title: tr(language, "Scan foto", "Scan photo"), description: tr(language, "Kenali makanan dengan kamera", "Identify food with the camera"), icon: Camera, onClick: onCamera },
    { title: tr(language, "Pilih dari galeri", "Choose from gallery"), description: tr(language, "Gunakan foto yang tersimpan", "Use a saved photo"), icon: ImageIcon, onClick: onGallery },
    { title: tr(language, "Food database", "Food database"), description: tr(language, "Cari makanan dan porsinya", "Find foods and portions"), icon: Search, onClick: onDatabase },
    { title: tr(language, "Saved foods", "Saved foods"), description: tr(language, "Pakai makanan tersimpan", "Reuse saved foods"), icon: Bookmark, onClick: onSaved },
  ];

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" showCloseButton={false} className="fc-add-actions-sheet">
      <SheetHeader className="fc-add-actions-heading">
        <SheetTitle>{tr(language, "Tambah makanan", "Add food")}</SheetTitle>
        <SheetDescription>{tr(language, "Pilih cara mencatat makananmu.", "Choose how to log your food.")}</SheetDescription>
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
      <Button variant="ghost" size="icon" className="fc-add-actions-close" onClick={() => onOpenChange(false)} aria-label={tr(language, "Tutup pilihan tambah makanan", "Close add-food options")}><X /></Button>
    </SheetContent>
  </Sheet>;
}
