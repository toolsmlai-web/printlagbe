import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Layers3,
  LogOut,
  PackageCheck,
  Printer,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price_bdt: number;
  is_demo: boolean;
};

type Zone = {
  id: string;
  name: string;
};

type Order = {
  id: string;
  product_name: string;
  quantity: number;
  print_price_bdt: number;
  status: string;
  created_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }
  return "Something went wrong. Please try again.";
}

function PrintScene() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-orbit" />
      <motion.div
        className="print-stack"
        animate={
          reducedMotion
            ? undefined
            : {
                y: [0, -14, 0],
                rotateY: [-12, -5, -12],
                rotateX: [8, 12, 8],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="sheet sheet-back" />
        <div className="sheet sheet-middle" />
        <div className="sheet sheet-front">
          <div className="mock-brand">YOUR NEXT BIG IDEA.</div>
          <div className="mock-circle">
            <Printer size={58} strokeWidth={1.4} />
          </div>
          <div className="mock-title">
            Made real.
            <br />
            Delivered.
          </div>
          <div className="mock-lines">
            <span />
            <span />
          </div>
          <div className="mock-footer">
            PRINTLAGBE <ArrowRight size={20} />
          </div>
        </div>
      </motion.div>

      <div className="floating-label label-one">
        <Check size={16} /> Your artwork. In print.
      </div>
      <div className="floating-label label-two">
        <PackageCheck size={18} /> Doorstep delivery
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productId, setProductId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const selected = products.find((product) => product.id === productId);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let active = true;

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setNotice(error.message);
      setSession(data.session);
    });

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );

    async function loadCatalog() {
      try {
        const [productResult, zoneResult] = await Promise.all([
          client
            .from("products")
            .select("id,name,description,quantity,price_bdt,is_demo")
            .eq("active", true)
            .order("sort_order"),
          client
            .from("service_zones")
            .select("id,name")
            .eq("active", true)
            .order("name"),
        ]);

        if (productResult.error) throw productResult.error;
        if (zoneResult.error) throw zoneResult.error;
        if (!active) return;

        const productRows = (productResult.data ?? []) as Product[];
        const zoneRows = (zoneResult.data ?? []) as Zone[];

        setProducts(productRows);
        setZones(zoneRows);
        setProductId(productRows[0]?.id ?? "");
        setZoneId(zoneRows[0]?.id ?? "");
      } catch (error) {
        if (active) setNotice(errorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setOrders([]);
      return;
    }

    let active = true;

    supabase
      .from("orders")
      .select(
        "id,product_name,quantity,print_price_bdt,status,created_at",
      )
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNotice(error.message);
        else setOrders((data ?? []) as Order[]);
      });

    return () => {
      active = false;
    };
  }, [session]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;

    setBusy(true);
    setNotice("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      setNotice("Check your email for your secure sign-in link.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !selected || busy) return;

    setBusy(true);
    setNotice("");

    try {
      let artworkPath: string | null = null;

      if (file) {
        const extensions: Record<string, string> = {
          "application/pdf": "pdf",
          "image/png": "png",
          "image/jpeg": "jpg",
        };

        const extension = extensions[file.type];

        if (!extension || file.size > 10 * 1024 * 1024) {
          throw new Error("Upload a PDF, PNG, or JPEG under 10 MB.");
        }

        artworkPath =
          `${session.user.id}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
          .from("artwork")
          .upload(artworkPath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) throw error;
      }

      const { data, error } = await supabase.rpc("create_quote_request", {
        p_product_id: selected.id,
        p_zone_id: zoneId,
        p_customer_name: name,
        p_phone: phone,
        p_address: address,
        p_artwork_path: artworkPath,
      });

      if (error) throw error;

      const order = data as Order;
      setOrders((previous) => [order, ...previous]);

      setNotice(
        `Request ${order.id.slice(0, 8)} received. ` +
          "This is not a paid order. Final specifications, delivery fees, " +
          "artwork approval, and timing require confirmation.",
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#" aria-label="PrintLagbe home">
          <span className="brand-icon"><Printer size={21} /></span>
          Print<span>Lagbe</span><span className="brand-dot">.</span>
        </a>

        <nav aria-label="Main navigation">
          <a href="#products">Products</a>
          <a href="#how-it-works">How it works</a>
          <a className="nav-cta" href="#order">Start printing</a>
        </nav>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="status-dot" />
              Built for businesses in Dhaka
            </span>

            <h1>
              Your ideas.
              <br />
              <span>Beautifully</span>
              <br />
              delivered.
            </h1>

            <p className="lead">
              Business cards, flyers, and banners—without running
              between print shops. Send your design. We handle the next steps.
            </p>

            <div className="hero-actions">
              <a className="button primary" href="#products">
                Explore printing <ArrowRight size={18} />
              </a>
              <a className="button secondary" href="#how-it-works">
                How it works
              </a>
            </div>

            <p className="delivery-note">
              24-hour delivery is a planned option for eligible orders.
              Availability and deadlines must be confirmed before payment.
            </p>
          </div>

          <PrintScene />
        </section>

        <section className="trust-strip" aria-label="Service features">
          <span><ShieldCheck /> Artwork review before production</span>
          <span><Layers3 /> Print options for growing businesses</span>
          <span><PackageCheck /> Selected Dhaka delivery areas</span>
        </section>

        <section id="products" className="section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SMALL DETAILS. BIG IMPRESSIONS.</span>
              <h2>What are we printing?</h2>
            </div>
            <p>Start with the essentials. Make them yours.</p>
          </div>

          {loading && <p role="status">Loading the print catalog…</p>}

          {!supabase && (
            <div className="notice">
              Connect your Supabase environment variables to load the catalog
              and enable authentication.
            </div>
          )}

          <div className="product-grid">
            {products.map((product, index) => (
              <motion.article
                className="product-card"
                key={product.id}
                whileHover={{ y: -7 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`product-art art-${index % 3}`}>
                  <div className="mini-print">
                    <Printer size={28} />
                    <strong>{product.name}</strong>
                    <span>Make your mark.</span>
                  </div>
                </div>

                <div className="product-body">
                  <div className="product-title">
                    <h3>{product.name}</h3>
                    {product.is_demo && <span className="badge">Demo price</span>}
                  </div>
                  <p>{product.description}</p>
                  <div className="product-bottom">
                    <div>
                      <strong>{money(product.price_bdt)}</strong>
                      <small> / {product.quantity} unit(s)</small>
                    </div>
                    <a
                      className="icon-link"
                      href="#order"
                      aria-label={`Request ${product.name}`}
                      onClick={() => setProductId(product.id)}
                    >
                      <ArrowRight size={20} />
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="process-section">
          <div className="container">
            <span className="eyebrow">LESS RUNNING AROUND.</span>
            <h2>From your screen to your doorstep.</h2>

            <div className="steps">
              {[
                ["01", "Choose your print", "Pick the product your business needs."],
                ["02", "Send your artwork", "Upload a design or request assistance."],
                ["03", "Review and confirm", "Confirm the proof, final price, and timing."],
                ["04", "We arrange the rest", "Printing, quality checks, and delivery."],
              ].map(([number, title, description]) => (
                <div className="step" key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="order" className="section container order-layout">
          <div>
            <span className="eyebrow">LET'S MAKE SOMETHING REAL.</span>
            <h2>Your next print starts here.</h2>
            <p className="lead">
              Request a quote. We will confirm your artwork, complete price,
              and delivery eligibility before production.
            </p>
            <div className="service-card">
              <ShieldCheck size={26} />
              <div>
                <strong>No payment collected in this starter.</strong>
                <p>
                  Demo prices are illustrative. Upload only artwork you
                  have permission to use; avoid sensitive documents during testing.
                </p>
              </div>
            </div>
          </div>

          <div className="order-panel">
            {notice && <div className="notice" role="status">{notice}</div>}

            {!session ? (
              <form onSubmit={signIn}>
                <h3>Sign in to request a quote</h3>
                <p>We will email you a secure sign-in link.</p>

                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                />

                <button
                  className="button primary full"
                  disabled={busy || !supabase}
                >
                  {busy ? "Sending…" : "Email me a sign-in link"}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={submitOrder}>
                <div className="account-row">
                  <span>{session.user.email}</span>
                  <button
                    className="text-button"
                    type="button"
                    onClick={signOut}
                    aria-label="Sign out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>

                <h3>Request your print</h3>

                <label htmlFor="product">Print package</label>
                <select
                  id="product"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  required
                >
                  <option value="" disabled>Select a package</option>
                  {products.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.name} · {product.quantity} unit(s)
                    </option>
                  ))}
                </select>

                <div className="field-grid">
                  <div>
                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone">Bangladesh mobile</label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX"
                      pattern="(\+?88)?01[3-9][0-9]{8}"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                </div>

                <label htmlFor="zone">Delivery area</label>
                <select
                  id="zone"
                  required
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                >
                  <option value="" disabled>Select an area</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>

                <label htmlFor="address">Full delivery address</label>
                <textarea
                  id="address"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  autoComplete="street-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />

                <label className="upload-label" htmlFor="artwork">
                  <UploadCloud size={22} />
                  <span>Artwork · optional · PDF, PNG, JPEG · up to 10 MB</span>
                </label>
                <input
                  id="artwork"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                />

                {selected && (
                  <div className="quote-summary">
                    <span>
                      {selected.is_demo ? "Demo print estimate" : "Print estimate"}
                    </span>
                    <strong>{money(selected.price_bdt)}</strong>
                    <small>
                      Delivery, design work, and applicable taxes are not
                      included. Final quote requires confirmation.
                    </small>
                  </div>
                )}

                <button
                  className="button primary full"
                  disabled={busy || !selected || !zoneId}
                >
                  {busy ? "Submitting…" : "Request a confirmed quote"}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </section>

        {session && (
          <section className="container section">
            <h2>Your requests</h2>
            {orders.length === 0 && <p>No requests yet.</p>}
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-item" key={order.id}>
                  <div>
                    <strong>{order.product_name}</strong>
                    <p>
                      {order.id.slice(0, 8)} · {order.quantity} unit(s) ·{" "}
                      {new Date(order.created_at).toLocaleDateString(
                        "en-BD",
                        { timeZone: "Asia/Dhaka" },
                      )}
                    </p>
                  </div>
                  <span className="badge">
                    {order.status.replaceAll("_", " ")}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer container">
        <a className="brand" href="#">PrintLagbe.</a>
        <p>Design. Print. Delivered.</p>
        <small>Pilot application · quote requests only</small>
      </footer>
    </>
  );
}
