import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";

export default function FoodPhotoHeader({ src, name }: { src?: string; name: string }) {
  return <div className={`fc-photo-header${src ? " has-photo" : ""}`}>{src ? <Image src={src} alt={name} width={800} height={500} unoptimized /> : <div><UtensilsCrossed size={48} strokeWidth={1.3} /><span>Foto belum tersedia</span></div>}</div>;
}
