# MATH.md — Formulas used in this project

All UI numbers should be traceable to a formula here plus a source in
`BENCHMARKS.md` / `DATA_SPEC.md`. If it is not listed, label it illustrative.

Last updated: 2026-07-23

### Units convention (hourly grid data)

Processed series are **hourly**. For a 1-hour interval, average power in MW and
energy in MWh are numerically equal:

\[
1\,\text{MW} \times 1\,\text{h} = 1\,\text{MWh}
\]

So \(\sum_h x_h\) over a day’s hourly MW values is treated as **MWh/day** (EV
daily energy, CAISO load energy share, fuel-mix generation totals, storage
charge/discharge). Hourly profiles labeled `*_MW` are average power in that
hour, equivalent to MWh allocated to that hour. This is standard for hourly
ISO datasets; it is not an SI conversion beyond \(\Delta t = 1\,\text{h}\).

Carbon mass uses **US customary** units: lb CO₂ and **US short tons**
(\(1\,\text{short ton} = 2000\,\text{lb}\)), not SI tonnes.

---

## 1. Net load (CAISO duck / canyon)

\[
\text{net\_load\_MW}(t) = \text{load\_MW}(t) - \text{solar\_MW}(t) - \text{wind\_MW}(t)
\]

- **load** = CA ISO-TAC hourly system demand (via `gridstatus`)
- **solar / wind** = hourly mean of 5-min CAISO fuel-mix columns
- Overnight small negatives in solar/wind are clipped to 0 before this subtraction

**Gap identity (what the gold/blue fill shows):**

\[
\text{load}(t) - \text{net\_load}(t) = \text{solar}(t) + \text{wind}(t)
\]

Chart stacking in that gap:

- Wind band: \([\text{net\_load},\; \text{net\_load} + \text{wind}]\)
- Solar band: \([\text{net\_load} + \text{wind},\; \text{load}]\)

---

## 2. Evening ramp rate (MW/h)

Find the daytime belly = minimum net load for hours 09:00–16:00.
Find the evening peak = maximum net load at or after that belly hour.

\[
\text{ramp\_MW/h} = \frac{\text{net\_peak} - \text{net\_belly}}{\text{hour\_peak} - \text{hour\_belly}}
\]

This is an average climb over that window, not the steepest single-hour slope.

**Ramp relief (Fleet mix vs unmanaged):** belly and peak **hours** are locked
from **grid-only** net load (no EV). Both the unmanaged series
(\(\text{net} + \text{ev}^{\text{unmanaged}}\)) and the mixed series
(\(\text{net} + \text{ev}^{\text{mix}}\)) are evaluated on that same hour pair:

\[
\text{rate}(s) = \frac{s(\text{hour\_peak}) - s(\text{hour\_belly})}{\text{hour\_peak} - \text{hour\_belly}}
\]

\[
\text{rampRelief} = \text{rate}(\text{unmanaged}) - \text{rate}(\text{mix})
\]

Chart annotations may still show a series' own belly→peak chord; relief always
uses the fixed grid anchors so the two rates are comparable.

**Deep belly caveat:** when solar + wind ≈ load, net load is a small residual
and is more sensitive to aggregation error; net-weighted EV shift and belly
location inherit that sensitivity.

---

## 3. EV charging load (CEC shape × population × miles)

Hourly share \(s_h\) from CEC 2022 IEPR PEV shapes (season/day-type matched), \(\sum_{h=0}^{23} s_h = 1\).

\[
E_{\text{day}}\;(\text{MWh}) = \frac{N_{\text{EV}} \times m \times k}{1000}
\]

\[
\text{ev\_load\_MW}_h = E_{\text{day}} \times s_h
\quad\text{(MW as 1-hour average power; } E_{\text{day}}\text{ in MWh, } s_h \text{ dimensionless)}
\]

Because \(\Delta t = 1\,\text{h}\), \(E_{\text{day}} \times s_h\) has units MWh and
equals average MW in hour \(h\). Summing hourly EV MW over the day recovers
\(E_{\text{day}}\) in MWh.
| Symbol | Value | Source |
|---|---|---|
| \(N_{\text{EV}}\) | 1,981,000 | AFDC 2024 BEV + PHEV |
| \(m\) | **27.9** mi/day primary (FHWA 2023 CA average); 20 / 33 what-if | mid / low / high scenarios |
| \(k\) | 0.30 kWh/mi | DOE / EPA / NREL planning range |

\[
\text{net\_load\_plus\_ev}_h = \text{net\_load}_h + \text{ev\_load\_MW}_h
\]

**Double-count honesty:** CAISO metered load already embeds some EV charging.
Overlaying a full \(N_0\) profile on that day is a **counterfactual shape**, not
proven incremental MW. The UI labels that case accordingly.

