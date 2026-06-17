// api/jobs.js — Vercel Serverless Function
// Fetches EU Java jobs from arbeitnow.com (free, no auth needed)
// Called from the frontend via /api/jobs

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    // arbeitnow has a free public API — no key needed
    const url = "https://www.arbeitnow.com/api/job-board-api?tag=java&visa_sponsorship=true&remote=false";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`arbeitnow API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter and shape the results
    const jobs = (data.data || [])
      .filter(job => {
        const title = (job.title || "").toLowerCase();
        const desc  = (job.description || "").toLowerCase();
        // Must mention java or spring boot
        return title.includes("java") || title.includes("spring") ||
               desc.includes("spring boot") || desc.includes("java backend");
      })
      .slice(0, 20)
      .map(job => ({
        id:          job.slug || job.title,
        title:       job.title,
        company:     job.company_name,
        location:    job.location,
        remote:      job.remote,
        visa:        job.visa_sponsorship,
        tags:        (job.tags || []).slice(0, 5),
        url:         job.url,
        posted:      job.created_at,
        description: (job.description || "").replace(/<[^>]*>/g, "").slice(0, 200) + "…",
      }));

    // Fallback: also hit relocate.me public feed
    let relocateJobs = [];
    try {
      const r2 = await fetch("https://relocate.me/api/jobs?query=java+backend&visa=true&limit=10");
      if (r2.ok) {
        const d2 = await r2.json();
        relocateJobs = (d2.results || d2.jobs || []).slice(0, 10).map(j => ({
          id:          j.id || j.title,
          title:       j.title || j.position,
          company:     j.company?.name || j.company,
          location:    j.location || j.city,
          remote:      false,
          visa:        true,
          tags:        [],
          url:         j.url || j.apply_url,
          posted:      j.published_at || j.date,
          description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 200) + "…",
          source:      "relocate.me",
        }));
      }
    } catch (_) {
      // relocate.me is optional — arbeitnow is the primary source
    }

    const combined = [...jobs, ...relocateJobs].slice(0, 25);

    res.status(200).json({
      jobs: combined,
      fetched_at: new Date().toISOString(),
      count: combined.length,
    });
  } catch (err) {
    // Return mock data if API fails, so UI never breaks
    res.status(200).json({
      jobs: FALLBACK_JOBS,
      fetched_at: new Date().toISOString(),
      count: FALLBACK_JOBS.length,
      fallback: true,
    });
  }
}

const FALLBACK_JOBS = [
  { id: "1", title: "Senior Java Backend Engineer", company: "Booking.com", location: "Amsterdam, Netherlands", visa: true, remote: false, tags: ["Java", "Spring Boot", "Kafka", "K8s"], url: "https://careers.booking.com", posted: null, description: "Build scalable backend systems serving millions of travellers daily." },
  { id: "2", title: "Java Backend Engineer", company: "Wise", location: "Tallinn, Estonia", visa: true, remote: false, tags: ["Java", "Spring", "Microservices", "AWS"], url: "https://wise.jobs", posted: null, description: "Work on distributed financial systems processing billions in transfers." },
  { id: "3", title: "Backend Software Engineer (Java)", company: "Klarna", location: "Stockholm, Sweden", visa: true, remote: false, tags: ["Java", "Spring Boot", "Fintech"], url: "https://klarna.com/careers", posted: null, description: "Build the future of payments with a global team of engineers." },
  { id: "4", title: "Java Engineer — Supply Chain", company: "Picnic", location: "Amsterdam, Netherlands", visa: true, remote: false, tags: ["Java", "Spring", "Microservices"], url: "https://picnic.tech", posted: null, description: "Reinvent grocery delivery with smart backend systems." },
  { id: "5", title: "Senior Backend Developer", company: "HelloFresh", location: "Berlin, Germany", visa: true, remote: false, tags: ["Java", "Spring Boot", "Kafka", "AWS"], url: "https://hellofresh.com/careers", posted: null, description: "Scale meal kit delivery across 17 countries." },
];

