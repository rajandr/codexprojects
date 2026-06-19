# Export LC and XL Bill Data Model - LLM Reference

This document explains the Export Letter of Credit, called `EL`, and Export Bill, called `XL`, data model for Oracle.

It is written for LLMs and engineers who need to reason about how mutable lifecycle data becomes immutable controlled instrument data.

## 1. Core Idea

The model separates:

| Concept | Meaning |
|---|---|
| `INSTRUMENT` | The parent Export LC header. It exists for the EL and remains visible before and after control. |
| `LIFE_CYCLE` | A mutable transaction cycle, such as EL advising, EL amendment, bill presentation, bill update, or bill settlement. |
| Attribute tables | Business data tables such as `LC_DETAILS`, `PARTY_DETAILS`, and `BILL_DETAILS`. |
| `INSTRUMENT_EVENTS` | Post-control event history table. It records the timeline after each lifecycle is controlled. |

The same attribute tables store both:

| Row Type | How It Is Identified |
|---|---|
| Mutable working row | `LINK_TYPE = 'LIFE_CYCLE'`, `LINK_ID = LIFE_CYCLE.LCY_ID` |
| Immutable controlled snapshot | `LINK_TYPE = 'INSTRUMENT'`, `LINK_ID = INSTRUMENT.INSTRUMENT_ID` |

## 2. Important Terms

| Term | Meaning |
|---|---|
| `EL` | Export Letter of Credit. |
| `XL` | Export bill under an Export LC. |
| `VERSION` | Export LC version. This name is kept for backward compatibility. |
| `CLAIM_ID` | Stable bill identity, for example `XL-7001`. Null for EL-level rows. |
| `CLAIM_VERSION` | Version of a bill claim lifecycle. Null for EL-level rows. |
| `PARTY_SCOPE` | Separates EL parties from XL bill parties. Values are `EL` and `XL`. |
| `LINK_ID` | Conditional link to either `LIFE_CYCLE.LCY_ID` or `INSTRUMENT.INSTRUMENT_ID`. |
| `LINK_TYPE` | Tells whether `LINK_ID` points to `LIFE_CYCLE` or `INSTRUMENT`. |

## 3. Golden Rules

| Rule | Meaning |
|---|---|
| `INSTRUMENT` exists before and after control | Do not hide the instrument header just because a lifecycle is still mutable. |
| `INSTRUMENT_EVENTS` is post-control only | It receives entries only after a lifecycle is controlled. |
| `LINK_TYPE = 'LIFE_CYCLE'` | Row is mutable and belongs to the current transaction lifecycle. |
| `LINK_TYPE = 'INSTRUMENT'` | Row is an immutable controlled snapshot. |
| `CLAIM_ID IS NULL` | Row belongs to the Export LC itself. |
| `CLAIM_ID IS NOT NULL` | Row belongs to an XL bill under the Export LC. |
| `PARTY_SCOPE = 'EL'` | Party row belongs to the Export LC. |
| `PARTY_SCOPE = 'XL'` | Party row belongs to a bill claim. |
| `VERSION` | Always means Export LC version. |
| `CLAIM_VERSION` | Always means bill claim version. |

## 4. Tables

### 4.1 INSTRUMENT

The `INSTRUMENT` table is the parent EL header.

It exists before and after control.

| Column | Meaning |
|---|---|
| `INSTRUMENT_ID` | Primary key of the Export LC instrument. |
| `VERSION` | Latest controlled Export LC version. |
| `LATEST_LIFECYCLE_ID` | Latest lifecycle applied to the instrument. |
| `REFERENCE_NO` | Export LC reference number. |
| `BRANCH_NAME` | Branch that owns the instrument. |

Example:

| INSTRUMENT_ID | VERSION | LATEST_LIFECYCLE_ID | REFERENCE_NO | BRANCH_NAME |
|---:|---:|---:|---|---|
| 1001 | 4 | 5008 | EL-2026-0001 | Mumbai Main |

### 4.2 LIFE_CYCLE

The `LIFE_CYCLE` table records a mutable transaction cycle.

Each lifecycle belongs to an instrument.

| Column | Meaning |
|---|---|
| `LCY_ID` | Primary key of the lifecycle. |
| `INSTRUMENT_ID` | Parent instrument ID. |
| `EVENT` | Lifecycle event type. |
| `STATUS` | `INPUT`, `CONTROLLED`, etc. |
| `VERSION` | Export LC version. |
| `CLAIM_ID` | Null for EL events, filled for XL bill events. |
| `CLAIM_VERSION` | Null for EL events, filled for XL bill events. |