**Validation:** at the former NHTS-era mid (27 mi/day), daily energy ≈ CEC’s own summer-weekday `raw_mw` sum (~16,055 MWh) → ~1.00×. Primary mid is now **27.9** mi/day (FHWA), so modeled energy at \(N_0\) is ~16,581 MWh/day (~3.3% higher).

---

## 3b. Adoption scaling (fleet stress test)

Baseline plug-in stock \(N_0 = 1{,}981{,}000\) (AFDC 2024 BEV+PHEV).  
California light-duty on-road population \(N_{\text{LDV}} = 29{,}657{,}259\) (CEC vehicle-population workbook, data as of 2025-12-31; confirmed 2026-07-22).

Fleet size for a scenario:

\[
N = a \cdot N_{\text{LDV}}
\quad\text{or}\quad
N = s \cdot N_0
\]

where \(a\) is share of CA LDV (e.g. 0.5, 1.0) and \(s\) is a multiple of today’s AFDC plug-in fleet.

Today’s implied share (display only; AFDC year and CEC stock year differ by one):

\[
a_0 = N_0 / N_{\text{LDV}} \approx 6.68\%
\]

Hourly EV load scales with fleet (same CEC shape \(s_h\), same \(m,k\)):

\[
E_{\text{day}}(N) = \frac{N \cdot m \cdot k}{1000},\quad
\text{ev}_h^{\text{total}}(N) = E_{\text{day}}(N) \cdot s_h
\]

Equivalently, scale a baseline series built at \(N_0\) by \(N / N_0\).

**Incremental overlay (choice A, when \(N > N_0\)):** chart and primary peak/ramp
metrics use signed growth (mix at same participation \(p\)):

\[
\text{ev}_h^{\text{chart}} = \text{ev}_h^{\text{mix}}(N,p) - \text{ev}_h^{\text{mix}}(N_0,p)
\]

No floor: \(\sum_h \text{ev}_h^{\text{chart}} = E(N) - E(N_0)\). A negative hour means
below today’s modeled mix that hour (reshape), not a data error.

Share URLs still carry \(a\) / \(s\) / \(p\); only the plotted series changes.
When \(N \le N_0\), the chart shows the full counterfactual profile with a
double-count caveat (load already embeds some EVs; overlay is not incremental MW).

Share of that CAISO day’s energy (using the **chart** series):

\[
\%_{\text{CAISO}} = \frac{\sum_h \text{ev}_h^{\text{chart}}}{\sum_h \text{load}_h} \times 100
\]

Managed participation \(p \in [0,1]\) (illustrative, **Adoption**): keep daily energy, mix unmanaged CEC with a **net-load-weighted** (lowest-strain) shape. Weights use one pass on \(\text{net} + \text{ev}^{\text{CEC}}(N)\) (feedback), still illustrative:

\[
\text{ev}^{\text{mix}}_h = (1-p)\,\text{ev}^{\text{CEC}}_h + p\,\text{ev}^{\text{opt}}_h
\]

The Cost page still uses a separate midday solar DR shape for its schedule bill story (see §4).

**Label required:** illustrative scale-up with fixed CEC shape and kWh/car.
Not a forecast of where incremental charging lands, when stock turns over, or
how behavior and rates reshape the day; not an RA study or distribution
analysis. Uniform linear scale is chosen because inventing location and
behavior would be less honest than scaling a known shape.

---

## 4. Charging shapes (illustrative)

### 4a. Net-load-weighted (Adoption stress mix)

Unmanaged loads \(\text{ev}_h\) come from the CEC shape (§3), scaled to fleet \(N\).

Optimized loads keep the **same daily energy** \(E = \sum_h \text{ev}_h\), redistributed
toward hours when **net + unmanaged EV** is lowest (one-pass feedback):

\[
n_h = \text{net}_h + \text{ev}^{\text{CEC}}_h,\quad
w_h = \max(n_{\max} - n_h,\, 0) + \varepsilon
\]

\[
\text{ev}^{\text{opt}}_h = E \times \frac{w_h}{\sum_j w_j}
\]

\(\varepsilon > 0\) keeps every hour eligible if the series is flat. **Label as illustrative** —
not a utility DR schedule.

### 4b. Midday solar window (Cost page schedules)

Cost-page “midday” loads keep the same daily energy \(E\), redistributed
into hours 10–15 (inclusive), weighted by solar:

\[
w_h = \begin{cases}\max(\text{solar}_h, 0) & h \in \{10,\ldots,15\} \\ 0 & \text{otherwise}\end{cases}
\]

\[
\text{ev}^{\text{managed}}_h = E \times \frac{w_h}{\sum_j w_j}
\]

