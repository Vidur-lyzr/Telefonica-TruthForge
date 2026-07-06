import React from "react";
import { useLocation } from "wouter";

export default function PlaceholderPage() {
  const [location] = useLocation();
  const name = location.replace("/", "").charAt(0).toUpperCase() + location.slice(2);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-tf-blue-tint rounded-full flex items-center justify-center mb-6">
        <div className="w-10 h-10 bg-tf-blue rounded-full opacity-50" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-tf-navy mb-3">{name} Workspace</h1>
      <p className="text-muted-foreground text-lg max-w-md">
        This area is in active development. Check back soon for new governance tools.
      </p>
    </div>
  );
}