Common events:

| EVENT | Meaning |
|---|---|
| `EL_ADVISE` | New Export LC advising. |
| `EL_AMEND` | Export LC amendment. |
| `BILL_NEW` | New bill presentation under the Export LC. |
| `BILL_UPDATE` | Update to an existing bill. |
| `BILL_SETTLE` | Bill settlement. |

### 4.3 LC_DETAILS

The `LC_DETAILS` table stores LC amount, expiry, unutilized amount, and liability values.

| Column | Meaning |
|---|---|
| `LINK_ID` | `LCY_ID` when lifecycle row, `INSTRUMENT_ID` when controlled snapshot. |
| `LINK_TYPE` | `LIFE_CYCLE` or `INSTRUMENT`. |
| `VERSION` | Export LC version. |
| `CLAIM_ID` | Null for EL-level LC details, filled when recording bill impact rows. |
| `CLAIM_VERSION` | Bill claim version when `CLAIM_ID` is filled. |
| `EL_AMOUNT` | Authorized Export LC amount. |
| `EXPIRY` | LC expiry date. |
| `UNUTILIZED` | Remaining unutilized amount. |
| `LC_LIABILITY` | Liability amount. |

### 4.4 PARTY_DETAILS

The `PARTY_DETAILS` table stores both EL parties and XL bill parties.

| Column | Meaning |
|---|---|
| `PARTY_ID` | Party row ID. |
| `LINK_ID` | `LCY_ID` or `INSTRUMENT_ID`. |
| `LINK_TYPE` | `LIFE_CYCLE` or `INSTRUMENT`. |
| `VERSION` | Export LC version. |
| `CLAIM_ID` | Null for EL parties, filled for XL bill parties. |
| `CLAIM_VERSION` | Null for EL parties, filled for XL bill parties. |
| `PARTY_SCOPE` | `EL` or `XL`. |
| `PARTY_ROLE` | Role, such as `BENEFICIARY`, `APPLICANT`, `MANUFACTURER`, `PRESENTING_BANK`. |
| `PARTY_NAME` | Party name. |

EL party example:

| PARTY_SCOPE | CLAIM_ID | PARTY_ROLE | PARTY_NAME |
|---|---|---|---|
| EL | null | BENEFICIARY | ABC Exports |

XL party example:

| PARTY_SCOPE | CLAIM_ID | CLAIM_VERSION | PARTY_ROLE | PARTY_NAME |
|---|---|---:|---|---|
| XL | XL-7001 | 1 | MANUFACTURER | ABC Factory |

### 4.5 BILL_DETAILS

The `BILL_DETAILS` table stores XL bill-specific data.

| Column | Meaning |
|---|---|
| `BILL_ID` | Bill details row ID. |
| `LINK_ID` | `LCY_ID` or `INSTRUMENT_ID`. |
| `LINK_TYPE` | `LIFE_CYCLE` or `INSTRUMENT`. |
| `VERSION` | Parent Export LC version. |
| `CLAIM_ID` | Stable bill identity, for example `XL-7001`. |
| `CLAIM_VERSION` | Version of the bill lifecycle. |
| `BILL_AMOUNT` | Bill amount. |
| `BILL_STATUS` | Bill status, such as `INPUT`, `CONTROLLED`, `UPDATED`, `SETTLED`. |
| `BILL_OUTSTANDING` | Outstanding bill amount. |

### 4.6 INSTRUMENT_EVENTS

The `INSTRUMENT_EVENTS` table is the post-control history table.

It receives entries only after control.

It should not have a before-control state column.

| Column | Meaning |
|---|---|
| `EVENT_SEQ` | Timeline sequence number. |
| `EVENT_ID` | Event ID. |
| `INSTRUMENT_ID` | Parent instrument. |
| `LCY_ID` | Lifecycle that produced this event. |
| `EVENT` | Event type. |
| `VERSION` | Export LC version. |
| `CLAIM_ID` | Null for EL event, filled for XL bill event. |
| `CLAIM_VERSION` | Null for EL event, filled for XL bill event. |
| `STATUS` | Usually `CONTROLLED`. |
| `EFFECT` | Human-readable business effect. |

## 5. Lifecycle Timeline

### Step 1: EL Advising

