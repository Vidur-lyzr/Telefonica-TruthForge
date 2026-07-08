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
          <Title3>Cost model</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          Three blocks — one-time implementation, platform licence and usage —
          driven by the seat bracket and editable assumptions. All prices are
          illustrative: the RFP marks real figures as pending. The usage block
          is grounded in this platform's own metered agent calls.
        </Text2>
      </Stack>

      <Callout
        variant="default"
        asset={<IconDataCheckedRegular color={skinVars.colors.brand} />}
        title=""
        description={
          observedCalls > 0
            ? `Live estimator input: ${observedCalls.toLocaleString("en-GB")} metered agent call${observedCalls === 1 ? "" : "s"} totalling ${observedTokens.toLocaleString("en-GB")} tokens since ${new Date(usage?.since ?? "").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} — an average of ${avgTokensPerCall.toLocaleString("en-GB")} tokens per interaction.`
            : "No agent calls metered yet — the estimator uses a stated default of 1,500 tokens per interaction until real usage accumulates."
        }
      />

      {/* Seat bracket selector */}
      <Inline space={8} alignItems="center" wrap>
        <Text2 medium color={skinVars.colors.textPrimary}>
          Seats
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
          <Tag type="success">{`volume discount ${Math.round(discount * 100)}%`}</Tag>
        )}
      </Inline>

      {/* Three cost blocks */}
      <Grid columns={3} gap={16}>
        <CostBlock
          label="Block 1 · Set-up"
          cadence={runOnly ? `amortised / ${amortYears} yr` : "one-time"}
          amount={runOnly ? `${eur(amortisedSetup)} / yr` : eur(setupFee)}
          detail={
            runOnly
              ? `Run-only packaging: the ${eur(setupFee)} implementation is folded into the annual fee across ${amortYears} year${amortYears === 1 ? "" : "s"}.`
              : "Implementation, ingestion of the governed corpus, connectors and go-live. Paid once."
          }
        />
        <CostBlock
          label="Block 2 · Platform"
          cadence="annual"
          amount={`${eur(platformAnnual)} / yr`}
          detail={`${seats} seats at ${eur(perSeatMonthly)}/seat/month${discount > 0 ? `, less ${Math.round(discount * 100)}% volume discount` : ""}.`}
        />
        <CostBlock
          label="Block 3 · Usage"
          cadence="annual"
          amount={`${eur(usageAnnual)} / yr`}
          detail={`${seats} seats making ${interactions} interactions/month at about ${avgTokensPerCall.toLocaleString("en-GB")} tokens each — roughly ${(tokensPerYear / 1_000_000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}M tokens/year at ${eur(pricePerMTokens)} per million.`}
          highlight={observedCalls > 0}
        />
      </Grid>

      {/* Totals */}
      <Boxed>
        <Box padding={20}>
          <Inline space="between" alignItems="center">
            <Stack space={4}>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {runOnly ? "Annual fee (run-only)" : "First year total"}
              </Text2>
              <Text1 regular color={skinVars.colors.textSecondary}>
                {runOnly
                  ? "No upfront payment — set-up amortised into the annual fee."
                  : `Set-up plus first annual platform and usage. From year two: ${eur(platformAnnual + usageAnnual)} / yr.`}
              </Text1>
            </Stack>
            <Text5 color={skinVars.colors.brand}>
              {runOnly ? `${eur(annualTotal)} / yr` : eur(firstYearTotal)}
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
                Assumptions (editable, illustrative)
              </Text2>
              <Checkbox name="run-only" checked={runOnly} onChange={setRunOnly}>
                <Text2 regular color={skinVars.colors.textPrimary}>
                  Run-only packaging (no upfront set-up)
                </Text2>
              </Checkbox>
            </Inline>
            <Divider />
            <Grid columns={3} gap={16}>
              <TextField
                name="setup-fee"
                label="Set-up fee (EUR, one-time)"
                value={a.setupFee}
                onChangeValue={set("setupFee")}
                fullWidth
              />
              <TextField
                name="per-seat"
                label="Licence per seat (EUR/month)"
                value={a.perSeatMonthly}
                onChangeValue={set("perSeatMonthly")}
                fullWidth
              />
              <TextField
                name="token-price"
                label="Price per 1M tokens (EUR)"
                value={a.pricePerMTokens}
                onChangeValue={set("pricePerMTokens")}
                fullWidth
              />
              <TextField
                name="interactions"
                label="Interactions per user / month"
                value={a.interactionsPerUserMonth}
                onChangeValue={set("interactionsPerUserMonth")}
                fullWidth
              />
              <TextField
                name="amort-years"
                label="Amortisation period (years)"
                value={a.amortYears}
                onChangeValue={set("amortYears")}
                disabled={!runOnly}
                fullWidth
              />
            </Grid>
            <Text1 regular color={skinVars.colors.textSecondary}>
              Volume discounts by bracket are fixed for the illustration: 50
              seats 0%, 100 seats 5%, 150 seats 10%, 200 seats 15%. Tokens per
              interaction come from the live meter above, never from a manual
              entry. Where the provider does not report exact token counts, the
              meter records a conservative estimate, so treat the usage figure
              as indicative rather than invoice-precise.
            </Text1>
          </Stack>
        </Box>
      </Boxed>
    </Stack>
  );
}
