// api/jobs.js — Vercel Serverless Function
// Always returns jobs — live from arbeitnow if possible, fallback if not

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  let liveJobs = [];

  // Try arbeitnow — their public API, no auth required
  try {
    const r = await fetch(
      "https://www.arbeitnow.com/api/job-board-api",
      { headers: { "Accept": "application/json", "User-Agent": "eu-tracker/1.0" } }
    );
    if (r.ok) {
      const d = await r.json();
      liveJobs = (d.data || [])
        .filter(j => {
          const t = (j.title || "").toLowerCase();
          const desc = (j.description || "").toLowerCase();
          return (
            t.includes("java") || t.includes("spring") ||
            desc.includes("java") || desc.includes("spring boot")
          );
        })
        .slice(0, 20)
        .map(j => ({
          id:      j.slug || String(Math.random()),
          title:   j.title || "Java Engineer",
          company: j.company_name || "EU Company",
          location:j.location || "Europe",
          remote:  !!j.remote,
          visa:    j.visa_sponsorship !== false,
          tags:    (j.tags || []).slice(0, 5),
          url:     j.url || "#",
          posted:  j.created_at || null,
          description: (j.description || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 220) + "…",
        }));
    }
  } catch (e) {
    // arbeitnow failed — use fallback below
  }

  const jobs = liveJobs.length > 0 ? liveJobs : FALLBACK_JOBS;

  res.status(200).json({
    jobs,
    fetched_at: new Date().toISOString(),
    count: jobs.length,
    source: liveJobs.length > 0 ? "arbeitnow" : "fallback",
  });
}

const FALLBACK_JOBS = [
  {
    id: "f1", title: "Senior Java Backend Engineer", company: "Booking.com",
    location: "Amsterdam, Netherlands", visa: true, remote: false,
    tags: ["Java", "Spring Boot", "Kafka", "Kubernetes"],
    url: "https://careers.booking.com", posted: null,
    description: "Build and scale backend systems serving millions of travellers daily. Java 17+, Spring Boot 3, microservices architecture.",
  },
  {
    id: "f2", title: "Java Backend Engineer", company: "Wise",
    location: "Tallinn, Estonia", visa: true, remote: false,
    tags: ["Java", "Spring", "Microservices", "AWS"],
    url: "https://wise.jobs", posted: null,
    description: "Work on distributed financial systems processing billions in international transfers. Strong Java + distributed systems required.",
  },
  {
    id: "f3", title: "Backend Software Engineer (Java)", company: "Klarna",
    location: "Stockholm, Sweden", visa: true, remote: false,
    tags: ["Java", "Spring Boot", "Fintech", "Kafka"],
    url: "https://klarna.com/careers", posted: null,
    description: "Build the future of payments at global scale. Work with a world-class engineering team on high-throughput Java services.",
  },
  {
    id: "f4", title: "Java Engineer — Supply Chain", company: "Picnic",
    location: "Amsterdam, Netherlands", visa: true, remote: false,
    tags: ["Java", "Spring", "Microservices", "PostgreSQL"],
    url: "https://picnic.tech", posted: null,
    description: "Reinvent grocery delivery with smart backend systems. Java-first company with 20+ engineering teams.",
  },
  {
    id: "f5", title: "Senior Backend Developer", company: "HelloFresh",
    location: "Berlin, Germany", visa: true, remote: false,
    tags: ["Java", "Spring Boot", "Kafka", "AWS"],
    url: "https://hellofresh.com/careers", posted: null,
    description: "Scale meal kit delivery across 17 countries. Java microservices on AWS, strong engineering culture.",
  },
  {
    id: "f6", title: "Backend Engineer — Java & Kotlin", company: "Personio",
    location: "Munich, Germany", visa: true, remote: false,
    tags: ["Java", "Kotlin", "Spring", "Kubernetes"],
    url: "https://personio.com/careers", posted: null,
    description: "Build HR software used by thousands of European companies. Java + Kotlin backend, K8s on GCP.",
  },
  {
    id: "f7", title: "Java Backend Engineer", company: "Catawiki",
    location: "Amsterdam, Netherlands", visa: true, remote: false,
    tags: ["Java", "AWS", "Kafka", "Spring Boot"],
    url: "https://catawiki.com/careers", posted: null,
    description: "Power Europe's leading online auction platform. Java backend serving millions of buyers and sellers globally.",
  },
  {
    id: "f8", title: "Senior Software Engineer (Java)", company: "Glovo",
    location: "Barcelona, Spain", visa: true, remote: false,
    tags: ["Java", "Microservices", "Kafka", "Spring"],
    url: "https://glovoapp.com/careers", posted: null,
    description: "Build delivery infrastructure for millions of users across 25+ countries. High-scale Java microservices.",
  },
  {
    id: "f9", title: "Java Platform Engineer", company: "Adyen",
    location: "Amsterdam, Netherlands", visa: true, remote: false,
    tags: ["Java", "Payments", "Distributed Systems", "Spring"],
    url: "https://careers.adyen.com", posted: null,
    description: "Work on payment processing infrastructure handling billions in volume. Strong Java, no framework religion.",
  },
  {
    id: "f10", title: "Backend Java Developer", company: "Mollie",
    location: "Amsterdam, Netherlands", visa: true, remote: false,
    tags: ["Java", "Spring Boot", "Fintech", "AWS"],
    url: "https://jobs.mollie.com", posted: null,
    description: "Build the payment platform for 250,000+ European businesses. Java backend, strong engineering culture.",
  },
];