Business action:

Advise a new Export LC for 100K with expiry `2026-12-31`.

Before control:

| Table | Key Data |
|---|---|
| `INSTRUMENT` | Header exists. |
| `LIFE_CYCLE` | `LCY_ID=5001`, `EVENT=EL_ADVISE`, `STATUS=INPUT`, `VERSION=1`, `CLAIM_ID=null` |
| `LC_DETAILS` | `LINK_ID=5001`, `LINK_TYPE=LIFE_CYCLE`, `EL_AMOUNT=100K`, `EXPIRY=2026-12-31` |
| `PARTY_DETAILS` | EL parties with `PARTY_SCOPE=EL`, `CLAIM_ID=null` |
| `INSTRUMENT_EVENTS` | No current event yet because control has not happened. |

After control:

| Table | Key Data |
|---|---|
| `INSTRUMENT` | `INSTRUMENT_ID=1001`, `VERSION=1`, `LATEST_LIFECYCLE_ID=5001` |
| `LC_DETAILS` | Copied to `LINK_ID=1001`, `LINK_TYPE=INSTRUMENT`, `VERSION=1` |
| `PARTY_DETAILS` | Copied to `LINK_ID=1001`, `LINK_TYPE=INSTRUMENT`, `VERSION=1` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=1`, `EVENT=EL_ADVISE`, `EFFECT=EL created for 100K, expiry 2026-12-31` |

### Step 2: EL Amendment 1

Business action:

Add 20K and extend expiry to `2027-03-31`.

The EL amount changes:

```text
100K -> 120K
```

After control:

| Table | Key Data |
|---|---|
| `INSTRUMENT` | `VERSION=2`, `LATEST_LIFECYCLE_ID=5002` |
| `LC_DETAILS` | `EL_AMOUNT=120K`, `EXPIRY=2027-03-31`, `UNUTILIZED=120K` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=2`, `EVENT=EL_AMEND`, `EFFECT=Add 20K and extend expiry to 2027-03-31` |

### Step 3: XL Bill 1 New

Business action:

Present bill `XL-7001` for 40K under the 120K Export LC.

Bill identity:

```text
CLAIM_ID = XL-7001
CLAIM_VERSION = 1
```

Amount impact:

```text
120K authorized - 40K bill utilization = 80K unutilized
```

After control:

| Table | Key Data |
|---|---|
| `LIFE_CYCLE` | `EVENT=BILL_NEW`, `VERSION=2`, `CLAIM_ID=XL-7001`, `CLAIM_VERSION=1` |
| `BILL_DETAILS` | `BILL_AMOUNT=40K USD`, `BILL_STATUS=CONTROLLED`, `BILL_OUTSTANDING=40K` |
| `PARTY_DETAILS` | XL parties use `PARTY_SCOPE=XL`, `CLAIM_ID=XL-7001` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=3`, `EVENT=BILL_NEW`, `EFFECT=Present bill XL-7001 for 40K` |

### Step 4: EL Amendment 2

Business action:

Add 30K to the Export LC while bill `XL-7001` remains outstanding.

The EL amount changes:

```text
120K -> 150K
```

Amount impact:

```text
150K authorized - 40K bill utilization = 110K unutilized
```

After control:

| Table | Key Data |
|---|---|
| `INSTRUMENT` | `VERSION=3`, `LATEST_LIFECYCLE_ID=5004` |
| `LC_DETAILS` | `EL_AMOUNT=150K`, `UNUTILIZED=110K`, `LC_LIABILITY=150K` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=4`, `EVENT=EL_AMEND`, `EFFECT=Add 30K to EL amount, total 150K` |

### Step 5: XL Bill 1 Settle

Business action:

Settle bill `XL-7001` for 40K.

Bill identity remains the same:

```text
CLAIM_ID = XL-7001
```

Bill version changes:

```text
CLAIM_VERSION 1 -> CLAIM_VERSION 2
```

After control:

