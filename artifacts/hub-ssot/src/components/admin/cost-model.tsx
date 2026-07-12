import React from "react";
import { useGetUsageMeter } from "@workspace/api-client-react";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Grid,
  Divider,
  Tag,
  Callout,
  TextField,
  Checkbox,
  Text1,
  Text2,
  Text3,
  Text5,
  Title3,
  skinVars,
  IconCreditBalanceEuroRegular,
  IconDataCheckedRegular,
} from "@telefonica/mistica";
import { useApp } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";

// The PC5 cost model: three blocks (one-time implementation, platform licence
// by seat bracket, usage/token consumption by seat bracket) driven by a live
// seat selector and editable assumptions. All figures are ILLUSTRATIVE — the
// RFP marks real pricing as pending — but the usage block is grounded in the
// platform's own metered agent calls, not invented consumption.

const SEAT_BRACKETS = [50, 100, 150, 200] as const;

// Illustrative volume discount per bracket on the per-seat licence.
const BRACKET_DISCOUNT: Record<number, number> = {
  50: 0,
  100: 0.05,
  150: 0.1,
  200: 0.15,
};

const DEFAULT_ASSUMPTIONS = {
  setupFee: "48000",
  perSeatMonthly: "42",
  pricePerMTokens: "9",
  interactionsPerUserMonth: "60",
  amortYears: "3",
};

