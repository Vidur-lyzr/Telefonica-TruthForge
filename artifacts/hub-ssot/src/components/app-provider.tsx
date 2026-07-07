import React, { createContext, useContext, useState } from "react";

type Area = "Comunicación" | "Marca" | "Gabinete";
export type Lang = "ES" | "EN" | "DE" | "PT";

interface AppState {
  area: Area;
  setArea: (area: Area) => void;
  roleId: string;
  setRoleId: (roleId: string) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [area, setArea] = useState<Area>("Comunicación");
  const [roleId, setRoleId] = useState<string>("");
  const [lang, setLang] = useState<Lang>("ES");

  return (
    <AppContext.Provider
      value={{ area, setArea, roleId, setRoleId, lang, setLang }}
    >
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