| Table | Key Data |
|---|---|
| `LIFE_CYCLE` | `EVENT=BILL_SETTLE`, `VERSION=3`, `CLAIM_ID=XL-7001`, `CLAIM_VERSION=2` |
| `BILL_DETAILS` | `BILL_STATUS=SETTLED`, `BILL_OUTSTANDING=0` |
| `LC_DETAILS` | `LC_LIABILITY=110K` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=5`, `EVENT=BILL_SETTLE`, `EFFECT=Settle bill XL-7001 for 40K` |

### Step 6: EL Amendment 3

Business action:

Add 10K and extend expiry to `2027-06-30`.

The EL amount changes:

```text
150K -> 160K
```

Amount impact:

```text
160K authorized - 40K already utilized/settled = 120K unutilized
```

After control:

| Table | Key Data |
|---|---|
| `INSTRUMENT` | `VERSION=4`, `LATEST_LIFECYCLE_ID=5006` |
| `LC_DETAILS` | `EL_AMOUNT=160K`, `EXPIRY=2027-06-30`, `UNUTILIZED=120K` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=6`, `EVENT=EL_AMEND`, `EFFECT=Add 10K and extend expiry to 2027-06-30` |

### Step 7: XL Bill 2 New

Business action:

Present a second bill `XL-7002` for 30K under the same Export LC.

Bill identity:

```text
CLAIM_ID = XL-7002
CLAIM_VERSION = 1
```

This is separate from `XL-7001`.

Amount impact:

```text
120K available - 30K second bill = 90K unutilized
```

After control:

| Table | Key Data |
|---|---|
| `LIFE_CYCLE` | `EVENT=BILL_NEW`, `VERSION=4`, `CLAIM_ID=XL-7002`, `CLAIM_VERSION=1` |
| `BILL_DETAILS` | `BILL_AMOUNT=30K USD`, `BILL_STATUS=CONTROLLED`, `BILL_OUTSTANDING=30K` |
| `PARTY_DETAILS` | XL parties use `PARTY_SCOPE=XL`, `CLAIM_ID=XL-7002` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=7`, `EVENT=BILL_NEW`, `EFFECT=Present second bill XL-7002 for 30K` |

### Step 8: XL Bill 2 Update

Business action:

Update bill `XL-7002` from 30K to 35K.

Bill identity remains:

```text
CLAIM_ID = XL-7002
```

Bill version changes:

```text
CLAIM_VERSION 1 -> CLAIM_VERSION 2
```

Amount impact:

```text
90K unutilized - additional 5K = 85K unutilized
```

After control:

| Table | Key Data |
|---|---|
| `LIFE_CYCLE` | `EVENT=BILL_UPDATE`, `VERSION=4`, `CLAIM_ID=XL-7002`, `CLAIM_VERSION=2` |
| `BILL_DETAILS` | `BILL_AMOUNT=35K USD`, `BILL_STATUS=UPDATED`, `BILL_OUTSTANDING=35K` |
| `PARTY_DETAILS` | Updated XL parties for `XL-7002`, including `NEGOTIATING_BANK` |
| `INSTRUMENT_EVENTS` | `EVENT_SEQ=8`, `EVENT=BILL_UPDATE`, `EFFECT=Update XL-7002 from 30K to 35K` |

## 6. Complete INSTRUMENT_EVENTS Example

| EVENT_SEQ | EVENT_ID | INSTRUMENT_ID | LCY_ID | EVENT | VERSION | CLAIM_ID | CLAIM_VERSION | STATUS | EFFECT |
|---:|---|---:|---:|---|---:|---|---:|---|---|
| 1 | EVT-9001 | 1001 | 5001 | EL_ADVISE | 1 | null | null | CONTROLLED | EL created for 100K, expiry 2026-12-31 |
| 2 | EVT-9002 | 1001 | 5002 | EL_AMEND | 2 | null | null | CONTROLLED | Add 20K and extend expiry to 2027-03-31 |
| 3 | EVT-9003 | 1001 | 5003 | BILL_NEW | 2 | XL-7001 | 1 | CONTROLLED | Present bill XL-7001 for 40K |
| 4 | EVT-9004 | 1001 | 5004 | EL_AMEND | 3 | null | null | CONTROLLED | Add 30K to EL amount, total 150K |
| 5 | EVT-9005 | 1001 | 5005 | BILL_SETTLE | 3 | XL-7001 | 2 | CONTROLLED | Settle bill XL-7001 for 40K |
| 6 | EVT-9006 | 1001 | 5006 | EL_AMEND | 4 | null | null | CONTROLLED | Add 10K and extend expiry to 2027-06-30 |
| 7 | EVT-9007 | 1001 | 5007 | BILL_NEW | 4 | XL-7002 | 1 | CONTROLLED | Present second bill XL-7002 for 30K |
| 8 | EVT-9008 | 1001 | 5008 | BILL_UPDATE | 4 | XL-7002 | 2 | CONTROLLED | Update XL-7002 from 30K to 35K |

## 7. UI Query Patterns

### 7.1 Current EL Screen

Fetch the current instrument header:

```sql
select *
from instrument
where instrument_id = :instrument_id;
```

Then use `INSTRUMENT.VERSION` to fetch current EL details:

```sql
select *
from lc_details
where link_type = 'INSTRUMENT'
  and link_id = :instrument_id
  and claim_id is null
  and version = :version;
