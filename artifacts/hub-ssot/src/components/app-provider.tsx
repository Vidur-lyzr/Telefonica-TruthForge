import React, { createContext, useContext, useState } from "react";

type Area = "Comunicación" | "Marca" | "Gabinete";

interface AppState {
  area: Area;
  setArea: (area: Area) => void;
  roleId: string;
  setRoleId: (roleId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [area, setArea] = useState<Area>("Comunicación");
  const [roleId, setRoleId] = useState<string>("");

  return (
    <AppContext.Provider value={{ area, setArea, roleId, setRoleId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
