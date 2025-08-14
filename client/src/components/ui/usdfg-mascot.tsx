import React from "react";

interface USFDGMascotProps {
  variant?: "hoodie" | "with-tokens";
  size?: "small" | "medium" | "large";
  className?: string;
}

const USFDGMascot: React.FC<USFDGMascotProps> = ({
  variant = "hoodie",
  size = "medium",
  className = ""
}) => {
  const sizeClasses = {
    small: "w-32 h-32",
    medium: "w-64 h-64",
    large: "w-80 h-80"
  };

  const imagePath = variant === "hoodie" 
    ? "/images/ghost-mascot-hoodie.png" 
    : "/images/ghost-mascot-with-tokens.png";
  
  return (
    <div className={`ghost-float ${sizeClasses[size]} ${className}`}>
      <img 
        src={imagePath} 
        alt=""
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default USFDGMascot;