If \(\sum w = 0\), use equal shares over those six hours. **Label as illustrative** —
not a utility DR schedule.

---

## 5. TOU cost · three schedules

For plan \(p\) and shape \(s\) (CEC, midday managed, or off-peak-only), rate \(r_h\) in ¢/kWh.
Only hours with a defined TOU rate enter the weight; renormalize over that energy:

\[
E_{\text{rated}} = \sum_{h:\, r_h \text{ defined}} \text{ev}^{s}_h, \quad
\bar{r}_{p,s} = \sum_{h:\, r_h \text{ defined}} \left(\frac{\text{ev}^{s}_h}{E_{\text{rated}}}\right) r_h
\]

If \(E_{\text{rated}} = 0\) (no overlap of shape energy with rated hours), fall back to the
equal mean of available rates for that plan/season. Then bill full daily car energy at \(\bar{r}\):

\[
\text{¢/car·day}_{p,s} = (m \times k) \times \bar{r}_{p,s}
\]

\[
\$/\text{car·year} = 365 \times \text{¢/car·day} / 100, \quad \$/\text{car·month} = \$/\text{car·year} / 12
\]

UI headlines use year and month; day is secondary. Fleet = multiply by car count \(N\).

Off-peak shape: same daily energy \(E\), equal split across hours at the plan's minimum rate.

**Label required:** simplified model; not a utility bill. On EV-B (overnight-cheap),
midday can cost *more* than CEC night; the UI shows that honestly.

---

## 7. Carbon intensity (operational stack)

Hourly CAISO fuel mix \(g_{f,t}\) (MW). Emission factors \(EF_f\) (lb CO₂/MWh)
from `data/processed/emission_factors.csv`.

Generation counted in the mix (for each hour, MW × 1 h ≡ MWh):

- All fuels in the stack with `include_in_ci=true`, MW floored at 0
- **Batteries:** only discharge (\(g > 0\)) at \(EF=0\); charging excluded

\[
CI_t = \frac{\sum_f g_{f,t}^{+} \cdot EF_f}{\sum_f g_{f,t}^{+}}
\quad\text{(lb CO₂/MWh)}
\]

Daily operational-stack CO₂ (Fuel page) sums \(g^{+} \cdot EF\) over hours and
fuels (lb), then divides by 2000 for **US short tons**. Midday vs evening
“lb CO₂ per car charge” multiplies generation-weighted average CI in that
window by one car’s daily energy (kWh→MWh). That uses **average** stack
intensity in the window, not marginal or lifecycle emissions.

**Imports** use EPA eGRID2023 **CAMX** annual average **428.5 lb CO₂/MWh** as a
proxy for unknown import mix — not the true hourly import carbon.

Natural gas (~910) and coal (~2180) are EIA/EPA **order-of-magnitude** planning
EFs, not plant-specific. Zero EF for solar/wind/nuclear/hydro per eGRID
non-combustion convention. Biogenic biomass/biogas CO₂ excluded here.

---

## 8. Storage sizing (back-of-envelope BESS)

Window \(W\): hours 09:00–21:00 inclusive (9 a.m.–9 p.m.).

\[
T = \overline{\text{net\_load}}_W
\]

\[
E_{\text{charge}} = \sum_{h \in W} \max(T - \text{net}_h, 0)
\quad\text{(MWh; each term is MW} \times 1\text{ h)}
\]

\[
E_{\text{discharge}} = \sum_{h \in W} \max(\text{net}_h - T, 0)
\]

\[
P = \max_{h \in W} |\text{net}_h - T|
\quad\text{(MW)}
\]

\[
E_{\text{usable}} = \max(E_{\text{charge}}, E_{\text{discharge}})
\quad\text{(lossless shift; primary illustrative energy)}
\]

\[
E_{\text{nameplate}} = E_{\text{usable}} / \eta, \quad \eta = 0.90
\quad\text{(optional uplift only; chart bars stay lossless)}
\]

\[
\text{duration (h)} = E_{\text{usable}} / P
\]

Assumptions: perfect foresight, hourly averages, no interconnection limits,
no RA/NQC derates. Charge/discharge path is **lossless**; \(\eta\) is not applied
to the bars. **Not a chronological SOC dispatch** (hour order and intermediate
state-of-charge are not simulated). **Illustrative only.**

---

## 9. Peak-day sanity check (pull script)

For known CAISO peak days, hourly max load should land within ±1,500 MW of the
published instantaneous peak (hourly means are lower than 5-min peaks).

| Date | Published peak | Tolerance |
|---|---|---|
| 2025-08-21 | 44,506 MW | ±1,500 MW |
| 2024-09-05 | 48,323 MW | ±1,500 MW |