```

Fetch EL parties:

```sql
select *
from party_details
where link_type = 'INSTRUMENT'
  and link_id = :instrument_id
  and party_scope = 'EL'
  and claim_id is null
  and version = :version;
```

### 7.2 List XL Bills Under an EL

```sql
select distinct claim_id
from bill_details
where link_type = 'INSTRUMENT'
  and link_id = :instrument_id
order by claim_id;
```

Example result:

| CLAIM_ID |
|---|
| XL-7001 |
| XL-7002 |

### 7.3 Selected XL Bill Screen

Find the latest bill claim version:

```sql
select max(claim_version) as latest_claim_version
from bill_details
where link_type = 'INSTRUMENT'
  and link_id = :instrument_id
  and claim_id = :claim_id;
```

Fetch bill details:

```sql
select *
from bill_details
where link_type = 'INSTRUMENT'
  and link_id = :instrument_id
  and claim_id = :claim_id
  and claim_version = :claim_version;
```

Fetch bill parties:

```sql
select *
from party_details
where link_type = 'INSTRUMENT'
  and link_id = :instrument_id
  and party_scope = 'XL'
  and claim_id = :claim_id
  and claim_version = :claim_version;
```

### 7.4 Pending Lifecycle Screen

Fetch the lifecycle:

```sql
select *
from life_cycle
where lcy_id = :lifecycle_id;
```

Fetch EL work-in-progress details:

```sql
select *
from lc_details
where link_type = 'LIFE_CYCLE'
  and link_id = :lifecycle_id
  and claim_id is null;
```

Fetch XL work-in-progress details:

```sql
select *
from bill_details
where link_type = 'LIFE_CYCLE'
  and link_id = :lifecycle_id
  and claim_id = :claim_id;
```

### 7.5 Timeline or History View

Fetch the complete EL and XL event history:

```sql
select *
from instrument_events
where instrument_id = :instrument_id
order by event_seq;
```

Fetch only EL-level history:

```sql
select *
from instrument_events
where instrument_id = :instrument_id
  and claim_id is null
order by event_seq;
```

Fetch history for one XL bill:

```sql
select *
from instrument_events
where instrument_id = :instrument_id
  and claim_id = :claim_id
order by claim_version;
```

## 8. LLM Reasoning Checklist

When answering questions about this model, follow these rules:

1. First identify whether the row belongs to EL or XL.
2. If `CLAIM_ID` is null, it is EL-level data.
3. If `CLAIM_ID` is filled, it is XL bill-level data.
4. Use `VERSION` for Export LC version only.
5. Use `CLAIM_VERSION` for bill lifecycle version only.
6. Use `PARTY_SCOPE` to distinguish EL parties from XL parties in `PARTY_DETAILS`.
7. Use `LINK_TYPE = LIFE_CYCLE` for mutable work-in-progress rows.
8. Use `LINK_TYPE = INSTRUMENT` for controlled immutable snapshot rows.
9. Do not expect `INSTRUMENT_EVENTS` before control.
10. Use `INSTRUMENT_EVENTS` for timeline and history screens.

## 9. Common Mistakes to Avoid

| Mistake | Correction |
|---|---|
| Treating `VERSION` as bill version | `VERSION` is Export LC version. Bill version is `CLAIM_VERSION`. |
| Hiding `INSTRUMENT` before control | `INSTRUMENT` exists before and after control. |
| Adding a state column to `INSTRUMENT_EVENTS` | `INSTRUMENT_EVENTS` is post-control only and does not need before/after state. |
| Mixing EL and XL parties | Use `PARTY_SCOPE` and `CLAIM_ID`. |
| Creating a new claim ID for bill update | Bill update keeps the same `CLAIM_ID` and increments `CLAIM_VERSION`. |
| Reading bill rows only by `LINK_ID=INSTRUMENT_ID` | Also filter by `CLAIM_ID` and `CLAIM_VERSION`. |

