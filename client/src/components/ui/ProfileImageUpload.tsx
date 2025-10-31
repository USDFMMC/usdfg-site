import React, { useState } from "react";
import { Gamepad2 } from "lucide-react";

interface ProfileImageUploadProps {
  currentImage?: string | null;
  onImageChange?: (image: string | null) => void;
  size?: "sm" | "md" | "lg";
}

export default function ProfileImageUpload({
  currentImage,
  onImageChange,
  size = "md"
}: ProfileImageUploadProps) {
  const [image, setImage] = useState<string | null>(currentImage || null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-28 w-28"
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setImage(imageUrl);
        onImageChange?.(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full bg-zinc-900 grid place-items-center ring-2 ring-amber-300/60 overflow-hidden shadow-[0_0_40px_rgba(255,215,130,0.25)] cursor-pointer group`}>
      {image ? (
        <img
          src={image}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      ) : (
        <Gamepad2 className={`${size === "sm" ? "h-8 w-8" : size === "md" ? "h-10 w-10" : "h-12 w-12"} text-amber-300`} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,235,170,.2),transparent_70%)]" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">📷</span>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}



