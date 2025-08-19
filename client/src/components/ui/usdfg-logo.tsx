import React from "react";

interface USFDGLogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const USFDGLogo: React.FC<USFDGLogoProps> = ({ 
  size = "medium", 
  className = "" 
}) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-10 h-10",
    large: "w-16 h-16",
  };
  
  return (
    <div className={`mascot-float ${sizeClasses[size]} ${className}`}>
      <picture>
        <source srcSet="/assets/usdfg-logo-transparent.webp" type="image/webp" />
        <img 
          src="/assets/usdfg-logo-transparent.png" 
          alt=""
          className="w-full h-full object-contain"
          style={{filter: 'drop-shadow(0 0 10px rgba(0, 232, 252, 0.5))'}} 
        />
      </picture>
    </div>
  );
};

export default USFDGLogo;
