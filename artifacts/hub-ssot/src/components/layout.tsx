import React from "react";
import { useLocation } from "wouter";
import { useApp, type Lang } from "./app-provider";
import { UI, type ChromeStrings } from "../i18n";
import { useListRoles } from "@workspace/api-client-react";
import {
  Logo,
  Touchable,
  IconButton,
  Text1,
  Text2,
  Text4,
  Menu,
  MenuItem,
  IconChevronDownRegular,
  skinVars,
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

// Nav labels come from the chrome dictionary so the product-level language
// switcher visibly changes the shell, not just the answers.
function buildNavGroups(t: ChromeStrings): { label: string; items: NavItemDef[] }[] {
  return [
    {
      label: t.navGroups.workspace,
      items: [
        { name: t.nav.home, path: "/", icon: IconHomeRegular },
        { name: t.nav.ask, path: "/ask", icon: IconChatRegular },
        { name: t.nav.generate, path: "/generate", icon: IconAiChatRegular },
        { name: t.nav.kpis, path: "/kpis", icon: IconBarChartRegular },
        { name: t.nav.planning, path: "/planning", icon: IconCalendarRegular },
      ],
    },
    {
      label: t.navGroups.knowledge,
      items: [{ name: t.nav.wiki, path: "/wiki", icon: IconBookRegular }],
    },
    {
      label: t.navGroups.backend,
      items: [
        { name: t.nav.data, path: "/data", icon: IconDatabaseRegular },
        { name: t.nav.admin, path: "/admin", icon: IconSettingsRegular },
        { name: t.nav.brand, path: "/brand", icon: IconShieldCheckedOkRegular },
      ],
    },
  ];
}

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
          backgroundColor: isActive ? skinVars.colors.brandLow : "transparent",
          transition: "background-color 150ms ease",
        }}
      >
        <Icon
          size={20}
          color={isActive ? skinVars.colors.brand : skinVars.colors.neutralMedium}
        />
        {!collapsed && (
          <Text2
            medium
            color={isActive ? skinVars.colors.brand : skinVars.colors.textPrimary}
          >
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
  const { lang } = useApp();
  const navGroups = React.useMemo(() => buildNavGroups(UI[lang]), [lang]);

  return (
    <nav
      aria-label={UI[lang].a11y.mainNavigation}
      style={{
        width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: skinVars.colors.backgroundContainer,
        borderRight: `1px solid ${skinVars.colors.divider}`,
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
          <Touchable onPress={() => navigate("/")} aria-label={UI[lang].a11y.goHome}>
            <Logo type={collapsed ? "isotype" : "imagotype"} size={collapsed ? 40 : 48} />
          </Touchable>
          <IconButton
            aria-label={collapsed ? UI[lang].a11y.expandMenu : UI[lang].a11y.collapseMenu}
            onPress={onToggle}
            Icon={collapsed ? IconChevronRightDoubleRegular : IconChevronLeftDoubleRegular}
            small
          />
        </div>

        {!collapsed && (
          <div style={{ padding: "0 16px 8px" }}>
            <Text4 medium color={skinVars.colors.textPrimary}>
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
                  <Text1 medium color={skinVars.colors.textSecondary}>
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
                    backgroundColor: skinVars.colors.divider,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <PersonaCard collapsed={collapsed} />
    </nav>
  );
}

// Persona switcher pinned to the bottom-left of the sidebar: fictional person
// name + role, avatar with initials, and an upward Menu to switch personas.
function PersonaCard({ collapsed }: { collapsed: boolean }) {
  const { roleId, setRoleId, lang } = useApp();
  const t = UI[lang];
  const { data: roles } = useListRoles();

  React.useEffect(() => {
    if (roles && roles.length > 0 && !roleId) {
      // Default to the Brand Manager persona: broad clearance, so a first-time
      // visitor sees the Hub with most content visible rather than blocked.
      const preferred = roles.find((r) => r.id === "role-brand") ?? roles[0];
      setRoleId(preferred.id);
    }
  }, [roles, roleId, setRoleId]);

  const active = roles?.find((r) => r.id === roleId);
  const initials = (active?.name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      style={{
        borderTop: `1px solid ${skinVars.colors.divider}`,
        padding: collapsed ? "10px 8px" : "10px 12px",
        flexShrink: 0,
      }}
    >
      <Menu
        position="left"
        width={340}
        renderTarget={({ ref, onPress, isMenuOpen }) => (
          <Touchable
            onPress={onPress}
            aria-label={`${t.topbar.persona}: ${active?.name ?? ""}`}
          >
            <div
              ref={ref}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "6px 0" : "8px 10px",
                borderRadius: skinVars.borderRadii.button,
                backgroundColor: isMenuOpen
                  ? skinVars.colors.brandLow
                  : "transparent",
                transition: "background-color 150ms ease",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: skinVars.borderRadii.avatar,
                  backgroundColor: skinVars.colors.brandLow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Text2 medium color={skinVars.colors.brand}>
                  {initials || "?"}
                </Text2>
              </div>
              {!collapsed && (
                <>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {active?.name ?? "—"}
                      </Text2>
                    </div>
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {active ? `${active.label} (${active.clearance})` : ""}
                      </Text1>
                    </div>
                  </div>
                  <IconChevronDownRegular
                    size={12}
                    color={skinVars.colors.neutralMedium}
                  />
                </>
              )}
            </div>
          </Touchable>
        )}
        renderMenu={({ ref, className, close }) => (
          <div ref={ref} className={className}>
            {(roles ?? []).map((r) => (
              <MenuItem
                key={r.id}
                label={`${r.name} — ${r.label}`}
                controlType="checkbox"
                checked={r.id === roleId}
                onPress={() => {
                  setRoleId(r.id);
                  close();
                }}
              />
            ))}
          </div>
        )}
      />
    </div>
  );
}

// Compact one-line "label: value" picker built from Mística primitives
// (Touchable + Menu), so the topbar stays thin without leaving the design
// system. The full-height labeled Select is deliberately not used here.
function CompactSelect({
  label,
  value,
  options,
  onChange,
  menuWidth,
}: {
  label: string;
  value: string;
  options: { value: string; text: string }[];
  onChange: (v: string) => void;
  menuWidth?: number;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Menu
      position="right"
      width={menuWidth}
      renderTarget={({ ref, onPress, isMenuOpen }) => (
        <Touchable
          onPress={onPress}
          aria-label={`${label}: ${current?.text ?? ""}`}
        >
          <div
            ref={ref}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: skinVars.borderRadii.button,
              border: `1px solid ${skinVars.colors.border}`,
              backgroundColor: isMenuOpen
                ? skinVars.colors.brandLow
                : "transparent",
              transition: "background-color 150ms ease",
              whiteSpace: "nowrap",
            }}
          >
            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
              {label}
            </Text1>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {current?.text ?? "—"}
            </Text2>
            <IconChevronDownRegular
              size={12}
              color={skinVars.colors.neutralMedium}
            />
          </div>
        </Touchable>
      )}
      renderMenu={({ ref, className, close }) => (
        <div ref={ref} className={className}>
          {options.map((o) => (
            <MenuItem
              key={o.value}
              label={o.text}
              controlType="checkbox"
              checked={o.value === value}
              onPress={() => {
                onChange(o.value);
                close();
              }}
            />
          ))}
        </div>
      )}
    />
  );
}

function Topbar() {
  const { area, setArea, lang, setLang } = useApp();
  const t = UI[lang];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "6px 24px",
        flexShrink: 0,
        backgroundColor: skinVars.colors.backgroundContainer,
        borderBottom: `1px solid ${skinVars.colors.divider}`,
      }}
    >
      <Text4 medium color={skinVars.colors.textPrimary}>
        Hub SSoT
      </Text4>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CompactSelect
          label={t.topbar.language}
          value={lang}
          onChange={(v) => setLang(v as Lang)}
          options={[
            { value: "ES", text: "Español" },
            { value: "EN", text: "English" },
            { value: "DE", text: "Deutsch" },
            { value: "PT", text: "Português" },
          ]}
        />
        <CompactSelect
          label={t.topbar.area}
          value={area}
          onChange={(v) => setArea(v as "Comunicación" | "Marca" | "Gabinete")}
          options={[
            { value: "Comunicación", text: "Comunicación" },
            { value: "Marca", text: "Marca" },
            { value: "Gabinete", text: "Gabinete" },
          ]}
        />
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
        height: "100%",
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
