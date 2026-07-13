"use client";

import React, { useState, useMemo } from "react";

/* ── Fully Inflated · Coach Prototype v8 ──
   Onboarding wizard (brand → tax + disclaimer → name your Coach → first client) ·
   Coach naming · brand color accents · menu reorder · My Clients tab
   (unique IDs, search, Active/Past, job statuses w/ reasons, contract uploads) ·
   sales tax settings + per-invoice override · dead-stock Coach alert */

const FONT = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Outfit:wght@400;500;600;700&display=swap');
.fi-root{font-family:'Outfit',system-ui,sans-serif;}
.fi-display{font-family:'Bricolage Grotesque','Outfit',sans-serif;}
.fi-num{font-variant-numeric:tabular-nums;}
@keyframes fi-pop{0%{transform:scale(.94);opacity:0}100%{transform:scale(1);opacity:1}}
.fi-pop{animation:fi-pop .18s ease-out}
@media (prefers-reduced-motion: reduce){.fi-pop{animation:none}}
`;

const SEED_INVENTORY = [
  { id: "i1", name: '11" Latex Balloons (bag/100)', label: "Balloons", cat: "consumable", cost: 8.5, price: 30, qty: 14, reorder: 5, lead: 4, taxPaid: 0.6, usedCount: 0 },
  { id: "i2", name: 'Jumbo 36" Number Balloon', label: "Balloons", cat: "consumable", cost: 6.0, price: 22, qty: 3, reorder: 4, lead: 10, taxPaid: 0.42, usedCount: 0 },
  { id: "i3", name: "Organic Garland Kit (10ft)", label: "Garlands", cat: "consumable", cost: 24.0, price: 95, qty: 6, reorder: 3, lead: 7, taxPaid: 1.68, usedCount: 0 },
  { id: "i4", name: "Gold Circle Arch Frame", label: "Hardware", cat: "reusable_asset", cost: 180, price: 0, qty: 2, reorder: 1, lead: 14, taxPaid: 12.6, usedCount: 0 },
  { id: "i5", name: "Acrylic Display Plinth", label: "Hardware", cat: "reusable_asset", cost: 65, price: 0, qty: 4, reorder: 2, lead: 9, taxPaid: 4.55, usedCount: 0 },
];

const SEED_CLIENTS = [
  { id: "FI-2026-0001", name: "Magnolia & Main Events (Demo)", email: "events@magnoliamain.com", phone: "(555) 220-1100", address: "123 Demo St, Columbia, SC", alias: "c-8f3a2@log.fullyinflated.app", contract: null, isDemo: true },
];

const FULFILL_TYPES = {
  event: "Event date",
  pickup: "Pickup date",
  delivery: "Delivery date",
  none: "No date needed",
};

const BALANCE_TERMS = {
  on_receipt: "due on receipt",
  before_event_7: "due 1 week before event",
  before_event_1: "due 1 day before event",
  on_event: "due day of event",
  net_30: "due within 30 days of invoice",
  custom: "custom",
};

const CANCEL_REASONS = ["non-payment", "weather", "client's choice", "date conflict", "other"];
const STEPS = ["Client", "Items", "Fees", "Your time", "Discounts", "Review"];
const SWATCHES = ["#E8467C", "#C4622D", "#4A6274", "#1E9E6A", "#5B8DEF", "#7B4AE2"];

const OVERHEAD = 35;
const money = (n) => (n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2));
const nowStamp = () => new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const selectAll = (e) => {
  const t = e.target;
  setTimeout(() => { try { t.select(); } catch {} }, 0);
};

function MoneyInput({ value, onChange, style: st, ariaLabel }) {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : value === 0 ? "" : String(value);
  return (
    <input
      type="text" inputMode="decimal" placeholder="0" aria-label={ariaLabel}
      className="fi-num" value={shown}
      onFocus={(e) => { setFocused(true); setText(value === 0 ? "" : String(value)); selectAll(e); }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, "");
        setText(raw);
        onChange(raw === "" || raw === "." ? 0 : parseFloat(raw) || 0);
      }}
      onBlur={() => setFocused(false)}
      style={{ ...input, ...st }}
    />
  );
}

function HexInput({ value, onChange }) {
  const [text, setText] = useState(value);
  const [err, setErr] = useState(false);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column" }}>
      <input
        type="text" value={text} placeholder="#C4622D"
        onFocus={selectAll}
        onChange={(e) => {
          let v = e.target.value;
          if (v && !v.startsWith("#")) v = "#" + v;
          setText(v);
          const valid = /^#[0-9A-Fa-f]{6}$/.test(v);
          setErr(v.length >= 4 && !valid);
          if (valid) onChange(v);
        }}
        style={{ ...input, width: 110, padding: "8px 10px", fontSize: 14, borderColor: err ? "#E8467C" : "#D9D3E8" }}
        aria-label="Hex color code"
      />
      {err && <span style={{ fontSize: 11, color: "#E8467C", marginTop: 2 }}>needs 6 digits, e.g. #C4622D</span>}
    </span>
  );
}

export default function FullyInflatedV8() {
  /* ── onboarding ── */
  const [obStep, setObStep] = useState(0); // 0..3, 4 = done
  const [obAckTime, setObAckTime] = useState(null);

  /* ── navigation & modes ── */
  const [tab, setTab] = useState("invoice");
  const [mode, setMode] = useState("guided");
  const [step, setStep] = useState(0);
  const [showHowTo, setShowHowTo] = useState(false);

  /* ── settings / brand ── */
  const [coachMode, setCoachMode] = useState("full");
  const [coachName, setCoachName] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [brandColor, setBrandColor] = useState("#E8467C");
  const [logo, setLogo] = useState(null);
  const [invoiceStyle, setInvoiceStyle] = useState("itemized");
  const [simpleDesc, setSimpleDesc] = useState("Event design, production & installation");
  const [taxRate, setTaxRate] = useState(7);

  /* ── clients ── */
  const [clients, setClients] = useState(SEED_CLIENTS);
  const [customer, setCustomer] = useState(SEED_CLIENTS[0]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("active");
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", address: "" });
  const [venueAddress, setVenueAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [showAddressCheck, setShowAddressCheck] = useState(false);
  const [quickAddClient, setQuickAddClient] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");

  /* ── invoice state ── */
  const [inventory, setInventory] = useState(SEED_INVENTORY);
  const [fulfillType, setFulfillType] = useState("event");
  const [fulfillDate, setFulfillDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [lines, setLines] = useState([]);
  const [fees, setFees] = useState({ service: 150, design: 0, rental: 0 });
  const [travel, setTravel] = useState({ mode: "flat", flat: 0, perMile: 0.5, miles: 0, perBlock: 30, blocks: 0 });
  const [hours, setHours] = useState(4);
  const [rate, setRate] = useState(35);
  const [discountPct, setDiscountPct] = useState(0);
  const [markupPct, setMarkupPct] = useState(0);
  const [depositPct, setDepositPct] = useState(50);
  const [payType, setPayType] = useState("deposit");
  const [balanceTerms, setBalanceTerms] = useState("before_event_7");
  const [customDays, setCustomDays] = useState(14);
  const [jobTaxRate, setJobTaxRate] = useState(null); // per-invoice override, null = use settings

  /* ── records & feedback ── */
  const [invoices, setInvoices] = useState([]);
  const [health, setHealth] = useState(50);
  const [saved, setSaved] = useState(0);
  const [modal, setModal] = useState(null);
  const [tip, setTip] = useState(null);
  const [toast, setToast] = useState(null);
  const [invSearch, setInvSearch] = useState("");
  const [pickSearch, setPickSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [newItem, setNewItem] = useState({ name: "", label: "", cat: "consumable", cost: 0, price: 0, qty: 1 });
  const [statusDraft, setStatusDraft] = useState(null); // {id, status, reason}

  const setToastMsg = (m) => { setToast(m); setTimeout(() => setToast(null), 4200); };
  const coachTitle = `Coach${coachName ? " " + coachName : ""}`;
  const coachOn = coachMode !== "off";
  const effTaxPct = jobTaxRate === null ? taxRate : jobTaxRate;

  /* ── math ── */
  const travelFee = travel.mode === "flat" ? travel.flat
    : travel.mode === "mile" ? travel.perMile * travel.miles
    : travel.perBlock * travel.blocks;

  const usesAssets = lines.some((l) => inventory.find((i) => i.id === l.itemId)?.cat === "reusable_asset");
  const daysUntilFulfill = fulfillType === "none" ? 999 : Math.ceil((new Date(fulfillDate + "T00:00:00") - new Date()) / 86400000);

  const calc = useMemo(() => {
    let productRev = 0, cogs = 0, wholesaleTax = 0;
    lines.forEach((l) => {
      const it = inventory.find((i) => i.id === l.itemId);
      if (!it) return;
      productRev += it.price * l.qty;
      cogs += it.cost * l.qty;
      wholesaleTax += it.taxPaid * l.qty;
    });
    const marked = productRev * (1 + markupPct / 100);
    const feeTotal = fees.service + fees.design + fees.rental + travelFee;
    const preDiscount = marked + feeTotal;
    const discountAmt = preDiscount * (discountPct / 100);
    const subtotal = preDiscount - discountAmt;
    const salesTax = subtotal * (effTaxPct / 100);
    const gross = subtotal - cogs;
    const grossPct = subtotal > 0 ? (gross / subtotal) * 100 : 0;
    const paycheck = hours * rate;
    const netBeforeLabor = gross - OVERHEAD;
    const trueProfit = netBeforeLabor - paycheck;
    const hourlyProfit = hours > 0 ? netBeforeLabor / hours : 0;
    const profitNoDiscount = preDiscount - cogs - OVERHEAD;
    const profitCutPct = profitNoDiscount > 0 ? (discountAmt / profitNoDiscount) * 100 : 0;
    const illusionNet = marked - productRev - discountAmt;
    return {
      productRev, cogs, wholesaleTax, feeTotal, preDiscount, discountAmt, subtotal, salesTax,
      gross, grossPct, paycheck, netBeforeLabor, trueProfit, hourlyProfit,
      profitNoDiscount, profitCutPct, illusionNet, marked,
      suggestedRental: productRev * 0.15,
      deposit: (subtotal + salesTax) * (depositPct / 100),
      balance: (subtotal + salesTax) * (1 - depositPct / 100),
      total: subtotal + salesTax,
    };
  }, [lines, fees, travelFee, inventory, hours, rate, discountPct, markupPct, depositPct, effTaxPct]);

  const score = useMemo(() => {
    const n = invoices.length;
    if (n === 0) return null;
    const feesOk = invoices.filter((i) => i.feesOk).length;
    const paidSelf = invoices.filter((i) => i.paidSelf).length;
    const deposits = invoices.filter((i) => i.depositPct > 0).length;
    const avgMargin = invoices.reduce((a, i) => a + i.marginPct, 0) / n;
    return { n, feesOk, paidSelf, deposits, avgMargin };
  }, [invoices]);

  const daysUntil = (iso) => Math.ceil((new Date(iso) - new Date()) / 86400000);

  const countdownMeta = (inv) => {
    if (inv.jobStatus !== "active" || inv.payStatus === "paid") return null;
    const d = daysUntil(inv.eventDate);
    const owesBalance = inv.payStatus !== "paid";
    let color = "#1E9E6A", label = `${d} days out`;
    if (d <= 1 && owesBalance) { color = "#E8467C"; label = d <= 0 ? "TODAY — balance unpaid!" : "1 day out — balance unpaid!"; }
    else if (d <= 5 && owesBalance) { color = "#DC8A1F"; label = `${d} days out — balance unpaid`; }
    else if (d < 0) { color = "#8B84A3"; label = "event date passed"; }
    return { d, color, label };
  };

  const dashboard = useMemo(() => {
    const months = {};
    invoices.forEach((inv) => {
      const k = inv.monthKey || "unknown";
      if (!months[k]) months[k] = { revenue: 0, trueProfit: 0, count: 0, paycheck: 0, hoursApprox: 0, feesOkCount: 0, byCategory: {} };
      const m = months[k];
      m.revenue += inv.total;
      m.trueProfit += inv.trueProfit;
      m.paycheck += inv.paycheck;
      m.count += 1;
      if (inv.feesOk) m.feesOkCount += 1;
      const cat = inv.category || "General";
      m.byCategory[cat] = (m.byCategory[cat] || 0) + inv.total;
    });
    const yearTotal = invoices.reduce((a, i) => a + i.total, 0);
    const yearProfit = invoices.reduce((a, i) => a + i.trueProfit, 0);
    return { months, yearTotal, yearProfit };
  }, [invoices]);

  const NATIONAL_AVG_HOURLY = 28; // rough national average benchmark for skilled small-business/trade work — verify/update periodically

  const monthlyObservation = (key) => {
    const m = dashboard.months[key];
    if (!m) return null;
    const profitable = m.trueProfit > 0;
    const avgHourlyEquiv = m.count > 0 ? m.trueProfit / (m.count * 4) : 0; // rough: assumes ~4hrs/job if not tracked precisely
    const lines = [];
    if (!profitable) lines.push(`your true profit landed at ${money(m.trueProfit)} — the business didn't come out ahead after materials, overhead, and paying you.`);
    if (m.feesOkCount < m.count) lines.push(`${m.count - m.feesOkCount} of ${m.count} jobs had unbilled rental fees on your own gear.`);
    if (avgHourlyEquiv < NATIONAL_AVG_HOURLY && m.count > 0) lines.push(`your effective hourly return was well under the national average (~${money(NATIONAL_AVG_HOURLY)}/hr) for this kind of work.`);
    return { profitable, lines, m };
  };

  const deadStock = useMemo(() => {
    if (invoices.length < 3) return [];
    return inventory.filter((it) => it.cat === "consumable" && it.usedCount === 0 && it.qty > 0);
  }, [inventory, invoices.length]);

  const lowStockWarnings = lines
    .map((l) => {
      const it = inventory.find((i) => i.id === l.itemId);
      if (!it || it.cat !== "consumable") return null;
      if (it.qty - l.qty < it.reorder) return { name: it.name, rushRisk: it.lead > daysUntilFulfill, lead: it.lead };
      return null;
    })
    .filter(Boolean);

  /* ── actions ── */
  const addItem = (id) =>
    setLines((prev) => {
      const ex = prev.find((l) => l.itemId === id);
      return ex ? prev.map((l) => (l.itemId === id ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { itemId: id, qty: 1 }];
    });
  const setQty = (id, qty) => setLines((prev) => prev.map((l) => (l.itemId === id ? { ...l, qty: Math.max(1, qty) } : l)));
  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.itemId !== id));

  const tryFinalize = () => {
    if (lines.length === 0) return setToastMsg("Add at least one item first.");
    if (coachMode === "full") {
      if (usesAssets && fees.rental === 0) return setModal("rental");
      if (calc.trueProfit < 0) return setModal("negative");
      // Margin-honesty: materials suspiciously cheap relative to a high total (e.g. budget materials, premium price)
      if (calc.cogs > 0 && calc.total > 300 && calc.cogs / calc.total < 0.02) return setModal("marginhonesty");
    }
    if (venueAddress.trim() && !addressConfirmed) { setShowAddressCheck(true); return; }
    setModal("preview");
  };

  const buildRecord = (docType, num) => ({
    id: `${docType === "quote" ? "QTE" : "INV"}-${String(num).padStart(3, "0")}`,
    docType, clientId: customer.id, customer: customer.name,
    total: calc.total, trueProfit: calc.trueProfit,
    paycheck: calc.paycheck, tax: calc.salesTax, taxPct: effTaxPct,
    deposit: calc.deposit, balance: calc.balance,
    payStatus: docType === "quote" ? "quoted" : "sent",
    jobStatus: "active", voided: false,
    payType, depositPct, feesOk: fees.rental > 0 || !usesAssets, paidSelf: calc.hourlyProfit >= rate, marginPct: calc.grossPct,
    terms: balanceTerms === "custom" ? `due ${customDays} days before event` : BALANCE_TERMS[balanceTerms],
    history: [{ label: docType === "quote" ? "Quote created — inventory soft-reserved" : "Invoice sent — inventory deducted", when: nowStamp() }],
    eventDate: fulfillType === "none" ? null : new Date(fulfillDate + "T00:00:00").toISOString(),
    fulfillType,
    monthKey: new Date().toISOString().slice(0, 7),
    category: (inventory.find((i) => i.id === lines[0]?.itemId)?.label) || "General",
    // snapshot everything needed to reconstruct this job later (reissue / convert)
    snapshot: { lines: [...lines], fees: { ...fees }, travel: { ...travel }, hours, rate, discountPct, markupPct, invoiceStyle, simpleDesc },
    bizSnapshot: { bizName, bizEmail, bizPhone, logo, brandColor },
    venueAddress: venueAddress.trim() || null,
  });

  const resetBuilder = () => {
    setLines([]);
    setFees({ service: 150, design: 0, rental: 0 });
    setTravel((t) => ({ ...t, flat: 0, miles: 0, blocks: 0 }));
    setDiscountPct(0); setMarkupPct(0); setJobTaxRate(null);
    setModal(null); setStep(0);
    setVenueAddress(""); setAddressConfirmed(false);
  };

  const doFinalize = () => {
    // Hard-deduct inventory — this is a real Invoice, not a Quote.
    setInventory((prev) => prev.map((it) => {
      const l = lines.find((x) => x.itemId === it.id);
      return l ? { ...it, qty: it.qty - l.qty, usedCount: it.usedCount + l.qty } : it;
    }));
    const feesOk = fees.rental > 0 || !usesAssets;
    const paidSelf = calc.hourlyProfit >= rate;
    const delta = (feesOk ? 4 : -5) + (paidSelf ? 3 : -2);
    setHealth((h) => Math.max(0, Math.min(100, h + delta)));
    const rec = buildRecord("invoice", invoices.filter((i) => i.docType !== "quote").length + 1);
    setInvoices((f) => [...f, rec]);
    const recent = [...invoices, rec].filter((r) => r.docType !== "quote").slice(-3);
    if (mode === "guided" && recent.length === 3 && recent.every((r) => r.feesOk && r.paidSelf)) {
      setTimeout(() => setToastMsg(`🎓 ${coachTitle}: three clean invoices in a row. You've earned ⚡ Quick mode — try it.`), 4400);
    }
    resetBuilder();
    setToastMsg(`Invoice finalized. ${payType === "retainer" ? "Retainer" : "Deposit"} request sent. 🎈`);
  };

  const doSaveQuote = () => {
    // Soft-reserve only — inventory quantities are NOT touched. Prevents double-booking
    // without punishing every window-shopping request with a permanent stock deduction.
    const rec = buildRecord("quote", invoices.filter((i) => i.docType === "quote").length + 1);
    setInvoices((f) => [...f, rec]);
    resetBuilder();
    setToastMsg("Quote saved — inventory soft-reserved, nothing deducted yet. Convert it to an Invoice once the client says yes.");
  };

  const convertQuoteToInvoice = (quoteId) => {
    const q = invoices.find((i) => i.id === quoteId);
    if (!q) return;
    setInventory((prev) => prev.map((it) => {
      const l = q.snapshot.lines.find((x) => x.itemId === it.id);
      return l ? { ...it, qty: it.qty - l.qty, usedCount: it.usedCount + l.qty } : it;
    }));
    const newId = "INV-" + String(invoices.filter((i) => i.docType !== "quote").length + 1).padStart(3, "0");
    setInvoices((prev) => prev.map((i) => i.id !== quoteId ? i : {
      ...i, id: newId, docType: "invoice", payStatus: "sent",
      history: [...i.history, { label: `Converted from ${quoteId} to Invoice — inventory now deducted`, when: nowStamp() }],
    }));
    setToastMsg(`${quoteId} converted to ${newId}. Inventory deducted now that it's confirmed.`);
  };

  const voidInvoice = (invId) => {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv || inv.voided) return;
    // Restore inventory only if this was a real Invoice (Quotes never touched stock)
    if (inv.docType !== "quote") {
      setInventory((prev) => prev.map((it) => {
        const l = inv.snapshot.lines.find((x) => x.itemId === it.id);
        return l ? { ...it, qty: it.qty + l.qty, usedCount: Math.max(0, it.usedCount - l.qty) } : it;
      }));
    }
    setInvoices((prev) => prev.map((i) => i.id !== invId ? i : {
      ...i, voided: true, jobStatus: "cancelled_business",
      history: [...i.history, { label: "VOIDED — inventory restored, record kept for the books", when: nowStamp() }],
    }));
    setToastMsg(`${invId} voided. It stays in your records forever — nothing gets deleted.`);
  };

  const reissueFrom = (invId) => {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv || !inv.snapshot) return;
    const snap = inv.snapshot;
    setCustomer(clients.find((c) => c.id === inv.clientId) || customer);
    setLines(snap.lines); setFees(snap.fees); setTravel(snap.travel);
    setHours(snap.hours); setRate(snap.rate);
    setDiscountPct(snap.discountPct); setMarkupPct(snap.markupPct);
    setInvoiceStyle(snap.invoiceStyle); setSimpleDesc(snap.simpleDesc);
    setFulfillType(inv.fulfillType || "event");
    if (inv.eventDate) setFulfillDate(new Date(inv.eventDate).toISOString().slice(0, 10));
    setVenueAddress(inv.venueAddress || ""); setAddressConfirmed(!!inv.venueAddress);
    setTab("invoice"); setMode("guided"); setStep(0);
    setToastMsg(`Loaded ${invId} into the builder — fix it up and finalize as a fresh invoice number.`);
  };

  const acceptRental = () => {
    const amt = Math.round(calc.suggestedRental * 100) / 100;
    setFees((f) => ({ ...f, rental: amt }));
    setModal(null);
    setSaved((s) => s + amt);
    setToastMsg(`${coachTitle} added ${money(amt)} rental fee. That's YOUR money now.`);
  };

  const handleLogo = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setToastMsg("That file isn't an image — try a PNG or JPG.");
    const reader = new FileReader();
    reader.onerror = () => setToastMsg("Couldn't read that file. Try a different image.");
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setToastMsg("Couldn't load that image. Try a PNG or JPG.");
      img.onload = () => {
        try {
          const scale = Math.min(1, 240 / img.height);
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          setLogo(c.toDataURL("image/png"));
          setToastMsg("Logo added — hit Review invoice to see it in place. 🎈");
        } catch {
          setLogo(reader.result);
          setToastMsg("Logo added.");
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const createClient = (name, email = "", phone = "", address = "") => {
    const seq = String(clients.length + 1).padStart(4, "0");
    const c = {
      id: `FI-2026-${seq}`, name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(),
      alias: `c-${Math.random().toString(16).slice(2, 7)}@log.fullyinflated.app`,
      contract: null, isDemo: false,
    };
    setClients((prev) => [...prev, c]);
    setCustomer(c);
    return c;
  };

  const addClient = (fromWizard) => {
    if (!newClient.name.trim()) { setToastMsg("Give your client a name first."); return false; }
    createClient(newClient.name, newClient.email, newClient.phone, newClient.address);
    setNewClient({ name: "", email: "", phone: "", address: "" });
    if (!fromWizard) setTip("clientid");
    return true;
  };

  const removeDemoClient = () => {
    const demo = clients.find((c) => c.isDemo);
    if (!demo) return;
    setClients((prev) => prev.filter((c) => !c.isDemo));
    setInvoices((prev) => prev.filter((i) => i.clientId !== demo.id));
    if (customer.id === demo.id) {
      const next = clients.find((c) => !c.isDemo);
      if (next) setCustomer(next);
    }
    setToastMsg("Demo client removed, along with any practice invoices tied to it.");
  };

  const attachContract = (clientId, e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, contract: { name: f.name, when: nowStamp() } } : c));
    setToastMsg("Contract attached and timestamped. 📎 Your evidence locker thanks you.");
  };

  const applyStatus = (invId) => {
    if (!statusDraft || statusDraft.id !== invId) return;
    const { status, reason } = statusDraft;
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== invId) return inv;
      const labels = {
        complete: "Marked complete",
        rescheduled: `Rescheduled${reason ? ` — ${reason}` : ""}`,
        cancelled_client: `Cancelled by client — ${reason || "no reason given"}`,
        cancelled_business: `Cancelled by ${bizName || "business"} — ${reason || "no reason given"}`,
      };
      return {
        ...inv, jobStatus: status,
        history: [...inv.history, { label: labels[status], when: nowStamp() }],
      };
    }));
    setStatusDraft(null);
    setToastMsg("Status updated — timestamped in the record.");
  };

  const copyAlias = () => {
    const text = customer.alias;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => setToastMsg("Address copied — paste it into your email's CC line."),
        () => setToastMsg(`Copy this address: ${text}`)
      );
    } else setToastMsg(`Copy this address: ${text}`);
  };

  const clientHasActive = (cid) => {
    const jobs = invoices.filter((i) => i.clientId === cid);
    if (jobs.length === 0) return true; // prospects count as active
    return jobs.some((i) => i.jobStatus === "active" || i.jobStatus === "rescheduled");
  };

  const TIPS = {
    cogs: "COGS = Cost of Goods Sold. What YOU paid for the stuff on this invoice — balloons, kits, materials. The wholesale side.",
    gross: "Gross Margin = what's left after paying for materials, as a % of the sale. Under 45% in event work usually means you're underpricing labor or materials.",
    paycheck: "Your Paycheck = your hours × your rate. You are your business's first employee. If the job can't pay you, the job is underpriced.",
    trueprofit: "True Profit = what's left AFTER materials, overhead, AND paying yourself. This is what the BUSINESS earned. Most apps call 'your unpaid labor' profit. We don't lie to you like that.",
    escrow: "Sales tax is your CLIENT'S money passing through your hands to the state. It was never yours. Keep it in a separate bucket so you never spend it.",
    opportunity: "Projected hourly profit = this job's profit (before your paycheck) ÷ your hours. Compare it to your rate to decide if the job deserves your calendar.",
    payvsretainer: "Deposit = an advance payment that counts toward THIS invoice's total. Whether it's refundable on cancellation is up to your contract. Retainer = a fee that reserves your date and services — usually non-refundable, because you turned away other clients for that slot. The word you choose sets your client's expectations, so pick one on purpose and back it up in your contract.",
    health: "The balloon IS your business. It tracks four habits from your finalized invoices: charging ALL your fees, paying yourself your full rate, healthy margins, and collecting money up front. Green and rising = your pricing discipline is working. It's not judging you — it's showing your patterns before your bank account does.",
    travel: "Pick how you charge for getting there: a flat fee, per mile (the IRS publishes a standard mileage rate each year — a good benchmark for covering gas AND wear on your vehicle), or per block of drive time. Whichever you pick, the point is the same: the drive is work.",
    clientid: "Pro move: add this client number to your contract before they sign. Now their identity lives in three places — the invoice, your records, and their signature — and 'that's not me' stops being an argument. Names change; the number never does.",
    jobtax: "This job's tax rate. Your default lives in My Brand, but event work crosses city and county lines — local rates stack on top of state rates, so a job two counties over can genuinely tax differently. When the job travels, check the rate for WHERE the event happens.",
  };

  const balloonSize = 56 + (score ? health : 40) * 0.9;
  const healthColor = !score ? "#8B84A3" : health >= 70 ? "#1E9E6A" : health >= 45 ? "#DC8A1F" : "#E8467C";
  const payStatusMeta = {
    quoted: { label: "Quoted — awaiting yes", bg: "#EAF1FD", border: "#5B8DEF" },
    sent: { label: "Deposit due", bg: "#FBF3E4", border: "#DC8A1F" },
    deposit_paid: { label: "Balance due", bg: "#EAF1FD", border: "#5B8DEF" },
    paid: { label: "Paid in full", bg: "#E9F7F0", border: "#1E9E6A" },
  };
  const jobStatusMeta = {
    active: { label: "Active", color: "#5B8DEF" },
    complete: { label: "Complete", color: "#1E9E6A" },
    rescheduled: { label: "Rescheduled", color: "#DC8A1F" },
    cancelled_client: { label: "Cancelled by client", color: "#E8467C" },
    cancelled_business: { label: "Cancelled by business", color: "#E8467C" },
  };
  const advancePay = (id) =>
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== id) return inv;
      const next = inv.payStatus === "sent" ? "deposit_paid" : "paid";
      const hist = { label: next === "deposit_paid" ? "Deposit received" : "Balance received — paid in full", when: nowStamp() };
      return { ...inv, payStatus: next, history: [...inv.history, hist], jobStatus: next === "paid" && inv.jobStatus === "active" ? "complete" : inv.jobStatus };
    }));

  const coachOnQuiet = coachOn; // alias for readability

  /* ─────────── invoice sections ─────────── */

  const SectionClient = (
    <section style={card} key="s0">
      <h2 style={h2}>{mode === "guided" ? "Who's this for?" : "1 · Client & fulfillment"}</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Bill to (your client)
          {!quickAddClient ? (
            <select value={customer.id} onChange={(e) => {
              if (e.target.value === "__new__") { setQuickAddClient(true); return; }
              setCustomer(clients.find((c) => c.id === e.target.value));
            }} style={{ ...input, display: "block", marginTop: 4 }}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isDemo ? " (Demo)" : ""} · {c.id}</option>)}
              <option value="__new__">+ Add new client…</option>
            </select>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <input autoFocus value={quickAddName} onChange={(e) => setQuickAddName(e.target.value)} placeholder="Client name" style={{ ...input, width: 180 }} />
              <button style={{ ...bigBtn, padding: "10px 14px", fontSize: 14 }} onClick={() => {
                if (!quickAddName.trim()) return;
                const c = createClient(quickAddName.trim());
                setQuickAddClient(false); setQuickAddName("");
                setToastMsg(`${c.name} added — client ${c.id}. Contact info can be filled in later from My Clients.`);
              }}>Add</button>
              <button style={{ ...ghostBtn, padding: "10px 14px", fontSize: 14 }} onClick={() => { setQuickAddClient(false); setQuickAddName(""); }}>Cancel</button>
            </div>
          )}
        </label>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>What kind of job is this?</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {Object.entries(FULFILL_TYPES).map(([k, label]) => (
            <button key={k} onClick={() => setFulfillType(k)}
              style={{ ...chip, padding: "9px 14px", fontWeight: 600, background: fulfillType === k ? "#2B2140" : "#fff", color: fulfillType === k ? "#fff" : "#2B2140" }}>
              {label}
            </button>
          ))}
        </div>
        {fulfillType !== "none" && (
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginTop: 10 }}>
            {FULFILL_TYPES[fulfillType]}
            <input type="date" value={fulfillDate} onChange={(e) => setFulfillDate(e.target.value)} style={{ ...input, marginTop: 4, display: "block", maxWidth: 220 }} />
          </label>
        )}
      </div>

      {fulfillType !== "none" && (
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block" }}>
            {fulfillType === "delivery" ? "Shipping / delivery address" : "Event / venue address"}
            <input
              value={venueAddress}
              onChange={(e) => { setVenueAddress(e.target.value); setAddressConfirmed(false); }}
              onBlur={() => { if (venueAddress.trim() && !addressConfirmed) setShowAddressCheck(true); }}
              placeholder={customer.address || "Where does this actually happen?"}
              style={{ ...input, width: "100%", maxWidth: 380, marginTop: 4, display: "block" }}
            />
          </label>
          {addressConfirmed && venueAddress.trim() && (
            <div style={{ fontSize: 12.5, color: "#1E9E6A", marginTop: 4, fontWeight: 600 }}>✓ Confirmed as this job's location</div>
          )}
        </div>
      )}
      <div style={{ fontSize: 13, marginTop: 10, opacity: 0.6 }}>New client? Add them right here, or manage full details anytime in <strong>My Clients</strong>.</div>
    </section>
  );

  const SectionItems = (
    <section style={card} key="s1">
      <h2 style={h2}>{mode === "guided" ? "What are you making?" : "2 · Add items"}</h2>
      <input value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Search your items…" style={{ ...input, width: "100%", maxWidth: 340, marginBottom: 10 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {inventory
          .filter((it) => !pickSearch.trim() || (it.name + " " + (it.label || "")).toLowerCase().includes(pickSearch.trim().toLowerCase()))
          .sort((a, b) => (b.usedCount - a.usedCount) || a.name.localeCompare(b.name))
          .map((it) => (
            <button key={it.id} onClick={() => addItem(it.id)} style={{ ...chip, borderColor: it.cat === "reusable_asset" ? "#5B8DEF" : "#D9D3E8" }}>
              {it.cat === "reusable_asset" ? "🏗️ " : ""}{it.name}
              <span className="fi-num" style={{ opacity: 0.6, marginLeft: 6 }}>({it.qty})</span>
            </button>
          ))}
      </div>
      {lines.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {lines.map((l) => {
            const it = inventory.find((i) => i.id === l.itemId);
            return (
              <div key={l.itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #EEE9F6", fontSize: 15 }}>
                <span style={{ flex: 1 }}>{it.name}</span>
                <MoneyInput value={l.qty} onChange={(v) => setQty(l.itemId, Math.round(v))} ariaLabel="Quantity" style={{ width: 64 }} />
                <span className="fi-num" style={{ width: 76, textAlign: "right", fontWeight: 600 }}>
                  {it.cat === "reusable_asset" ? "asset" : money(it.price * l.qty)}
                </span>
                <button onClick={() => removeLine(l.itemId)} aria-label={`Remove ${it.name}`} style={{ ...chip, padding: "6px 10px" }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      {coachOn && lowStockWarnings.map((w, i) => (
        <div key={i} className="fi-pop" style={{ ...coachChip, background: w.rushRisk ? "#FCE9EC" : "#FBF3E4", borderColor: w.rushRisk ? "#E8467C" : "#DC8A1F" }}>
          <strong>🧢 {coachTitle}:</strong>{" "}
          {w.rushRisk
            ? `${w.name} — supplier lead time is ${w.lead} days but you need this in ${daysUntilFulfill}. Rush shipping will eat this job's profit. Order today or substitute.`
            : `${w.name} is dropping below reorder level. Restock now to dodge rush fees later.`}
        </div>
      ))}
    </section>
  );

  const SectionFees = (
    <section style={card} key="s2">
      <h2 style={h2}>{mode === "guided" ? "Your fees" : "3 · Your fees"} <span style={sub}>(this is where your profit lives)</span></h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        {[["service", "Service Fee"], ["design", "Design Fee"], ["rental", "Rental / Hardware"]].map(([k, label]) => (
          <label key={k} style={{ fontSize: 14, fontWeight: 600 }}>
            {label}
            <MoneyInput value={fees[k]} ariaLabel={label} onChange={(v) => setFees((f) => ({ ...f, [k]: v }))}
              style={{ width: "100%", marginTop: 4, borderColor: fees[k] === 0 ? "#DC8A1F" : "#D9D3E8", background: fees[k] === 0 ? "#FBF3E4" : "#fff" }} />
            {fees[k] === 0 && <span style={{ fontSize: 12, color: "#B06E0E" }}>currently $0 — on purpose?</span>}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#F6F4FA" }}>
        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          Travel <InfoBtn onClick={() => setTip("travel")} />
          <span className="fi-num" style={{ marginLeft: "auto", fontWeight: 700 }}>{money(travelFee)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {[["flat", "Flat fee"], ["mile", "Per mile"], ["time", "Per time"]].map(([k, label]) => (
            <button key={k} onClick={() => setTravel((t) => ({ ...t, mode: k }))}
              style={{ ...chip, background: travel.mode === k ? "#2B2140" : "#fff", color: travel.mode === k ? "#fff" : "#2B2140", padding: "8px 14px" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
          {travel.mode === "flat" && (
            <label style={{ fontSize: 13, fontWeight: 600 }}>Flat amount
              <MoneyInput value={travel.flat} onChange={(v) => setTravel((t) => ({ ...t, flat: v }))} ariaLabel="Flat travel fee" style={{ width: 110, marginTop: 4, display: "block" }} />
            </label>
          )}
          {travel.mode === "mile" && (<>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Rate per mile
              <MoneyInput value={travel.perMile} onChange={(v) => setTravel((t) => ({ ...t, perMile: v }))} ariaLabel="Rate per mile" style={{ width: 100, marginTop: 4, display: "block" }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Miles (round trip)
              <MoneyInput value={travel.miles} onChange={(v) => setTravel((t) => ({ ...t, miles: v }))} ariaLabel="Miles round trip" style={{ width: 100, marginTop: 4, display: "block" }} />
            </label>
          </>)}
          {travel.mode === "time" && (<>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Per 30-min block
              <MoneyInput value={travel.perBlock} onChange={(v) => setTravel((t) => ({ ...t, perBlock: v }))} ariaLabel="Rate per 30 minute block" style={{ width: 100, marginTop: 4, display: "block" }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Blocks (round trip)
              <MoneyInput value={travel.blocks} onChange={(v) => setTravel((t) => ({ ...t, blocks: v }))} ariaLabel="Time blocks round trip" style={{ width: 100, marginTop: 4, display: "block" }} />
            </label>
          </>)}
        </div>
        {coachOn && travel.mode === "mile" && travel.perMile > 0 && travel.perMile < 0.45 && (
          <div className="fi-pop" style={{ ...coachChip, background: "#FBF3E4", borderColor: "#DC8A1F" }}>
            <strong>🧢 {coachTitle}:</strong> At {money(travel.perMile)}/mile you're likely not covering gas plus wear on your vehicle. The IRS publishes a standard mileage rate every year — look up the current one; it's a solid benchmark for what driving actually costs.
          </div>
        )}
      </div>
    </section>
  );

  const SectionTime = (
    <section style={card} key="s3">
      <h2 style={h2}>{mode === "guided" ? "Your time" : "4 · Your time"} <span style={sub}>(we don't work for free here)</span></h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Hours on this job<br />
          <MoneyInput value={hours} onChange={setHours} ariaLabel="Hours on this job" style={{ width: 90, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Your hourly rate<br />
          <MoneyInput value={rate} onChange={setRate} ariaLabel="Your hourly rate" style={{ width: 100, marginTop: 4 }} />
        </label>
        <div style={{ fontSize: 14.5, padding: "10px 14px", borderRadius: 12, background: "#F6F4FA" }}>
          Your paycheck on this job: <strong className="fi-num">{money(calc.paycheck)}</strong>
        </div>
      </div>
      {coachOn && lines.length > 0 && hours > 0 && (
        <div className="fi-pop" style={{
          ...coachChip,
          background: calc.hourlyProfit >= rate ? "#E9F7F0" : "#FCE9EC",
          borderColor: calc.hourlyProfit >= rate ? "#1E9E6A" : "#E8467C",
        }}>
          <strong>🧢 {coachTitle} — is this job worth your calendar?</strong>{" "}
          This job generates <strong className="fi-num">{money(calc.hourlyProfit)}/hour</strong> before your paycheck. You said you're worth <strong className="fi-num">{money(rate)}/hour</strong>.{" "}
          {calc.hourlyProfit >= rate
            ? "Green light — this job pays your rate with room left for the business. Book it."
            : `That's ${money(rate - calc.hourlyProfit)}/hour below your own rate. Raise a fee, cut the hours, or ask yourself what this job buys you besides money (portfolio? repeat client?). "Exposure" doesn't feed the dogs.`}
          {" "}<InfoBtn onClick={() => setTip("opportunity")} />
        </div>
      )}
    </section>
  );

  const SectionDiscounts = (
    <section style={card} key="s4">
      <h2 style={h2}>{mode === "guided" ? "Discounts & specials" : "5 · Discounts & specials"} <span style={sub}>(the truth-telling zone)</span></h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Discount %<br />
          <MoneyInput value={discountPct} onChange={(v) => setDiscountPct(Math.min(90, v))} ariaLabel="Discount percent" style={{ width: 90, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Price markup % first<br />
          <MoneyInput value={markupPct} onChange={(v) => setMarkupPct(Math.min(100, v))} ariaLabel="Markup percent" style={{ width: 90, marginTop: 4 }} />
          <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.65, maxWidth: 170 }}>bumping prices before the "sale"? enter it here — no judgment, just truth</div>
        </label>
      </div>
      {coachOn && discountPct > 0 && calc.profitNoDiscount > 0 && (
        <div className="fi-pop" style={{ ...coachChip, background: "#FBF3E4", borderColor: "#DC8A1F" }}>
          <strong>🧢 {coachTitle} — what this discount really costs:</strong><br />
          Client sees: <strong>{discountPct}% off 🎉</strong> · You feel: <strong className="fi-num" style={{ color: "#E8467C" }}>−{Math.min(100, calc.profitCutPct).toFixed(0)}% of your profit</strong>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            The {money(calc.discountAmt)} you're giving away doesn't come out of the balloon money or the tax money — it comes straight out of the {money(calc.profitNoDiscount)} that pays <em>you</em>. Same arch, same ladder, same early-morning setup… for less.
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <strong>Smarter play:</strong> offer {discountPct}% off their <em>next</em> booking instead — costs you nothing today and locks in a repeat client.
          </div>
        </div>
      )}
      {coachOn && markupPct > 0 && discountPct > 0 && (
        <div className="fi-pop" style={{ ...coachChip, background: "#EAF1FD", borderColor: "#5B8DEF" }}>
          <strong>🧢 {coachTitle} — illusion check:</strong>{" "}
          You marked prices up {markupPct}% and then discounted {discountPct}%. Net effect on this invoice: <strong className="fi-num">{calc.illusionNet >= 0 ? "+" : ""}{money(calc.illusionNet)}</strong> vs. your regular pricing.{" "}
          {calc.illusionNet >= 0
            ? "Your 'sale' nets out at regular price or better. That's marketing, not generosity — totally legal, just know which game you're playing. 😉"
            : "Careful — the markup doesn't cover the discount. You're running a REAL sale whether you meant to or not."}
        </div>
      )}
    </section>
  );

  const SectionReview = (
    <section style={card} key="s5">
      <h2 style={h2}>{mode === "guided" ? "The truth panel" : "6 · The truth panel"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        <Stat label="Subtotal" value={money(calc.subtotal)} />
        <Stat label="COGS" value={money(calc.cogs)} onInfo={() => setTip("cogs")} />
        <Stat label="Gross Margin" value={calc.grossPct.toFixed(0) + "%"} color={calc.grossPct >= 45 ? "#1E9E6A" : "#E8467C"} onInfo={() => setTip("gross")} />
        <Stat label="Your Paycheck" value={money(calc.paycheck)} color="#5B8DEF" onInfo={() => setTip("paycheck")} />
        <Stat label="True Profit" value={money(calc.trueProfit)} color={calc.trueProfit >= 0 ? "#1E9E6A" : "#E8467C"} onInfo={() => setTip("trueprofit")} />
      </div>
      <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#EAF1FD", border: "1.5px solid #5B8DEF", fontSize: 15 }}>
        <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          🔒 Tax you're holding: <span className="fi-num">{money(calc.salesTax)}</span>
          <InfoBtn onClick={() => setTip("escrow")} />
          <label style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            Rate for this job
            <MoneyInput value={effTaxPct} onChange={(v) => setJobTaxRate(v)} ariaLabel="Tax rate for this job" style={{ width: 76, padding: "6px 8px", fontSize: 14 }} />%
            <InfoBtn onClick={() => setTip("jobtax")} />
          </label>
        </div>
        <div style={{ fontSize: 13.5, marginTop: 4, opacity: 0.8 }}>
          Client's money, not yours. Wholesale tax already paid on materials: <span className="fi-num">{money(calc.wholesaleTax)}</span>. Estimated net liability: <span className="fi-num">{money(Math.max(0, calc.salesTax - calc.wholesaleTax))}</span> <em>(estimates use YOUR rates — verify with your accountant; rules vary by state)</em>.
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            Upfront payment <InfoBtn onClick={() => setTip("payvsretainer")} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <select value={payType} onChange={(e) => setPayType(e.target.value)} style={input}>
              <option value="deposit">Deposit — applies to total</option>
              <option value="retainer">Retainer — books the date</option>
            </select>
            <label style={lbl}>
              <MoneyInput value={depositPct} onChange={(v) => setDepositPct(Math.min(100, v))} ariaLabel="Deposit percent" style={{ width: 70 }} />%
            </label>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Balance due</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <select value={balanceTerms} onChange={(e) => setBalanceTerms(e.target.value)} style={input}>
              {Object.entries(BALANCE_TERMS).map(([k, v]) => <option key={k} value={k}>{k === "custom" ? "custom…" : v}</option>)}
            </select>
            {balanceTerms === "custom" && (
              <label style={lbl}>
                <MoneyInput value={customDays} onChange={(v) => setCustomDays(Math.round(v))} ariaLabel="Days before event" style={{ width: 70 }} /> days before event
              </label>
            )}
          </div>
        </div>
      </div>
      <button onClick={tryFinalize} style={{ ...bigBtn, marginTop: 16 }}>
        Review invoice — Total {money(calc.total)}
      </button>
    </section>
  );

  const SECTIONS = [SectionClient, SectionItems, SectionFees, SectionTime, SectionDiscounts, SectionReview];
  const onboarding = obStep < 4;

  /* ─────────── RENDER ─────────── */
  return (
    <div className="fi-root" style={{ minHeight: "100vh", background: "#F6F4FA", color: "#2B2140", paddingBottom: mode === "guided" && tab === "invoice" ? 90 : 24 }}>
      <style>{FONT}</style>

      {/* ── ONBOARDING WIZARD (blocking until complete) ── */}
      {onboarding && (
        <div style={{ position: "fixed", inset: 0, background: "#2B2140", zIndex: 100, overflowY: "auto", color: "#F6F4FA" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 20px 60px" }}>
            <div className="fi-display" style={{ fontSize: 30, fontWeight: 800 }}>Fully Inflated 🎈</div>
            <div style={{ fontSize: 15, opacity: 0.75, marginTop: 2 }}>Let's set you up — about 2 minutes, and it's all yours after that.</div>
            <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= obStep ? brandColor : "#4A4363", transition: "background .3s" }} />
              ))}
            </div>

            {obStep === 0 && (
              <div className="fi-pop" style={{ marginTop: 26 }}>
                <div className="fi-display" style={{ fontSize: 22, fontWeight: 800 }}>① Your brand</div>
                <p style={{ fontSize: 15, opacity: 0.8, marginTop: 6 }}>Your name and colors go on every invoice — clients recognize signature colors, and honestly? Seeing YOUR brand on YOUR paperwork just hits different.</p>
                <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginTop: 14 }}>Business name
                  <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. The Restless Inkwell" style={{ ...input, width: "100%", marginTop: 5, display: "block" }} />
                </label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 180 }}>Business email
                    <input value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} placeholder="hello@…" style={{ ...input, width: "100%", marginTop: 5, display: "block" }} />
                  </label>
                  <label style={{ fontSize: 14, fontWeight: 600, minWidth: 150 }}>Phone
                    <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="(555)…" style={{ ...input, width: "100%", marginTop: 5, display: "block" }} />
                  </label>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 14 }}>Your brand color</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                  {SWATCHES.map((c) => (
                    <button key={c} onClick={() => setBrandColor(c)} aria-label={`Choose color ${c}`}
                      style={{ width: 38, height: 38, borderRadius: "50%", background: c, border: brandColor === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer" }} />
                  ))}
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} style={{ width: 38, height: 38, border: "none", background: "none", cursor: "pointer" }} />
                    wheel
                  </label>
                  <HexInput value={brandColor} onChange={setBrandColor} />
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 8 }}>Know your exact brand code? Type it above. Your color accents YOUR invoices and header — the app's own look stays fixed, because Fully Inflated is a brand too. 😉 Logo upload lives in My Brand.</div>
                <button style={{ ...bigBtn, marginTop: 18, background: brandColor }} onClick={() => setObStep(1)}>Next: taxes (the quick version) →</button>
              </div>
            )}

            {obStep === 1 && (
              <div className="fi-pop" style={{ marginTop: 26 }}>
                <div className="fi-display" style={{ fontSize: 22, fontWeight: 800 }}>② Your sales tax rate</div>
                <p style={{ fontSize: 15, opacity: 0.8, marginTop: 6 }}>Enter the sales tax rate for where you do business. Every invoice uses it automatically (and you can override it per job when the event travels).</p>
                <label style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                  My sales tax rate
                  <MoneyInput value={taxRate} onChange={setTaxRate} ariaLabel="Sales tax rate" style={{ width: 90 }} />%
                </label>
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#3A3153", fontSize: 14.5, lineHeight: 1.55 }}>
                  💡 <strong>Did you know?</strong> In some states, services — like your design and setup fees — are taxed differently than physical goods. Some states tax them, some don't, and some have rules weirder than a Tuesday. One conversation with your accountant settles it forever. Your state's Department of Revenue website has the official rates.
                </div>
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: "1.5px solid #E8467C", fontSize: 14.5, lineHeight: 1.55 }}>
                  ⚖️ <strong>The part you have to agree to:</strong> Fully Inflated calculates taxes using rates <em>you</em> enter. We don't verify them, and nothing in this app is tax advice. Confirming your rates with your state revenue department or a tax professional is your responsibility.
                </div>
                <button style={{ ...bigBtn, marginTop: 16, background: brandColor, width: "100%" }} onClick={() => { setObAckTime(nowStamp()); setObStep(2); }}>
                  I understand — my rates, my responsibility ✓
                </button>
                <div style={{ fontSize: 12, opacity: 0.55, marginTop: 6, textAlign: "center" }}>Your acceptance is timestamped and saved to your account.</div>
              </div>
            )}

            {obStep === 2 && (
              <div className="fi-pop" style={{ marginTop: 26 }}>
                <div className="fi-display" style={{ fontSize: 22, fontWeight: 800 }}>③ Name your Coach 🧢</div>
                <p style={{ fontSize: 15, opacity: 0.8, marginTop: 6 }}>Your Coach watches every invoice for money leaks — donated rentals, profit-eating discounts, jobs that don't pay you. Give her a name if you want. (Ignoring software is easy. Ignoring <em>Denise</em>? Rude.)</p>
                <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginTop: 14 }}>Coach's name <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                  <input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Denise, Marcus, Big Mama…" style={{ ...input, width: "100%", maxWidth: 300, marginTop: 5, display: "block" }} />
                </label>
                {coachName && <div style={{ fontSize: 15, marginTop: 10 }}>🧢 <strong>Coach {coachName}</strong> reporting for duty.</div>}
                <button style={{ ...bigBtn, marginTop: 18, background: brandColor }} onClick={() => setObStep(3)}>Next: your first client →</button>
              </div>
            )}

            {obStep === 3 && (
              <div className="fi-pop" style={{ marginTop: 26 }}>
                <div className="fi-display" style={{ fontSize: 22, fontWeight: 800 }}>④ Add your first client</div>
                <p style={{ fontSize: 15, opacity: 0.8, marginTop: 6 }}>Every client gets a <strong>permanent ID number</strong> that ties their invoices, records, and paper trail together — names change (marriage happens!), the number never does.</p>
                <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginTop: 14 }}>Client name
                  <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="e.g. Tiffany Jones" style={{ ...input, width: "100%", marginTop: 5, display: "block" }} />
                </label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 170 }}>Email <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                    <input value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} style={{ ...input, width: "100%", marginTop: 5, display: "block" }} />
                  </label>
                  <label style={{ fontSize: 14, fontWeight: 600, minWidth: 140 }}>Phone <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                    <input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} style={{ ...input, width: "100%", marginTop: 5, display: "block" }} />
                  </label>
                </div>
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#3A3153", fontSize: 14.5, lineHeight: 1.55 }}>
                  💡 <strong>Pro move:</strong> once they're created, add their client ID to your contract before they sign. Identity in three places — invoice, records, signature — and "that's not me" stops being an argument.
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                  <button style={{ ...bigBtn, background: brandColor }} onClick={() => { if (addClient(true)) { setObStep(4); setToastMsg(`Welcome aboard! ${coachTitle} is watching your money now. 🎈`); } }}>
                    Add client & finish 🎈
                  </button>
                  <button style={{ ...ghostBtn, background: "transparent", color: "#F6F4FA", borderColor: "#4A4363" }} onClick={() => { setObStep(4); setToastMsg(`Setup done — demo clients loaded so you can play. 🎈`); }}>
                    Skip — use demo clients
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#2B2140", color: "#F6F4FA", padding: "18px 20px 22px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="fi-display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>Fully Inflated</div>
              <div style={{ fontSize: 14, opacity: 0.75 }}>Business coaching that lives inside your invoices</div>
              {bizName && <div style={{ fontSize: 14, marginTop: 4, fontWeight: 700, color: brandColor, filter: "brightness(1.35)" }}>🏢 {bizName}</div>}
              {saved > 0 && (
                <div style={{ marginTop: 6, fontSize: 14.5, color: "#7FE0B4", fontWeight: 600 }}>
                  🎯 {coachTitle} has recovered {money(saved)} for you
                </div>
              )}
            </div>
            <button onClick={() => setShowHowTo(true)} aria-label="How to use this app"
              style={{ ...ghostBtn, background: "transparent", color: "#F6F4FA", borderColor: "#4A4363", padding: "8px 14px", fontSize: 14 }}>
              ? How to use
            </button>
          </div>

          <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => setTip("health")} style={{ textAlign: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", color: "inherit" }}
              aria-label={score ? `Business health score ${health} out of 100 — tap to learn more` : "Business health — no invoices yet, tap to learn more"}>
              <div style={{
                width: balloonSize, height: balloonSize * 1.15, margin: "0 auto",
                background: `radial-gradient(circle at 35% 30%, ${healthColor}EE, ${healthColor})`,
                borderRadius: "50% 50% 50% 50% / 45% 45% 55% 55%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 6px 24px ${healthColor}55`, transition: "all .5s ease",
              }}>
                <span className="fi-display fi-num" style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{score ? health : "—"}</span>
              </div>
              <div style={{ fontSize: 12.5, marginTop: 5, opacity: 0.8 }}>Business Health · ?</div>
            </button>

            <div style={{ flex: 1, minWidth: 230, fontSize: 14 }}>
              {!score ? (
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "#3A3153", lineHeight: 1.5 }}>
                  Your balloon inflates as you invoice. Finalize your first job and this space becomes your scorecard — showing exactly where money leaks and where you're crushing it. 🎈
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
                  <ScoreTile label="Jobs invoiced" value={score.n} good />
                  <ScoreTile label="All fees charged" value={`${score.feesOk}/${score.n}`} good={score.feesOk === score.n} />
                  <ScoreTile label="Paid yourself fully" value={`${score.paidSelf}/${score.n}`} good={score.paidSelf === score.n} />
                  <ScoreTile label="Avg gross margin" value={score.avgMargin.toFixed(0) + "%"} good={score.avgMargin >= 45} />
                  <ScoreTile label="Money up front" value={`${score.deposits}/${score.n}`} good={score.deposits === score.n} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs — frequency-first order */}
      <nav style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 8, padding: "14px 16px 0", flexWrap: "wrap" }}>
        {[["invoice", "Create Invoice"], ["dashboard", "Dashboard"], ["clients", "My Clients"], ["inventory", "Inventory"], ["log", "Invoices & Paper Trail"], ["brand", "My Brand"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "11px 15px", borderRadius: 12, border: "none", cursor: "pointer",
            fontSize: 14.5, fontWeight: 600, fontFamily: "inherit",
            background: tab === k ? "#2B2140" : "#fff", color: tab === k ? "#fff" : "#2B2140",
            boxShadow: tab === k ? "none" : "0 1px 3px rgba(43,33,64,.12)",
          }}>{label}</button>
        ))}
      </nav>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        {tab === "invoice" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setMode("guided"); setStep(0); }}
                style={{ ...chip, padding: "10px 16px", fontWeight: 700, background: mode === "guided" ? "#2B2140" : "#fff", color: mode === "guided" ? "#fff" : "#2B2140" }}>
                🐢 Guided — step by step
              </button>
              <button onClick={() => setMode("quick")}
                style={{ ...chip, padding: "10px 16px", fontWeight: 700, background: mode === "quick" ? "#2B2140" : "#fff", color: mode === "quick" ? "#fff" : "#2B2140" }}>
                ⚡ Quick — one screen
              </button>
            </div>

            {mode === "guided" ? (
              <>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {STEPS.map((sName, i) => (
                    <button key={sName} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}: ${sName}`}
                      style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 2px" }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, color: i === step ? "#fff" : "#2B2140",
                        background: i === step ? brandColor : i < step ? "#C9E8D9" : "#E5DFF2",
                      }} className="fi-num">{i + 1}</span>
                      <span style={{ fontSize: 12.5, fontWeight: i === step ? 800 : 500, opacity: i === step ? 1 : 0.6 }}>{sName}</span>
                    </button>
                  ))}
                </div>
                {SECTIONS[step]}
              </>
            ) : (
              <>{SECTIONS.map((sec) => sec)}</>
            )}
          </div>
        )}

        {tab === "dashboard" && (
          <DashboardTab
            dashboard={dashboard}
            invoices={invoices}
            brandColor={brandColor}
            monthlyObservation={monthlyObservation}
            coachTitle={coachTitle}
            NATIONAL_AVG_HOURLY={NATIONAL_AVG_HOURLY}
          />
        )}

        {tab === "clients" && (
          <section style={card}>
            <h2 style={h2}>My Clients</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search name, ID, email…" style={{ ...input, flex: 1, minWidth: 200, maxWidth: 340 }} />
              {[["active", "Active"], ["past", "Completed / Past"], ["all", "All"]].map(([k, label]) => (
                <button key={k} onClick={() => setClientFilter(k)}
                  style={{ ...chip, padding: "9px 14px", fontWeight: 600, background: clientFilter === k ? "#2B2140" : "#fff", color: clientFilter === k ? "#fff" : "#2B2140" }}>
                  {label}
                </button>
              ))}
            </div>

            {clients
              .filter((c) => {
                const q = clientSearch.trim().toLowerCase();
                if (q && !(c.name + " " + c.id + " " + (c.email || "")).toLowerCase().includes(q)) return false;
                if (clientFilter === "active") return clientHasActive(c.id);
                if (clientFilter === "past") return !clientHasActive(c.id);
                return true;
              })
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => {
                const jobs = invoices.filter((i) => i.clientId === c.id);
                return (
                  <div key={c.id} style={{
                    marginTop: 12, padding: 14, borderRadius: 12,
                    border: c.isDemo ? "1.5px solid #E8467C" : "1.5px solid #E5DFF2",
                    background: c.isDemo ? "#FCE9EC" : "#F9F7FC",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{c.name}</strong>
                        <span className="fi-num" style={{ marginLeft: 8, fontSize: 12.5, padding: "3px 8px", borderRadius: 8, background: "#fff", fontWeight: 700 }}>{c.id}</span>
                        {c.isDemo && <span style={{ marginLeft: 8, fontSize: 11.5, padding: "3px 8px", borderRadius: 8, background: "#E8467C", color: "#fff", fontWeight: 800 }}>DEMO — for practice</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setCustomer(c); setTab("invoice"); }} style={{ ...ghostBtn, padding: "8px 14px", fontSize: 14, background: "#fff" }}>Invoice them →</button>
                        {c.isDemo && <button onClick={removeDemoClient} style={{ ...ghostBtn, padding: "8px 14px", fontSize: 14, background: "#fff", color: "#E8467C", borderColor: "#E8467C" }}>Remove demo</button>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13.5, opacity: 0.7, marginTop: 4 }}>{[c.email, c.phone, c.address].filter(Boolean).join(" · ") || "no contact info yet"}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                      {jobs.length === 0 ? (
                        <span style={{ fontSize: 13, opacity: 0.6 }}>No jobs yet</span>
                      ) : jobs.map((j) => {
                        const cd = countdownMeta(j);
                        return (
                          <span key={j.id} style={{ fontSize: 12.5, padding: "4px 10px", borderRadius: 16, background: "#F6F4FA", border: `1.5px solid ${jobStatusMeta[j.jobStatus].color}` }}>
                            {j.id} · {jobStatusMeta[j.jobStatus].label}
                            {cd && <span style={{ marginLeft: 6, fontWeight: 800, color: cd.color }}>· {cd.label}</span>}
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13.5 }}>
                      {c.contract ? (
                        <span>📎 <strong>{c.contract.name}</strong> · attached {c.contract.when}</span>
                      ) : (
                        <label style={{ cursor: "pointer", color: "#5B8DEF", fontWeight: 600 }}>
                          📎 Attach signed contract
                          <input type="file" accept=".pdf,image/*" onChange={(e) => attachContract(c.id, e)} style={{ display: "none" }} />
                        </label>
                      )}
                      <span style={{ opacity: 0.55, marginLeft: 8 }}>— we store it, your attorney writes it. Anything you upload or remove is your call and your responsibility.</span>
                    </div>
                    {jobs.length > 0 && (
                      <details style={{ marginTop: 10, fontSize: 13 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Running log ({jobs.reduce((a, j) => a + j.history.length, 0)} events)</summary>
                        {jobs.flatMap((j) => j.history.map((h, i) => ({ ...h, jobId: j.id, key: `${j.id}-${i}` })))
                          .sort((a, b) => a.key.localeCompare(b.key))
                          .map((h) => (
                            <div key={h.key} style={{ padding: "4px 0", opacity: 0.8 }}>
                              <span className="fi-num" style={{ fontWeight: 700 }}>{h.when}</span> — {h.jobId}: {h.label}
                            </div>
                          ))}
                        <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4 }}>Auto-filled from invoice activity — nothing to re-type.</div>
                      </details>
                    )}
                  </div>
                );
              })}

            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#F6F4FA" }}>
              <div className="fi-display" style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Add a client</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name
                  <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Email
                  <input value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Phone
                  <input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Mailing address <span style={{ fontWeight: 400, opacity: 0.6 }}>(for samples/mail)</span>
                  <input value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} placeholder="123 Main St, City, State" />
                </label>
              </div>
              <button style={{ ...bigBtn, marginTop: 12, fontSize: 15, padding: "12px 18px", background: brandColor }} onClick={() => addClient(false)}>Add client</button>
            </div>
          </section>
        )}

        {tab === "inventory" && (
          <section style={card}>
            <h2 style={h2}>Inventory</h2>
            {coachOn && deadStock.length > 0 && (
              <div className="fi-pop" style={{ ...coachChip, background: "#FBF3E4", borderColor: "#DC8A1F", marginTop: 0, marginBottom: 10 }}>
                <strong>🧢 {coachTitle} — sleeping stock:</strong>{" "}
                {deadStock.map((it) => it.name).join(", ")} {deadStock.length === 1 ? "hasn't" : "haven't"} appeared on a single invoice yet — that's{" "}
                <strong className="fi-num">{money(deadStock.reduce((a, it) => a + it.cost * it.qty, 0))}</strong> napping on a shelf. Run a special to move it, or let this be the voice in your head before the next trendy color haul. 😴
              </div>
            )}
            <input value={invSearch} onChange={(e) => setInvSearch(e.target.value)} placeholder="Search by name or label…" style={{ ...input, width: "100%", maxWidth: 340, marginBottom: 6 }} />
            {[...new Set(inventory
              .filter((it) => !invSearch.trim() || (it.name + " " + (it.label || "")).toLowerCase().includes(invSearch.trim().toLowerCase()))
              .map((it) => it.label || "Unlabeled"))]
              .sort((a, b) => a.localeCompare(b))
              .map((grp) => {
                const items = inventory
                  .filter((it) => (it.label || "Unlabeled") === grp)
                  .filter((it) => !invSearch.trim() || (it.name + " " + (it.label || "")).toLowerCase().includes(invSearch.trim().toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name));
                const open = invSearch.trim() ? true : !!openGroups[grp];
                return (
                  <div key={grp} style={{ marginTop: 10, border: "1.5px solid #EEE9F6", borderRadius: 12, overflow: "hidden" }}>
                    <button onClick={() => setOpenGroups((g) => ({ ...g, [grp]: !g[grp] }))}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "none", background: "#F6F4FA", cursor: "pointer", fontFamily: "inherit" }}>
                      <span className="fi-display" style={{ fontSize: 15, fontWeight: 800 }}>{grp} <span style={{ opacity: 0.55, fontWeight: 500 }}>({items.length})</span></span>
                      <span aria-hidden="true">{open ? "▾" : "▸"}</span>
                    </button>
                    {open && items.map((it) => (
                      <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 14px", borderTop: "1px solid #EEE9F6", fontSize: 15, flexWrap: "wrap" }}>
                        <span style={{ flex: 2, minWidth: 150, fontWeight: 600 }}>{it.name}</span>
                        <span style={{ fontSize: 12.5, padding: "3px 10px", borderRadius: 20, background: it.cat === "reusable_asset" ? "#EAF1FD" : "#F1EDF9" }}>
                          {it.cat === "reusable_asset" ? "asset" : "consumable"}
                        </span>
                        <span className="fi-num" style={{ fontSize: 14 }}>cost {money(it.cost)}</span>
                        <span className="fi-num" style={{ fontWeight: 700, color: it.qty <= it.reorder ? "#E8467C" : "#2B2140" }}>{it.qty} left</span>
                        <button onClick={() => setInventory((prev) => prev.filter((x) => x.id !== it.id))} aria-label={`Delete ${it.name}`} style={{ ...chip, padding: "6px 10px" }}>✕</button>
                      </div>
                    ))}
                  </div>
                );
              })}

            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#F6F4FA" }}>
              <div className="fi-display" style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Add an item</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name
                  <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} placeholder="e.g. Sempertex 11&quot; Reflex Gold" />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Label / category
                  <input value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} placeholder="e.g. Balloons, Backdrops" list="fi-labels" />
                  <datalist id="fi-labels">
                    {[...new Set(inventory.map((it) => it.label).filter(Boolean))].map((l) => <option key={l} value={l} />)}
                  </datalist>
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Type
                  <select value={newItem.cat} onChange={(e) => setNewItem({ ...newItem, cat: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }}>
                    <option value="consumable">Consumable — sold to client</option>
                    <option value="reusable_asset">Reusable asset — arch, stand…</option>
                  </select>
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Wholesale cost
                  <MoneyInput value={newItem.cost} onChange={(v) => setNewItem({ ...newItem, cost: v })} ariaLabel="Wholesale cost" style={{ width: "100%", marginTop: 4 }} />
                </label>
                {newItem.cat === "consumable" && (
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Retail price
                    <MoneyInput value={newItem.price} onChange={(v) => setNewItem({ ...newItem, price: v })} ariaLabel="Retail price" style={{ width: "100%", marginTop: 4 }} />
                  </label>
                )}
                <label style={{ fontSize: 13, fontWeight: 600 }}>Qty on hand
                  <MoneyInput value={newItem.qty} onChange={(v) => setNewItem({ ...newItem, qty: Math.round(v) })} ariaLabel="Quantity on hand" style={{ width: "100%", marginTop: 4 }} />
                </label>
              </div>
              {coachOn && newItem.cat === "consumable" && newItem.cost > 0 && newItem.price > 0 && newItem.price < newItem.cost * 2 && (
                <div style={{ ...coachChip, background: "#FBF3E4", borderColor: "#DC8A1F" }}>
                  <strong>🧢 {coachTitle}:</strong> That markup is under 2×. Most event pros price consumables at 2–3× wholesale to survive waste, popped stock, and prep time. Just saying.
                </div>
              )}
              <button style={{ ...bigBtn, marginTop: 12, fontSize: 15, padding: "12px 18px", background: brandColor }} onClick={() => {
                if (!newItem.name.trim()) { setToastMsg("Give the item a name first."); return; }
                const lbl2 = newItem.label.trim() || "Unlabeled";
                setInventory((prev) => [...prev, {
                  id: "u" + Date.now(), name: newItem.name.trim(), label: lbl2, cat: newItem.cat,
                  cost: newItem.cost, price: newItem.cat === "reusable_asset" ? 0 : newItem.price,
                  qty: newItem.qty, reorder: 2, lead: 7, taxPaid: +(newItem.cost * (taxRate / 100)).toFixed(2), usedCount: 0,
                }]);
                setOpenGroups((g) => ({ ...g, [lbl2]: true }));
                setNewItem({ name: "", label: "", cat: "consumable", cost: 0, price: 0, qty: 1 });
                setToastMsg("Item added to inventory. 🎈");
              }}>Add to inventory</button>
            </div>
          </section>
        )}

        {tab === "log" && (
          <section style={card}>
            <h2 style={h2}>Invoices & Paper Trail — {customer.name}</h2>

            <div style={{ padding: 14, borderRadius: 12, background: "#EAF1FD", border: "1.5px solid #5B8DEF", fontSize: 14.5, lineHeight: 1.55 }}>
              <strong>📎 Paper Trail:</strong> when you email this client from your own email app, add this address as an extra recipient. Every message files itself here automatically, time-stamped — your receipts for any "but you said…" moment.
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <code style={{ fontSize: 13, background: "#fff", padding: "8px 10px", borderRadius: 8 }}>{customer.alias}</code>
                <button onClick={copyAlias} style={{ ...ghostBtn, padding: "8px 14px", fontSize: 14 }}>Copy address</button>
              </div>
            </div>

            {invoices.length === 0 && <p style={{ fontSize: 14.5, opacity: 0.7, marginTop: 14 }}>No invoices yet. Finalize one and it lands here with live payment tracking and a full status history.</p>}
            {invoices.map((inv) => {
              const m = payStatusMeta[inv.payStatus];
              const js = jobStatusMeta[inv.jobStatus];
              const draft = statusDraft && statusDraft.id === inv.id ? statusDraft : null;
              const needsReason = draft && (draft.status === "cancelled_client" || draft.status === "cancelled_business" || draft.status === "rescheduled");
              const isQuote = inv.docType === "quote";
              return (
                <div key={inv.id} style={{
                  padding: 14, borderRadius: 12, marginTop: 12,
                  background: inv.voided ? "#F0EEF4" : m.bg,
                  border: `1.5px solid ${inv.voided ? "#B7AFC9" : m.border}`,
                  fontSize: 14.5, opacity: inv.voided ? 0.75 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <strong>
                      {inv.voided && "🚫 "}{inv.id} · {inv.customer} <span className="fi-num" style={{ fontSize: 12, opacity: 0.6 }}>({inv.clientId})</span>
                      {isQuote && <span style={{ marginLeft: 6, fontSize: 11.5, padding: "3px 8px", borderRadius: 8, background: "#5B8DEF", color: "#fff", fontWeight: 800 }}>QUOTE</span>}
                      {inv.voided && <span style={{ marginLeft: 6, fontSize: 11.5, padding: "3px 8px", borderRadius: 8, background: "#8B84A3", color: "#fff", fontWeight: 800 }}>VOIDED</span>}
                    </strong>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, padding: "3px 10px", borderRadius: 16, border: `1.5px solid ${js.color}`, fontWeight: 700 }}>{js.label}</span>
                      {!isQuote && <span style={{ fontWeight: 700 }}>{inv.payStatus === "paid" ? "Paid ✓" : m.label}</span>}
                    </span>
                  </div>
                  <div className="fi-num" style={{ marginTop: 6 }}>
                    Total {money(inv.total)} · {inv.payType === "retainer" ? "Retainer" : "Deposit"} {money(inv.deposit)} · Balance {money(inv.balance)} ({inv.terms})
                  </div>
                  <div className="fi-num" style={{ fontSize: 13.5, opacity: 0.8, marginTop: 2 }}>
                    Your paycheck {money(inv.paycheck)} · True profit {money(inv.trueProfit)} · Tax held {money(inv.tax)} @ {inv.taxPct}%
                  </div>
                  {isQuote && !inv.voided && (
                    <div style={{ ...coachChip, background: "#EAF1FD", borderColor: "#5B8DEF" }}>
                      This is a <strong>Quote</strong> — inventory is soft-reserved, nothing's been deducted from stock yet.
                      <button onClick={() => convertQuoteToInvoice(inv.id)} style={{ ...bigBtn, marginTop: 8, padding: "9px 14px", fontSize: 13.5, background: "#5B8DEF" }}>
                        Client said yes → Convert to Invoice
                      </button>
                    </div>
                  )}
                  {!inv.voided && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                      {!isQuote && inv.payStatus !== "paid" && inv.jobStatus === "active" && (
                        <button onClick={() => advancePay(inv.id)} style={{ ...ghostBtn, padding: "8px 13px", fontSize: 13.5 }}>
                          {inv.payStatus === "sent" ? "Mark deposit received" : "Mark balance received"}
                        </button>
                      )}
                      <select value={draft ? draft.status : ""} onChange={(e) => setStatusDraft({ id: inv.id, status: e.target.value, reason: "" })} style={{ ...input, padding: "8px 10px", fontSize: 13.5 }}>
                        <option value="" disabled>Change job status…</option>
                        <option value="complete">Mark complete</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="cancelled_client">Cancelled — by client</option>
                        <option value="cancelled_business">Cancelled — by {bizName || "business"}</option>
                      </select>
                      {needsReason && (
                        <>
                          <select value={draft.reason} onChange={(e) => setStatusDraft({ ...draft, reason: e.target.value })} style={{ ...input, padding: "8px 10px", fontSize: 13.5 }}>
                            <option value="" disabled>Reason…</option>
                            {(draft.status === "rescheduled" ? ["client request", "weather", "vendor conflict", "other"] : CANCEL_REASONS).map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => applyStatus(inv.id)} disabled={!draft.reason} style={{ ...bigBtn, padding: "8px 14px", fontSize: 13.5, opacity: draft.reason ? 1 : 0.5 }}>Save</button>
                        </>
                      )}
                      {draft && draft.status === "complete" && (
                        <button onClick={() => applyStatus(inv.id)} style={{ ...bigBtn, padding: "8px 14px", fontSize: 13.5 }}>Save</button>
                      )}
                      <button onClick={() => voidInvoice(inv.id)} style={{ ...ghostBtn, padding: "8px 13px", fontSize: 13.5, color: "#E8467C", borderColor: "#E8467C" }}>
                        {isQuote ? "Discard quote" : "Void"}
                      </button>
                    </div>
                  )}
                  {inv.voided && (
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => reissueFrom(inv.id)} style={{ ...bigBtn, padding: "9px 14px", fontSize: 13.5, background: brandColor }}>
                        Fix & reissue as new invoice
                      </button>
                    </div>
                  )}
                  <details style={{ marginTop: 8, fontSize: 13 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>History ({inv.history.length})</summary>
                    {inv.history.map((h, i) => (
                      <div key={i} style={{ padding: "4px 0", opacity: 0.8 }}><span className="fi-num" style={{ fontWeight: 700 }}>{h.when}</span> — {h.label}</div>
                    ))}
                    <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>Entries are timestamped and permanent — history is added to, never rewritten.</div>
                  </details>
                  {coachOn && inv.payStatus === "sent" && inv.jobStatus === "active" && (
                    <div style={{ fontSize: 13.5, marginTop: 8 }}>
                      🧢 <strong>{coachTitle}:</strong> No money down, no date hold. Materials don't get ordered on a promise.
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {tab === "brand" && (
          <section style={card}>
            <h2 style={h2}>My Brand & Settings</h2>
            <p style={{ fontSize: 14.5, opacity: 0.8, marginTop: -4 }}>What your clients see — and how your {coachTitle} behaves.</p>

            <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginTop: 12 }}>Business name
              <input value={bizName} onChange={(e) => setBizName(e.target.value)} style={{ ...input, width: "100%", maxWidth: 380, marginTop: 4, display: "block" }} />
            </label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600 }}>Business email
                <input value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} style={{ ...input, width: 240, marginTop: 4, display: "block" }} />
              </label>
              <label style={{ fontSize: 14, fontWeight: 600 }}>Business phone
                <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} style={{ ...input, width: 180, marginTop: 4, display: "block" }} />
              </label>
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 14 }}>Brand color <span style={{ fontWeight: 400, opacity: 0.6 }}>(accents your invoices & header)</span></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              {SWATCHES.map((c) => (
                <button key={c} onClick={() => setBrandColor(c)} aria-label={`Choose color ${c}`}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: brandColor === c ? "3px solid #2B2140" : "3px solid transparent", cursor: "pointer" }} />
              ))}
              <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} aria-label="Custom brand color" style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer" }} />
              <HexInput value={brandColor} onChange={setBrandColor} />
            </div>
            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>Know your exact code (e.g. from a past logo file)? Type it above instead of hunting on the wheel.</div>

            <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginTop: 16 }}>Logo
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "block", marginTop: 6, fontSize: 14 }} />
            </label>
            {logo ? (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <img src={logo} alt="Your logo" style={{ height: 56, borderRadius: 10, border: "1.5px solid #E5DFF2" }} />
                <button style={{ ...ghostBtn, padding: "8px 14px", fontSize: 14 }} onClick={() => setLogo(null)}>Remove</button>
              </div>
            ) : (
              <div style={{ fontSize: 13.5, opacity: 0.65, marginTop: 8 }}>PNG or JPG — big phone photos are automatically shrunk to fit, so don't worry about file size.</div>
            )}

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                Sales tax rate <InfoBtn onClick={() => setTip("jobtax")} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <MoneyInput value={taxRate} onChange={setTaxRate} ariaLabel="Sales tax rate" style={{ width: 90 }} />%
              </label>
              <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 6 }}>
                Your default rate — each invoice can override it for jobs that travel. {obAckTime ? `Tax responsibility acknowledged ${obAckTime}.` : ""} Rates are yours to verify with your state revenue department.
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Your Coach 🧢</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                  <input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Denise, Marcus…" style={{ ...input, width: 180, marginTop: 4, display: "block" }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Mode
                  <select value={coachMode} onChange={(e) => setCoachMode(e.target.value)} style={{ ...input, marginTop: 4, display: "block" }}>
                    <option value="full">Full Coach — advice + guardrail pop-ups</option>
                    <option value="advisory">Advisory — quiet tips, no interruptions</option>
                    <option value="off">Off — I've got this (still tracked)</option>
                  </select>
                </label>
              </div>
              <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6 }}>
                Turning {coachName || "the Coach"} off doesn't turn off the math — your scorecard keeps tracking quietly. Graduation is the goal. 🎓
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Invoice style</div>
              <select value={invoiceStyle} onChange={(e) => setInvoiceStyle(e.target.value)} style={{ ...input, marginTop: 6, maxWidth: 380, width: "100%" }}>
                <option value="itemized">Itemized — every line listed</option>
                <option value="simple">Simple — one description + total</option>
              </select>
              {invoiceStyle === "simple" && (
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginTop: 10 }}>Description clients see
                  <input value={simpleDesc} onChange={(e) => setSimpleDesc(e.target.value)} style={{ ...input, width: "100%", maxWidth: 380, marginTop: 4, display: "block" }} />
                </label>
              )}
            </div>

            <div style={{ marginTop: 16, fontSize: 13, opacity: 0.65 }}>
              💳 Payments are powered by Stripe — clients pay by card, Apple Pay, or Google Pay. Support for connecting Square and other processors is on our roadmap.
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.65 }}>Demo note: settings live in this session only. In the real app they save to your account.</div>
          </section>
        )}
        <div style={{ maxWidth: 960, margin: "16px auto 0", padding: "0 4px", fontSize: 11, opacity: 0.5, lineHeight: 1.5, textAlign: "center" }}>
          Fully Inflated is an educational and organizational tool. Coach observations and suggestions are informational only, not financial, legal, or tax advice. All final pricing decisions are the sole responsibility of the user.
        </div>
      </main>

      {/* Sticky total bar — guided mode */}
      {mode === "guided" && tab === "invoice" && !onboarding && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
          background: "#2B2140", color: "#fff", padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 15 }}>Invoice for <strong>{customer.name}</strong> · <strong className="fi-num" style={{ fontSize: 17 }}>{money(calc.total)}</strong></span>
          <span style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              style={{ ...ghostBtn, padding: "10px 16px", fontSize: 15, opacity: step === 0 ? 0.4 : 1, background: "transparent", color: "#fff", borderColor: "#4A4363" }}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} style={{ ...bigBtn, padding: "10px 18px", fontSize: 15, background: brandColor }}>
                Next: {STEPS[step + 1]} →
              </button>
            ) : (
              <button onClick={tryFinalize} style={{ ...bigBtn, padding: "10px 18px", fontSize: 15, background: "#1E9E6A" }}>
                Review invoice ✓
              </button>
            )}
          </span>
        </div>
      )}

      {/* How-to overlay (reopenable) */}
      {showHowTo && (
        <Modal onClose={() => setShowHowTo(false)}>
          <div className="fi-display" style={{ fontSize: 23, fontWeight: 800 }}>How Fully Inflated works 🎈</div>
          <ol style={{ fontSize: 15.5, lineHeight: 1.6, paddingLeft: 20, marginTop: 10 }}>
            <li><strong>Create Invoice</strong> — 🐢 Guided walks you step by step; ⚡ Quick is one screen for pros. Same math either way.</li>
            <li><strong>The truth panel</strong> splits your paycheck from true profit, so you always know if a job actually pays you.</li>
            <li><strong>{coachTitle}</strong> flags donated rentals, profit-eating discounts, and underpriced jobs — always with real dollar amounts.</li>
            <li><strong>Dashboard</strong> shows your big picture — revenue by month, your most profitable category, and a plain "was I profitable?" verdict from {coachTitle}.</li>
            <li><strong>My Clients</strong> holds each client's permanent ID, jobs, statuses, contract, running log, and countdown to their event date.</li>
            <li><strong>Your balloon</strong> inflates as your pricing discipline improves. Tap it anytime.</li>
          </ol>
          <button style={{ ...bigBtn, marginTop: 14, background: brandColor }} onClick={() => setShowHowTo(false)}>Got it 🎈</button>
        </Modal>
      )}

      {/* Invoice preview */}
      {modal === "preview" && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.55 }}>What your client sees</div>
          <div style={{ border: "1.5px solid #E5DFF2", borderRadius: 16, padding: 18, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {logo && <img src={logo} alt="logo" style={{ height: 42, borderRadius: 8 }} />}
              <div>
                <div className="fi-display" style={{ fontSize: 19, fontWeight: 800, color: brandColor }}>{bizName || "Your Business"}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6 }}>{[bizEmail, bizPhone].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div style={{ borderTop: `2.5px solid ${brandColor}`, margin: "12px 0", opacity: 0.85 }} />
            <div className="fi-display" style={{ fontSize: 17, fontWeight: 800 }}>Invoice for {customer.name}</div>
            <div style={{ fontSize: 12.5, opacity: 0.6 }}>INV-{String(invoices.length + 1).padStart(3, "0")} · Client {customer.id}</div>
            {venueAddress.trim() && (
              <div style={{ fontSize: 13, marginTop: 6, padding: "8px 10px", borderRadius: 8, background: "#F6F4FA" }}>
                📍 {fulfillType === "delivery" ? "Shipping to" : "Event at"}: {venueAddress}
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 14.5 }}>
              {invoiceStyle === "itemized" ? (
                <>
                  {lines.map((l) => {
                    const it = inventory.find((i) => i.id === l.itemId);
                    return it.cat === "consumable" ? (
                      <Row key={l.itemId} a={`${it.name} × ${l.qty}`} b={money(it.price * l.qty * (1 + markupPct / 100))} />
                    ) : (
                      <Row key={l.itemId} a={`${it.name} (on-site use)`} b="included" />
                    );
                  })}
                  {fees.service > 0 && <Row a="Service fee" b={money(fees.service)} />}
                  {fees.design > 0 && <Row a="Design fee" b={money(fees.design)} />}
                  {travelFee > 0 && <Row a="Travel" b={money(travelFee)} />}
                  {fees.rental > 0 && <Row a="Rental / hardware" b={money(fees.rental)} />}
                </>
              ) : (
                <Row a={simpleDesc} b={money(calc.preDiscount)} />
              )}
              {discountPct > 0 && <Row a={`Special — ${discountPct}% off`} b={"−" + money(calc.discountAmt)} accent="#1E9E6A" />}
              <Row a={`Sales tax (${effTaxPct}%)`} b={money(calc.salesTax)} />
              <div style={{ borderTop: "1.5px solid #E5DFF2", marginTop: 8, paddingTop: 8 }}>
                <Row a={<strong>Total</strong>} b={<strong className="fi-num">{money(calc.total)}</strong>} />
                <Row a={`${payType === "retainer" ? "Retainer" : "Deposit"} due today (${depositPct}%${payType === "retainer" ? ", non-refundable" : ""})`} b={money(calc.deposit)} accent="#5B8DEF" />
                <Row a={`Balance ${balanceTerms === "custom" ? `due ${customDays} days before event` : BALANCE_TERMS[balanceTerms]}`} b={money(calc.balance)} />
              </div>
            </div>
            <button style={{ ...bigBtn, width: "100%", marginTop: 14, background: brandColor }} onClick={doFinalize}>
              Pay {money(calc.deposit)} {payType} now
            </button>
            <div style={{ fontSize: 12, textAlign: "center", opacity: 0.55, marginTop: 6 }}>demo — in the real app this is a live checkout, sent by email or text link</div>
          </div>
          {coachMode === "advisory" && usesAssets && fees.rental === 0 && (
            <div style={{ ...coachChip, background: "#FBF3E4", borderColor: "#DC8A1F" }}>
              <strong>🧢 {coachTitle} (quietly):</strong> this invoice uses your gear with a $0 rental fee — about {money(calc.suggestedRental)} unbilled.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button style={{ ...bigBtn, background: brandColor }} onClick={doFinalize}>Send as Invoice 🎈</button>
            <button style={{ ...ghostBtn, borderColor: "#5B8DEF", color: "#5B8DEF" }} onClick={doSaveQuote}>Save as Quote instead</button>
            <button style={ghostBtn} onClick={() => setModal(null)}>Keep editing</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10, lineHeight: 1.5 }}>
            💡 A <strong>Quote</strong> soft-reserves these items without touching your inventory count — perfect for "just asking" clients. It only deducts stock once you convert it to a real Invoice from the Paper Trail tab.
          </div>
        </Modal>
      )}

      {/* Rental coach modal */}
      {modal === "rental" && (
        <Modal onClose={() => setModal(null)}>
          <div className="fi-display" style={{ fontSize: 24, fontWeight: 800 }}>Hold up — you're donating your gear. 🎈</div>
          <p style={{ fontSize: 16, lineHeight: 1.55, marginTop: 10 }}>
            This invoice uses your <strong>reusable assets</strong> and you're charging <strong>$0</strong> to rent them.
            Industry standard is <strong>~15% of the product subtotal</strong> for depreciation, storage, and replacement.
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>
            For this invoice, that's <span className="fi-num" style={{ color: "#1E9E6A" }}>{money(calc.suggestedRental)}</span>.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button style={bigBtn} onClick={acceptRental}>Add {money(calc.suggestedRental)} rental fee</button>
            <button style={ghostBtn} onClick={() => setModal(null)}>Customize amount</button>
            <button style={ghostBtn} onClick={() => setModal("preview")}>Skip this time</button>
          </div>
          <details style={{ marginTop: 14, fontSize: 14.5 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Why does this matter?</summary>
            <p style={{ marginTop: 6, opacity: 0.85 }}>
              Your arch frame cost $180 and survives ~20 events. Every "free" use, you absorb $9 of wear plus storage.
              Rental fees are how the frame buys its own replacement — instead of you buying it twice.
            </p>
          </details>
        </Modal>
      )}

      {/* Negative true-profit modal */}
      {modal === "negative" && (
        <Modal onClose={() => setModal(null)}>
          <div className="fi-display" style={{ fontSize: 24, fontWeight: 800, color: "#E8467C" }}>This job doesn't pay you.</div>
          <p style={{ fontSize: 16, marginTop: 10, lineHeight: 1.55 }}>
            After materials, overhead, and your <strong className="fi-num">{money(calc.paycheck)}</strong> paycheck, true profit is{" "}
            <strong className="fi-num">{money(calc.trueProfit)}</strong>. In real life: you'd work {hours} hours and the business ends up{" "}
            {calc.trueProfit < 0 ? "paying for the privilege" : "with nothing left to grow on"}. Raise a fee, cut the hours, or walk — losing money on purpose is a strategy, not an accident.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button style={bigBtn} onClick={() => setModal(null)}>Fix my pricing</button>
            <button style={ghostBtn} onClick={() => setModal("preview")}>Proceed anyway (eyes open)</button>
          </div>
        </Modal>
      )}

      {/* Margin-honesty check — separate from discount illusion, fires when COGS is suspiciously low vs. total */}
      {modal === "marginhonesty" && (
        <Modal onClose={() => setModal(null)}>
          <div className="fi-display" style={{ fontSize: 22, fontWeight: 800 }}>🧢 Quick honesty check</div>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, marginTop: 10 }}>
            Materials on this job cost <strong className="fi-num">{money(calc.cogs)}</strong>, but you're charging <strong className="fi-num">{money(calc.total)}</strong> total —
            an unusually high margin, even accounting for your service fee. Worth a gut check: does this price reflect the quality and brand of materials you actually used?
            If a client expects premium and got budget materials at a premium price, that's the kind of thing that costs you a repeat client — even if nobody says it out loud.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button style={bigBtn} onClick={() => setModal("preview")}>Looks right to me, continue</button>
            <button style={ghostBtn} onClick={() => setModal(null)}>Let me double-check</button>
          </div>
        </Modal>
      )}

      {/* Coach address confirmation */}
      {showAddressCheck && (
        <Modal onClose={() => { setShowAddressCheck(false); }}>
          <div className="fi-display" style={{ fontSize: 21, fontWeight: 800 }}>🧢 Quick check — is that right?</div>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, marginTop: 10 }}>
            Is <strong>{venueAddress}</strong> where the {fulfillType === "delivery" ? "shipment goes" : "event is happening"} — not necessarily {customer.name}'s home address, if that's different?
          </p>
          {customer.address && customer.address.trim().toLowerCase() !== venueAddress.trim().toLowerCase() && (
            <div style={{ ...coachChip, background: "#FBF3E4", borderColor: "#DC8A1F", marginTop: 10 }}>
              Heads up — this is different from {customer.name}'s address on file (<em>{customer.address}</em>). Just double-checking you didn't grab the wrong one.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button style={bigBtn} onClick={() => { setAddressConfirmed(true); setShowAddressCheck(false); setModal("preview"); }}>Yep, that's right</button>
            <button style={ghostBtn} onClick={() => setShowAddressCheck(false)}>Let me fix it</button>
          </div>
        </Modal>
      )}

      {/* Tooltip modal */}
      {tip && (
        <Modal onClose={() => setTip(null)}>
          <div className="fi-display" style={{ fontSize: 21, fontWeight: 800 }}>Explain this to me</div>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, marginTop: 10 }}>{TIPS[tip]}</p>
          <button style={{ ...bigBtn, marginTop: 14, background: brandColor }} onClick={() => setTip(null)}>Got it</button>
        </Modal>
      )}

      {toast && (
        <div className="fi-pop" role="status" style={{
          position: "fixed", bottom: mode === "guided" && tab === "invoice" && !onboarding ? 78 : 20, left: "50%", transform: "translateX(-50%)",
          background: "#2B2140", color: "#fff", padding: "12px 20px", borderRadius: 14,
          fontSize: 15, fontWeight: 600, boxShadow: "0 8px 30px rgba(43,33,64,.35)", zIndex: 110, maxWidth: "90vw",
        }}>{toast}</div>
      )}
    </div>
  );
}

/* ── bits ── */
const card = { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(43,33,64,.08)" };
const h2 = { fontFamily: "'Bricolage Grotesque','Outfit',sans-serif", fontSize: 19, fontWeight: 800, margin: "0 0 12px" };
const sub = { fontWeight: 400, fontSize: 14, opacity: 0.6 };
const lbl = { fontSize: 15, display: "flex", alignItems: "center", gap: 8 };
const input = { fontSize: 16, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #D9D3E8", fontFamily: "inherit", color: "#2B2140", background: "#fff" };
const chip = { fontSize: 14.5, padding: "10px 14px", borderRadius: 12, border: "1.5px solid #D9D3E8", background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "#2B2140" };
const coachChip = { marginTop: 12, padding: "12px 14px", borderRadius: 12, border: "1.5px solid", fontSize: 14.5, lineHeight: 1.5, color: "#2B2140" };
const bigBtn = { fontSize: 17, fontWeight: 700, padding: "14px 22px", borderRadius: 14, border: "none", background: "#E8467C", color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const ghostBtn = { fontSize: 16, fontWeight: 600, padding: "13px 18px", borderRadius: 14, border: "1.5px solid #D9D3E8", background: "#fff", color: "#2B2140", cursor: "pointer", fontFamily: "inherit" };

function DashboardTab({ dashboard, invoices, brandColor, monthlyObservation, coachTitle, NATIONAL_AVG_HOURLY }) {
  const monthKeys = Object.keys(dashboard.months).sort();
  const [selected, setSelected] = useState(monthKeys[monthKeys.length - 1] || null);
  const [showObs, setShowObs] = useState(false);
  const maxRev = Math.max(1, ...monthKeys.map((k) => dashboard.months[k].revenue));
  const monthLabel = (k) => {
    if (!k || k === "unknown") return "—";
    const [y, m] = k.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString([], { month: "short", year: "2-digit" });
  };

  if (invoices.length === 0) {
    return (
      <section style={card}>
        <h2 style={h2}>Dashboard</h2>
        <div style={{ padding: 20, borderRadius: 12, background: "#F6F4FA", textAlign: "center", fontSize: 15, opacity: 0.75 }}>
          🎈 Nothing to show yet — finalize a few invoices and this becomes your big-picture view: revenue by month, your most profitable niche, and a plain-English "was I profitable?" verdict.
        </div>
      </section>
    );
  }

  const obs = selected ? monthlyObservation(selected) : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <h2 style={h2}>Dashboard <span style={sub}>(the big picture)</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <Stat label="Year total revenue" value={money(dashboard.yearTotal)} color={brandColor} />
          <Stat label="Year true profit" value={money(dashboard.yearProfit)} color={dashboard.yearProfit >= 0 ? "#1E9E6A" : "#E8467C"} />
          <Stat label="Jobs this year" value={invoices.length} />
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="fi-display" style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Revenue by month</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140, overflowX: "auto", paddingBottom: 4 }}>
            {monthKeys.map((k) => {
              const m = dashboard.months[k];
              const h = Math.max(6, (m.revenue / maxRev) * 120);
              return (
                <button key={k} onClick={() => setSelected(k)} aria-label={`${monthLabel(k)}: ${money(m.revenue)}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 44 }}>
                  <span className="fi-num" style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>{money(m.revenue).replace("$", "")}</span>
                  <div style={{ width: 30, height: h, borderRadius: 6, background: k === selected ? brandColor : "#D9D3E8", transition: "background .2s" }} />
                  <span style={{ fontSize: 11, fontWeight: k === selected ? 800 : 500 }}>{monthLabel(k)}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>Tap a bar to see that month's breakdown and Coach's take below.</div>
        </div>
      </section>

      {selected && (
        <section style={card}>
          <h2 style={h2}>{monthLabel(selected)} breakdown</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
            <Stat label="Revenue" value={money(dashboard.months[selected].revenue)} />
            <Stat label="True Profit" value={money(dashboard.months[selected].trueProfit)} color={dashboard.months[selected].trueProfit >= 0 ? "#1E9E6A" : "#E8467C"} />
            <Stat label="Jobs" value={dashboard.months[selected].count} />
          </div>

          {Object.keys(dashboard.months[selected].byCategory).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.65, marginBottom: 6 }}>By category</div>
              {Object.entries(dashboard.months[selected].byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, borderBottom: "1px solid #EEE9F6" }}>
                    <span>{cat}</span><span className="fi-num" style={{ fontWeight: 700 }}>{money(amt)}</span>
                  </div>
                ))}
            </div>
          )}

          <button onClick={() => setShowObs(true)} style={{ ...bigBtn, marginTop: 16, width: "100%", background: obs?.profitable ? "#1E9E6A" : "#E8467C" }}>
            {obs?.profitable ? "✅ Was I profitable? Yes — see why" : "❓ Was I profitable? Tap for the Coach's take"}
          </button>
        </section>
      )}

      {showObs && obs && (
        <Modal onClose={() => setShowObs(false)}>
          <div className="fi-display" style={{ fontSize: 22, fontWeight: 800, color: obs.profitable ? "#1E9E6A" : "#E8467C" }}>
            {monthLabel(selected)}: {obs.profitable ? "Yes, you were profitable." : "No, this month wasn't profitable."}
          </div>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, marginTop: 12 }}>
            <strong>🧢 {coachTitle}'s Observations:</strong>
            {obs.lines.length === 0 ? (
              <p style={{ marginTop: 8 }}>Solid month — fees were charged, margins held, and the business came out ahead. Keep doing exactly this.</p>
            ) : (
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {obs.lines.map((l, i) => <li key={i} style={{ marginBottom: 6 }}>{l}</li>)}
              </ul>
            )}
            {!obs.profitable && <p style={{ marginTop: 8 }}>Fix any ONE of these factors and next month likely swings the other way.</p>}
          </div>
          <button style={{ ...bigBtn, marginTop: 14 }} onClick={() => setShowObs(false)}>Got it</button>
          <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 12, lineHeight: 1.5, borderTop: "1px solid #EEE9F6", paddingTop: 10 }}>
            Fully Inflated is an educational and organizational tool. These observations are informational only and not financial, legal, or tax advice. All final pricing and business decisions are the sole responsibility of the user. Fully Inflated and The Restless Inkwell LLC assume no responsibility for lost or perceived lost wages, contract disputes, or incorrect tax calculations. Consult a licensed professional for guidance specific to your business.
          </div>
        </Modal>
      )}
    </div>
  );
}

function ScoreTile({ label, value, good }) {
  return (
    <div style={{ padding: "9px 11px", borderRadius: 11, background: "#3A3153" }}>
      <div style={{ fontSize: 11.5, opacity: 0.75 }}>{label}</div>
      <div className="fi-num fi-display" style={{ fontSize: 18, fontWeight: 800, color: good ? "#7FE0B4" : "#F5B96E" }}>{value}</div>
    </div>
  );
}

function Row({ a, b, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: accent || "inherit", gap: 12 }}>
      <span>{a}</span><span className="fi-num" style={{ whiteSpace: "nowrap" }}>{b}</span>
    </div>
  );
}

function Stat({ label, value, color = "#2B2140", onInfo }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: "#F6F4FA" }}>
      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.65, display: "flex", alignItems: "center", gap: 4 }}>
        {label} {onInfo && <InfoBtn onClick={onInfo} />}
      </div>
      <div className="fi-num fi-display" style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function InfoBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Explain this to me"
      style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #5B8DEF", color: "#5B8DEF", background: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}>?</button>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,33,64,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div className="fi-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ background: "#fff", color: "#2B2140", borderRadius: 20, padding: 24, maxWidth: 540, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
