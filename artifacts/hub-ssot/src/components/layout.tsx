import React from "react";
import { useLocation } from "wouter";
import { useApp } from "./app-provider";
import { useListRoles } from "@workspace/api-client-react";
import {
  Logo,
  ThemeVariant,
  Touchable,
  IconButton,
  Text1,
  Text2,
  Text4,
  Select,
  skinVars,
  applyAlpha,
  IconHomeRegular,
  IconChatRegular,
  IconAiChatRegular,
  IconBarChartRegular,
  IconCalendarRegular,
  IconBookRegular,
  IconDatabaseRegular,
  IconSettingsRegular,
  IconShieldCheckedOkRegular,
  IconChevronLeftDoubleRegular,
  IconChevronRightDoubleRegular,
} from "@telefonica/mistica";

const SIDEBAR_EXPANDED = 272;
const SIDEBAR_COLLAPSED = 76;

type NavItemDef = {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const navGroups: { label: string; items: NavItemDef[] }[] = [
  {
    label: "Workspace",
    items: [
      { name: "Home", path: "/", icon: IconHomeRegular },
      { name: "Ask", path: "/ask", icon: IconChatRegular },
      { name: "Generate", path: "/generate", icon: IconAiChatRegular },
      { name: "KPIs", path: "/kpis", icon: IconBarChartRegular },
      { name: "Planning", path: "/planning", icon: IconCalendarRegular },
    ],
  },
  {
    label: "Knowledge",
    items: [{ name: "Wiki", path: "/wiki", icon: IconBookRegular }],
  },
  {
    label: "Backend",
    items: [
      { name: "Data Center", path: "/data", icon: IconDatabaseRegular },
      { name: "Admin", path: "/admin", icon: IconSettingsRegular },
      { name: "Brand", path: "/brand", icon: IconShieldCheckedOkRegular },
    ],
  },
];

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const [location, navigate] = useLocation();
  const isActive = location === item.path;
  const Icon = item.icon;

  return (
    <Touchable onPress={() => navigate(item.path)} aria-label={item.name}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "10px 0" : "10px 12px",
          borderRadius: skinVars.borderRadii.button,
          backgroundColor: isActive
            ? applyAlpha(skinVars.rawColors.inverse, 0.16)
            : "transparent",
          transition: "background-color 150ms ease",
        }}
      >
        <Icon size={20} color={skinVars.colors.inverse} />
        {!collapsed && (
          <Text2 medium color={skinVars.colors.textPrimaryInverse}>
            {item.name}
          </Text2>
        )}
      </div>
    </Touchable>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [, navigate] = useLocation();

  return (
    <ThemeVariant variant="brand">
      <nav
        aria-label="Main navigation"
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
          flexShrink: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: skinVars.colors.navigationBarBackground,
          transition: "width 200ms ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            flexDirection: collapsed ? "column" : "row",
            gap: collapsed ? 8 : 0,
            padding: collapsed ? "16px 8px" : "16px 16px",
          }}
        >
          <Touchable onPress={() => navigate("/")} aria-label="Go to Home">
            <Logo type={collapsed ? "isotype" : "imagotype"} size={collapsed ? 40 : 48} />
          </Touchable>
          <IconButton
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            onPress={onToggle}
            Icon={collapsed ? IconChevronRightDoubleRegular : IconChevronLeftDoubleRegular}
            small
          />
        </div>

        {!collapsed && (
          <div style={{ padding: "0 16px 8px" }}>
            <Text4 medium color={skinVars.colors.textPrimaryInverse}>
              Hub SSoT
            </Text4>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 12px" : "8px 12px" }}>
          {navGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 24 }}>
              {!collapsed && (
                <div
                  style={{
                    padding: "0 12px",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  <Text1 medium color={applyAlpha(skinVars.rawColors.inverse, 0.72)}>
                    {group.label}
                  </Text1>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.items.map((item) => (
                  <NavItem key={item.path} item={item} collapsed={collapsed} />
                ))}
              </div>
              {collapsed && (
                <div
                  style={{
                    height: 1,
                    margin: "12px 8px 0",
                    backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.24),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </nav>
    </ThemeVariant>
  );
}

function Topbar() {
  const { area, setArea, roleId, setRoleId } = useApp();
  const { data: roles } = useListRoles();

  React.useEffect(() => {
    if (roles && roles.length > 0 && !roleId) {
      setRoleId(roles[0].id);
    }
  }, [roles, roleId, setRoleId]);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 24px",
        flexShrink: 0,
        backgroundColor: skinVars.colors.backgroundContainer,
        borderBottom: `1px solid ${skinVars.colors.divider}`,
      }}
    >
      <Text4 medium color={skinVars.colors.textPrimary}>
        Hub SSoT
      </Text4>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 180 }}>
          <Select
            name="area"
            label="Area"
            value={area}
            onChangeValue={(v) => setArea(v as "Comunicación" | "Marca" | "Gabinete")}
            options={[
              { value: "Comunicación", text: "Comunicación" },
              { value: "Marca", text: "Marca" },
              { value: "Gabinete", text: "Gabinete" },
            ]}
            fullWidth
          />
        </div>
        <div style={{ width: 280 }}>
          <Select
            name="persona"
            label="Persona"
            value={roleId}
            onChangeValue={setRoleId}
            options={(roles ?? []).map((r) => ({
              value: r.id,
              text: `${r.label} (${r.clearance})`,
            }))}
            fullWidth
          />
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: skinVars.colors.background,
      }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Topbar />
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