function eur(n: number): string {
  return n.toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function CostBlock({
  label,
  cadence,
  amount,
  detail,
  highlight,
}: {
  label: string;
  cadence: string;
  amount: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <Boxed>
      <Box padding={20}>
        <Stack space={8}>
          <Inline space="between" alignItems="center">
            <Text1 medium color={skinVars.colors.brand} transform="uppercase">
              {label}
            </Text1>
            <Tag type={highlight ? "promo" : "inactive"}>{cadence}</Tag>
          </Inline>
          <Text5 color={skinVars.colors.textPrimary}>{amount}</Text5>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {detail}
          </Text2>
        </Stack>
      </Box>
    </Boxed>
  );
}

export default function CostModelSection() {
  const { lang } = useApp();
  const t = ADMIN_I18N[lang].cost;
  const locale = localeFor(lang);
  const { data: usage } = useGetUsageMeter({
    query: { queryKey: ["usage-meter"] },
  });

  const [seats, setSeats] = React.useState<number>(100);
  const [a, setA] = React.useState({ ...DEFAULT_ASSUMPTIONS });
  const [runOnly, setRunOnly] = React.useState(false);

  const set = (k: keyof typeof DEFAULT_ASSUMPTIONS) => (v: string) =>
    setA((prev) => ({ ...prev, [k]: v }));

  const setupFee = num(a.setupFee);
  const perSeatMonthly = num(a.perSeatMonthly);
  const pricePerMTokens = num(a.pricePerMTokens);
  const interactions = num(a.interactionsPerUserMonth);
  const amortYears = Math.max(1, Math.round(num(a.amortYears)) || 1);

  // Usage grounding: average tokens per agent interaction, from the app's own
  // metered calls. Falls back to a stated default before any calls exist.
  const totals = usage?.totals;
  const observedCalls = totals?.calls ?? 0;
  const observedTokens = (totals?.inputTokens ?? 0) + (totals?.outputTokens ?? 0);
  const avgTokensPerCall =
    observedCalls > 0 ? Math.round(observedTokens / observedCalls) : 1500;

  const discount = BRACKET_DISCOUNT[seats] ?? 0;
  const platformAnnual = seats * perSeatMonthly * 12 * (1 - discount);

  const tokensPerYear = seats * interactions * 12 * avgTokensPerCall;
  const usageAnnual = (tokensPerYear / 1_000_000) * pricePerMTokens;

  const amortisedSetup = setupFee / amortYears;
  const annualTotal = platformAnnual + usageAnnual + (runOnly ? amortisedSetup : 0);
  const firstYearTotal = runOnly
    ? annualTotal
    : setupFee + platformAnnual + usageAnnual;

  return (
    <Stack space={16}>
      <Stack space={4}>
        <Inline space={8} alignItems="center">
          <IconCreditBalanceEuroRegular color={skinVars.colors.brand} />
          <Title3>{t.title}</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.intro}
        </Text2>
      </Stack>

      <Callout
        variant="default"
        asset={<IconDataCheckedRegular color={skinVars.colors.brand} />}
        title=""
        description={
          observedCalls > 0
            ? t.liveEstimatorInput(
                observedCalls,
                observedCalls.toLocaleString(locale),
                observedTokens.toLocaleString(locale),
                new Date(usage?.since ?? "").toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
                avgTokensPerCall.toLocaleString(locale),
              )
            : t.noCalls
        }
      />

      {/* Seat bracket selector */}
      <Inline space={8} alignItems="center" wrap>
        <Text2 medium color={skinVars.colors.textPrimary}>
          {t.seats}
        </Text2>
        {SEAT_BRACKETS.map((s) => (
          <div
            key={s}
            role="button"
            tabIndex={0}
            onClick={() => setSeats(s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSeats(s);
            }}
            style={{
              cursor: "pointer",
              padding: "8px 20px",
              borderRadius: skinVars.borderRadii.button,
              border: `1px solid ${seats === s ? skinVars.colors.brand : skinVars.colors.border}`,
              backgroundColor: seats === s ? skinVars.colors.brand : "transparent",
            }}
          >
            <Text2
              medium
              color={seats === s ? skinVars.colors.textPrimaryInverse : skinVars.colors.textPrimary}
            >
              {s}
            </Text2>
          </div>
        ))}
        {discount > 0 && (
          <Tag type="success">{t.volumeDiscountTag(Math.round(discount * 100))}</Tag>
        )}
      </Inline>

      {/* Three cost blocks */}
      <Grid columns={3} gap={16}>
        <CostBlock
          label={t.block1Label}
          cadence={runOnly ? t.cadenceAmortised(amortYears) : t.cadenceOneTime}
          amount={runOnly ? t.perYear(eur(amortisedSetup)) : eur(setupFee)}
          detail={
            runOnly
              ? t.block1DetailAmort(eur(setupFee), amortYears)
              : t.block1Detail
          }
        />
        <CostBlock
          label={t.block2Label}
          cadence={t.cadenceAnnual}
          amount={t.perYear(eur(platformAnnual))}
          detail={t.block2Detail(seats, eur(perSeatMonthly), Math.round(discount * 100))}
        />
        <CostBlock
          label={t.block3Label}
          cadence={t.cadenceAnnual}
          amount={t.perYear(eur(usageAnnual))}
          detail={t.block3Detail(
            seats,
            interactions,
            avgTokensPerCall.toLocaleString(locale),
            (tokensPerYear / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 }),
            eur(pricePerMTokens),
          )}
          highlight={observedCalls > 0}
        />
      </Grid>

      {/* Totals */}
      <Boxed>
        <Box padding={20}>
          <Inline space="between" alignItems="center">
            <Stack space={4}>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {runOnly ? t.totalRunOnlyTitle : t.totalFirstYearTitle}
              </Text2>
              <Text1 regular color={skinVars.colors.textSecondary}>
                {runOnly
                  ? t.totalRunOnlySub
                  : t.totalFirstYearSub(eur(platformAnnual + usageAnnual))}
              </Text1>
            </Stack>
            <Text5 color={skinVars.colors.brand}>
              {runOnly ? t.perYear(eur(annualTotal)) : eur(firstYearTotal)}
            </Text5>
          </Inline>
        </Box>
      </Boxed>

      {/* Assumptions */}
      <Boxed>
        <Box padding={20}>
          <Stack space={16}>
            <Inline space="between" alignItems="center">
              <Text2 medium color={skinVars.colors.textPrimary}>
                {t.assumptions}
              </Text2>
              <Checkbox name="run-only" checked={runOnly} onChange={setRunOnly}>
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {t.runOnlyCheckbox}
                </Text2>
              </Checkbox>
            </Inline>
            <Divider />
            <Grid columns={3} gap={16}>
              <TextField
                name="setup-fee"
                label={t.fieldSetupFee}
                value={a.setupFee}
                onChangeValue={set("setupFee")}
                fullWidth
              />
              <TextField
                name="per-seat"
                label={t.fieldPerSeat}
                value={a.perSeatMonthly}
                onChangeValue={set("perSeatMonthly")}
                fullWidth
              />
              <TextField
                name="token-price"
                label={t.fieldTokenPrice}
                value={a.pricePerMTokens}
                onChangeValue={set("pricePerMTokens")}
                fullWidth
              />
              <TextField
                name="interactions"
                label={t.fieldInteractions}
                value={a.interactionsPerUserMonth}
                onChangeValue={set("interactionsPerUserMonth")}
                fullWidth
              />
              <TextField
                name="amort-years"
                label={t.fieldAmortYears}
                value={a.amortYears}
                onChangeValue={set("amortYears")}
                disabled={!runOnly}
                fullWidth
              />
            </Grid>
            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.assumptionsNote}
            </Text1>
          </Stack>
        </Box>
      </Boxed>
    </Stack>
  );
}
