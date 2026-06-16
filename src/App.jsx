import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ── Firestore document ID — single doc stores all state ──────────────────────
const DOC_ID = "tracker-state";
const COLLECTION = "eu-switch";

// ── Data ─────────────────────────────────────────────────────────────────────
const PHASES = [
  { id: "p1", label: "Phase 1", subtitle: "System Design + Java", weeks: "Weeks 1–4", color: "#3B82F6", light: "#EFF6FF", tag: "#DBEAFE" },
  { id: "p2", label: "Phase 2", subtitle: "Cloud + AI Integration", weeks: "Weeks 5–8", color: "#10B981", light: "#ECFDF5", tag: "#D1FAE5" },
  { id: "p3", label: "Phase 3", subtitle: "DSA + Mock Interviews", weeks: "Weeks 9–12", color: "#F59E0B", light: "#FFFBEB", tag: "#FEF3C7" },
  { id: "p4", label: "Phase 4", subtitle: "Apply + Interview", weeks: "Weeks 13–16", color: "#8B5CF6", light: "#F5F3FF", tag: "#EDE9FE" },
];

const TOPICS = [
  {
    id: "t1", phase: "p1", label: "System Design & Distributed Systems", color: "#3B82F6",
    subtopics: [
      { id: "t1-1", group: "Fundamentals", items: ["What is a distributed system", "Latency vs throughput", "Availability vs consistency", "CAP theorem", "PACELC theorem", "SLA / SLO / SLI", "Fault tolerance", "Single point of failure (SPOF)"] },
      { id: "t1-2", group: "Scalability", items: ["Horizontal vs vertical scaling", "Stateless vs stateful services", "Load balancing algorithms", "Layer 4 vs Layer 7 LB", "Auto-scaling", "Database read replicas", "Database sharding", "Consistent hashing"] },
      { id: "t1-3", group: "Caching", items: ["Cache hit ratio", "Cache-aside (Lazy loading)", "Write-through cache", "Write-behind cache", "Read-through cache", "LRU / LFU / FIFO eviction", "Cache stampede prevention", "TTL strategy", "Redis vs Memcached", "Distributed cache", "Cache invalidation"] },
      { id: "t1-4", group: "Databases", items: ["ACID properties", "Isolation levels", "BASE properties", "SQL vs NoSQL decision", "Indexing internals", "Composite indexes", "Query explain plan", "N+1 query problem", "Connection pooling (HikariCP)", "Optimistic vs pessimistic locking", "Normalisation / denormalisation", "NoSQL types", "Cassandra model", "MongoDB aggregation"] },
      { id: "t1-5", group: "Messaging", items: ["Why message queues exist", "Kafka architecture", "Kafka offset management", "Kafka replication factor", "Kafka vs RabbitMQ", "Dead letter queue (DLQ)", "Event sourcing", "CQRS pattern", "Outbox pattern", "Idempotency"] },
      { id: "t1-6", group: "API Design", items: ["REST principles", "HTTP methods & status codes", "API versioning strategies", "Cursor vs offset pagination", "Rate limiting algorithms", "API Gateway patterns", "GraphQL vs REST", "gRPC & protobuf", "Idempotency keys", "OpenAPI / Swagger"] },
      { id: "t1-7", group: "Resilience", items: ["Circuit breaker states", "Resilience4j @CircuitBreaker", "Retry with exponential backoff", "Bulkhead pattern", "Timeout on every call", "Fallback strategies", "Health checks (liveness vs readiness)", "Graceful degradation"] },
      { id: "t1-8", group: "Design Cases", items: ["URL shortener", "Ride-sharing backend", "WhatsApp messaging system", "Payment processing", "Notification service", "Search autocomplete", "Distributed rate limiter"] },
    ]
  },
  {
    id: "t2", phase: "p1", label: "Core Java Deep Dive", color: "#F59E0B",
    subtopics: [
      { id: "t2-1", group: "JVM Internals", items: ["JVM architecture overview", "Heap structure (Eden, S0, S1, Old, Metaspace)", "Minor GC vs Major GC vs Full GC", "GC algorithms: Serial, Parallel, G1, ZGC", "GC tuning flags", "Memory leaks (causes)", "Reading GC logs", "JIT compiler basics", "Escape analysis"] },
      { id: "t2-2", group: "Concurrency", items: ["Thread lifecycle (6 states)", "synchronized keyword", "volatile — visibility only", "Happens-before relationship", "AtomicInteger / CAS internals", "ReentrantLock vs synchronized", "ReadWriteLock", "Deadlock conditions + prevention", "Thread starvation vs livelock", "ThreadLocal (use & leak risk)", "ExecutorService pool types", "CompletableFuture chain", "ForkJoinPool / work stealing", "Virtual threads (Java 21)", "Structured concurrency (Java 21)"] },
      { id: "t2-3", group: "Collections", items: ["HashMap internals", "HashMap resize", "ConcurrentHashMap", "LinkedHashMap (LRU)", "TreeMap", "ArrayDeque vs LinkedList", "PriorityQueue (min-heap)", "CopyOnWriteArrayList", "BlockingQueue types"] },
      { id: "t2-4", group: "Java 17–21", items: ["Records", "Sealed classes", "Pattern matching for instanceof", "Text blocks", "Switch expressions", "Unnamed patterns / variables", "Sequenced collections", "Virtual threads (Project Loom)", "String templates (preview)"] },
    ]
  },
  {
    id: "t3", phase: "p1", label: "Spring Boot 3 Deep Dive", color: "#14B8A6",
    subtopics: [
      { id: "t3-1", group: "Core IoC", items: ["Spring IoC container", "BeanFactory vs ApplicationContext", "Constructor vs field injection", "@Component / @Service / @Repository", "Bean scopes", "Bean lifecycle hooks", "@Configuration vs @Component", "Conditional beans", "Auto-configuration mechanism"] },
      { id: "t3-2", group: "Security", items: ["Authentication vs authorisation", "SecurityFilterChain", "JWT structure & stateless auth flow", "OAuth2 authorization code flow", "OAuth2 client credentials flow", "CSRF — when to disable", "@PreAuthorize / @PostAuthorize", "BCrypt password hashing", "CORS configuration"] },
      { id: "t3-3", group: "Data & Transactions", items: ["JPA vs Hibernate vs Spring Data JPA", "Entity annotations", "Relationship mappings", "FetchType.LAZY vs EAGER", "N+1 in JPA — fix with @EntityGraph", "@Transactional propagation levels", "@Transactional isolation levels", "Optimistic locking @Version", "Spring Data repositories", "DTO projections", "Pageable pagination"] },
      { id: "t3-4", group: "Cloud & Microservices", items: ["Eureka server/client setup", "Spring Cloud Gateway routing", "Spring Cloud Config Server", "Feign client", "Resilience4j integration", "Distributed tracing (Micrometer)", "Spring Boot Actuator endpoints", "Prometheus + Grafana", "Kafka with Spring (@KafkaListener)"] },
      { id: "t3-5", group: "Testing", items: ["@SpringBootTest vs @WebMvcTest vs @DataJpaTest", "MockMvc controller testing", "@MockBean vs @Mock", "Testcontainers", "WireMock", "Spring Cloud Contract", "JaCoCo coverage"] },
    ]
  },
  {
    id: "t4", phase: "p2", label: "Docker & Kubernetes", color: "#10B981",
    subtopics: [
      { id: "t4-1", group: "Docker", items: ["Container vs VM", "Docker architecture", "Dockerfile instructions", "Multi-stage builds for Java", "docker-compose multi-service", "Image layer caching", "Docker networking", "Docker volumes", "Distroless images", ".dockerignore"] },
      { id: "t4-2", group: "Kubernetes", items: ["Control plane components", "Worker node components", "Pod concept", "Deployment + rolling updates", "ReplicaSet", "Service types (ClusterIP/NodePort/LoadBalancer)", "Ingress", "ConfigMap", "Secret", "PV and PVC", "Namespace", "Resource limits and requests", "Liveness vs readiness probe", "HPA (autoscaling)", "StatefulSet", "DaemonSet", "Helm charts", "kubectl essential commands"] },
    ]
  },
  {
    id: "t5", phase: "p2", label: "AI Integration in Java", color: "#8B5CF6",
    subtopics: [
      { id: "t5-1", group: "LLM Fundamentals", items: ["Tokens & context window", "Temperature / max_tokens", "System / user / assistant roles", "Zero-shot vs few-shot prompting", "Chain-of-thought prompting", "Hallucination mitigation", "Streaming responses", "Token cost calculation"] },
      { id: "t5-2", group: "Spring AI", items: ["Spring AI dependency setup", "ChatClient usage", "Prompt templates", "BeanOutputParser / MapOutputParser", "EmbeddingClient", "VectorStore types", "RAG pipeline in Spring AI", "Advisors", "Function / Tool calling"] },
      { id: "t5-3", group: "RAG Pattern", items: ["Why RAG exists", "Chunking strategies", "Embedding models & cosine similarity", "Vector similarity search (ANN)", "Re-ranking", "Hybrid search", "Context window management"] },
      { id: "t5-4", group: "Production AI", items: ["AI observability", "Response caching strategy", "Prompt injection defence", "Circuit breaker for AI API", "Async AI calls (@Async)", "Per-user rate limiting", "A/B testing prompts"] },
    ]
  },
  {
    id: "t6", phase: "p3", label: "DSA — Interview Patterns", color: "#EF4444",
    subtopics: [
      { id: "t6-1", group: "Arrays & Strings", items: ["Two pointer — opposite ends", "Two pointer — fast/slow", "Sliding window fixed size", "Sliding window variable size", "Prefix sum", "Kadane's algorithm", "String manipulation patterns"] },
      { id: "t6-2", group: "Hashing", items: ["Two Sum complement lookup", "Group anagrams", "Valid anagram", "Longest consecutive sequence", "Top K frequent elements"] },
      { id: "t6-3", group: "Linked Lists", items: ["Reverse linked list (iterative)", "Reverse linked list (recursive)", "Cycle detection (Floyd's)", "Find cycle start", "Merge two sorted lists", "Find middle node", "Remove Nth from end"] },
      { id: "t6-4", group: "Stacks & Queues", items: ["Valid parentheses", "Min stack", "Daily temperatures (monotonic stack)", "Next greater element", "Evaluate RPN", "Largest rectangle in histogram"] },
      { id: "t6-5", group: "Trees", items: ["Inorder traversal (iterative + recursive)", "Preorder traversal", "Postorder traversal", "Level-order BFS", "Max depth", "Diameter", "Validate BST", "LCA", "Serialize/deserialize", "Construct from traversals", "Kth smallest in BST", "Balanced binary tree"] },
      { id: "t6-6", group: "Graphs", items: ["BFS shortest path", "DFS cycle detection", "Number of islands", "Clone graph", "Rotting oranges (multi-source BFS)", "Topological sort", "Union-Find", "Dijkstra's algorithm"] },
      { id: "t6-7", group: "Dynamic Programming", items: ["Top-down memoisation vs bottom-up", "Climbing stairs", "House robber", "Coin change", "LIS", "Word break", "Unique paths", "LCS", "Edit distance", "Knapsack / subset sum"] },
      { id: "t6-8", group: "Sorting & Searching", items: ["Binary search standard", "Binary search on rotated array", "Binary search on answer", "Merge sort", "Quick sort", "Top K with heap"] },
    ]
  },
];

const WEEKS = [
  { id: "w1",  phase: "p1", label: "Distributed Systems Fundamentals + JVM" },
  { id: "w2",  phase: "p1", label: "Caching Systems + Java Concurrency" },
  { id: "w3",  phase: "p1", label: "Messaging Systems + Spring Boot Core" },
  { id: "w4",  phase: "p1", label: "API Design + Resilience + Month 1 Review" },
  { id: "w5",  phase: "p2", label: "Docker + Kubernetes Core" },
  { id: "w6",  phase: "p2", label: "AWS Core + CI/CD Pipeline" },
  { id: "w7",  phase: "p2", label: "Spring AI + AI Integration" },
  { id: "w8",  phase: "p2", label: "Month 2 Review + System Design Practice" },
  { id: "w9",  phase: "p3", label: "DSA — Arrays, Strings, Hashing" },
  { id: "w10", phase: "p3", label: "DSA — Trees, Graphs, DP" },
  { id: "w11", phase: "p3", label: "Mock Interviews + Behavioural Prep" },
  { id: "w12", phase: "p3", label: "Month 3 Review + Application Prep" },
  { id: "w13", phase: "p4", label: "Apply + First Interviews" },
  { id: "w14", phase: "p4", label: "Active Interviews — Keep Grinding" },
  { id: "w15", phase: "p4", label: "Final Rounds + Offer Stage" },
  { id: "w16", phase: "p4", label: "Wrap Up + Offer + Begin" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAILY_TECH = {
  w1:  ["Distributed Systems intro, real examples, why systems fail","CAP Theorem deep dive + PACELC","SLA/SLO/SLI + Fault Tolerance","Load Balancing + Horizontal Scaling","DB Scaling: Replication & Sharding","REVIEW Week 1 + Draw Diagrams","💚 BREAK"],
  w2:  ["Caching Fundamentals + Redis","Cache Eviction + Advanced Patterns","Java Concurrency Pt1 — Threads & Locks","Java Concurrency Pt2 — Executors & Futures","Collections Internals","REVIEW Week 2 + Mini Design","💚 BREAK"],
  w3:  ["Kafka Architecture","Event-Driven Patterns (CQRS, Outbox)","Spring Boot Core — IoC & Beans","Spring Boot — Auto-Config & Actuator","Spring Security — JWT & OAuth2","REVIEW Week 3 + System Design","💚 BREAK"],
  w4:  ["REST API Design Deep Dive","Rate Limiting + API Gateway","Resilience Patterns","Spring Transactions + JPA Deep Dive","Virtual Threads + Java 21 Features","FULL MONTH 1 REVIEW","💚 BREAK"],
  w5:  ["Docker Fundamentals","Docker Networking & Compose","Kubernetes Architecture","K8s Services + Ingress + Config","K8s Probes + HPA + Helm","REVIEW Week 5 + Hands-on","💚 BREAK"],
  w6:  ["AWS Core Services (IAM, EC2, S3, RDS)","AWS Networking + ECS","GitHub Actions CI/CD","Observability: Logs, Metrics, Tracing","Spring Cloud Deep Dive","REVIEW Week 6 + Architecture Design","💚 BREAK"],
  w7:  ["LLM API Fundamentals","Spring AI Framework","RAG — Retrieval Augmented Generation","Function Calling + AI Observability","Portfolio Project — Build Session","REVIEW Week 7 + Project Polish","💚 BREAK"],
  w8:  ["System Design: WhatsApp","System Design: Payment System","System Design: Notification Service","Consistency vs Availability deep dive","Full System Design Practice","FULL MONTH 2 REVIEW","💚 BREAK"],
  w9:  ["Arrays: Two Pointer + Sliding Window","Hashing Patterns","Linked Lists","Stacks + Monotonic Stack","Binary Search","REVIEW Week 9 + Problem Contest","💚 BREAK"],
  w10: ["Binary Trees Pt1","Binary Trees Pt2 + BST","Graphs Pt1 — BFS + DFS","Graphs Pt2 — Advanced Patterns","Dynamic Programming — 1D","REVIEW Week 10 + Mixed Problems","💚 BREAK"],
  w11: ["Heap + Interval Problems","2D DP + String DP","Behavioural Prep Pt1 (Stories 1–4)","Behavioural Prep Pt2 (Stories 5–8)","Mock Technical Interview — Full Sim","REVIEW + CV Polish","💚 BREAK"],
  w12: ["Full System Design Revision","Java + Spring Boot Revision","AI Integration Revision","DSA Final Revision","Cover Letter + Applications (first 5)","FULL MONTH 3 REVIEW","💚 BREAK"],
  w13: ["Interview Prep: Coding Screen","Interview Prep: System Design Round","Apply + Referrals (15 total)","Questions to Ask Interviewers","Salary Negotiation Prep","REVIEW + Mid-Application Calibration","💚 BREAK"],
  w14: ["2 LeetCode + Interview Debrief log","Research target company tech blogs","System Design + Java — stay fresh","Apply + Follow-up + Referrals","Final-Round Prep: Architecture Interview","REVIEW + Application Status Check","💚 BREAK"],
  w15: ["Final Round Simulation (90 min)","Java 21 + Spring Boot 3 Final Check","Offer Evaluation Framework","Visa + Relocation Action Items","Keep Applying Until Signed","Final Review + Celebration Plan","💚 BREAK"],
  w16: ["Interview remaining pipeline","Compare Offers / Decide","Resignation + Notice Period Plan","Continuous Learning Plan","Keep Applying Until Signed","🎉 Done. Celebrate.","💚 BREAK"],
};

const DAILY_ENGLISH = {
  w1:  ["Elsa Speak setup · Record: explain 'distributed system' in 2 sentences","Read aloud 2 paragraphs · Record 60-sec CAP explanation","Say tech vocab aloud · Elsa Speak 10 min","TED Talk 10 min without subtitles","Record 'Tell me about yourself' (90 sec)","Mock intro: record 2-min interview introduction","10 min Elsa Speak only"],
  w2:  ["Record 60-sec explanation of caching","YouTube 'How Redis works' — no subtitles","Record 'what is a thread' (60 sec)","STAR story: technical challenge (90 sec)","Professional phrases: 'The trade-off here is…'","Mock Q: 'Why do you want to move to Europe?'","10 min Elsa Speak only"],
  w3:  ["EU accent: Dutch/German YouTube (8 min)","New vocab: idempotent, event-driven · Record 60-sec","Record: 'explain dependency injection simply'","Lex Fridman: 10 min listening","Record: 'How does JWT work?' (60 sec)","STAR story: improved process (90 sec)","10 min Elsa Speak only"],
  w4:  ["Record: 'How do you design a REST API?'","EU accent: Estonian/Dutch YouTube (8 min)","Record: 'What is a circuit breaker?' (60 sec)","STAR: transaction/database challenge (90 sec)","2-min fluency: speak non-stop on Month 1 learnings","Full mock Q&A 20 min — record all","Rest. Light podcast in English optional"],
  w5:  ["Elsa Speak + 'containerisation' vocabulary","Record: 'Why use Docker?' (60 sec)","Record: 'What is Kubernetes and why use it?'","TED Talk: without subtitles, measure comprehension","Record: 'What are liveness vs readiness probes?'","Mock: 'Where do you see yourself in 3 years?'","10 min Elsa Speak only"],
  w6:  ["AWS vocab: high availability, elasticity, durability","Record: 'Explain EC2 vs ECS to a non-engineer'","Write LinkedIn post draft on AWS · Read aloud","Lex Fridman: speech pattern observation","STAR: 'Tell me about improving a CI/CD process'","Mock: 'Why this company?' — research + record","Rest. Light English podcast optional"],
  w7:  ["New words: hallucination, embedding, context window","Record: 'Why is AI integration key for backend devs?'","Booking.com/Klarna engineering content 8 min","STAR: 'project where you integrated new tech'","Record: describe your portfolio project (90 sec)","1) Read aloud 2) Record RAG explanation 3) Shadow speaker","Rest"],
  w8:  ["Review all Month 2 vocab — weakest 5 words","Record: 'Why is a payment system hard?'","EU engineering talk — 10 min, no subtitles","Mock behavioural: 'How do you handle ambiguity?'","60-sec pitches: Kafka, Docker, RAG — record all three","Full 20-min English practice session","Rest"],
  w9:  ["Record: 'What is sliding window technique?'","Elsa Speak + record: approach to new coding problem","Lex Fridman: note deliberate pausing","Record: 'What is a stack with a real-world example?'","STAR: 'Tell me about an algorithm you used at work'","Mock: 'What is your experience with DSA?'","10 min Elsa Speak only"],
  w10: ["Record: 'Explain BFS vs DFS on a tree'","EU accent: Estonian/Dutch engineer on YouTube","Record: walk through 'Number of Islands' approach","STAR: 'Technically complex problem you solved'","2-min fluency: explain dynamic programming","Mock: 'How do you balance quality and deadlines?'","Rest"],
  w11: ["Elsa Speak + weakest tech vocabulary drill","Record: 'Explain DP to a junior developer'","Record STAR Stories 1 & 2 — listen, redo once","Record STAR Stories 5 & 8 — listen critically","8 STAR stories back-to-back — English stamina","'Tell me about yourself' — final rehearsed version","Rest"],
  w12: ["Shadow exercise: Kurzgesagt video 3 min","Anki / word list — test every word from 4 months","Record: 'Biggest strength?' + 'Area improving?'","Record: 'How do you balance consistency/availability?'","Write + read aloud professional LinkedIn referral","Full mock interview 20 min — record benchmark","Rest"],
  w13: ["Elsa Speak 10 min + simulate interview energy","Practice clarifying Qs: 'Could you clarify…?'","Write + read aloud professional follow-up email","Record 5 prepared questions for interviewers","Practice salary negotiation phrases aloud","Full 25-min mock interview — record + listen","Rest"],
  w14: ["Write + read aloud post-interview thank-you email","Read company blog para aloud → explain in own words","Listen to Week 1 recording → record same answer → compare","Record professional rejection response","Record 5 Qs for interviewers — final natural version","Listen to old recordings vs today — hear improvement","Rest"],
  w15: ["Shadow Kurzgesagt daily — every day this week","Record: 'I'm confident in my ability…' (say 5x)","Practice: 'I'm delighted to accept the offer…'","Read govt relocation guide aloud → 3-sentence summary","Final LinkedIn outreach messages — natural tone","Record 3-min: 'Tell me about yourself and your journey'","Rest — you've earned it"],
  w16: ["Record: 'I'm confident…' until completely natural","Practice: 'I'm delighted to accept…' — warm, clear","Write + read aloud resignation letter","Write 6-month English goal. Commit to it.","Final LinkedIn outreach messages","Record Day 1 of your next chapter","Rest"],
};

const APPLICATIONS = [
  { id: "app1", company: "Booking.com", country: "🇳🇱 Netherlands", stack: "Java, Kotlin, K8s", site: "careers.booking.com" },
  { id: "app2", company: "Wise", country: "🇪🇪 Estonia / UK", stack: "Java, Spring, Kafka", site: "wise.jobs" },
  { id: "app3", company: "Klarna", country: "🇸🇪 Sweden", stack: "Java, microservices", site: "klarna.com/careers" },
  { id: "app4", company: "HelloFresh", country: "🇩🇪 Germany", stack: "Java, Spring Boot", site: "hellofresh.com/careers" },
  { id: "app5", company: "Personio", country: "🇩🇪 Germany", stack: "Java, Spring, K8s", site: "personio.com/careers" },
  { id: "app6", company: "Glovo", country: "🇪🇸 Spain", stack: "Java, microservices", site: "glovoapp.com/careers" },
  { id: "app7", company: "Catawiki", country: "🇳🇱 Netherlands", stack: "Java, AWS, Kafka", site: "catawiki.com/careers" },
  { id: "app8", company: "Picnic", country: "🇳🇱 Netherlands", stack: "Java (20+ teams)", site: "picnic.tech" },
];

const STAR_STORIES = [
  "Biggest technical challenge you faced",
  "Conflict with a colleague — how you resolved it",
  "Time you failed or made a mistake — what you learned",
  "Led a project without being the manager",
  "When you disagreed with a technical decision",
  "Had to learn something very quickly under pressure",
  "You improved a process or system proactively",
  "Working across teams or with non-engineers",
];

// ── Default state ─────────────────────────────────────────────────────────────
const defaultState = () => {
  const checks = {};
  TOPICS.forEach(t => t.subtopics.forEach(s => s.items.forEach((_, i) => { checks[`${s.id}-${i}`] = false; })));
  const weeks = {};
  WEEKS.forEach(w => {
    weeks[w.id] = {};
    DAY_LABELS.forEach((d, di) => { weeks[w.id][di] = { tech: false, english: false }; });
  });
  const apps = {};
  APPLICATIONS.forEach(a => { apps[a.id] = { status: "not-applied", notes: "" }; });
  const stars = {};
  STAR_STORIES.forEach((_, i) => { stars[i] = { written: false, recorded: false }; });
  return { checks, weeks, apps, stars, journalEntries: [] };
};

// ── Helper components ─────────────────────────────────────────────────────────
const Checkbox = ({ checked, onChange, size = 16 }) => (
  <button onClick={onChange} style={{ width: size, height: size, minWidth: size, borderRadius: 4, border: checked ? "none" : "2px solid #D1D5DB", background: checked ? "#3B82F6" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", padding: 0 }}>
    {checked && <svg width={size - 4} height={size - 4} viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
  </button>
);

const ProgressBar = ({ value, color = "#3B82F6", height = 6 }) => (
  <div style={{ height, background: "#F3F4F6", borderRadius: height, overflow: "hidden", minWidth: 60 }}>
    <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, value))}%`, background: color, borderRadius: height, transition: "width 0.4s ease" }} />
  </div>
);

const Badge = ({ label, color, bg }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg || "#F3F4F6", color: color || "#374151" }}>{label}</span>
);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(defaultState);
  const [view, setView] = useState("dashboard");
  const [activePhase, setActivePhase] = useState("p1");
  const [activeWeek, setActiveWeek] = useState("w1");
  const [activeTopic, setActiveTopic] = useState("t1");
  const [journalText, setJournalText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // Load from Firestore on mount
  useEffect(() => {
    (async () => {
      try {
        const docRef = doc(db, COLLECTION, DOC_ID);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const saved = snap.data();
          setState(s => ({ ...defaultState(), ...saved }));
        }
      } catch (e) {
        console.error("Load error:", e);
      }
      setLoaded(true);
    })();
  }, []);

  // Debounced save to Firestore
  const save = useCallback(async (newState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const docRef = doc(db, COLLECTION, DOC_ID);
        await setDoc(docRef, newState);
      } catch (e) {
        console.error("Save error:", e);
      }
      setSaving(false);
    }, 800);
  }, []);

  const update = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, [save]);

  const toggleCheck = (key) => update(s => ({ ...s, checks: { ...s.checks, [key]: !s.checks[key] } }));
  const toggleDay = (wk, di, field) => update(s => ({ ...s, weeks: { ...s.weeks, [wk]: { ...s.weeks[wk], [di]: { ...s.weeks[wk][di], [field]: !s.weeks[wk][di][field] } } } }));
  const setAppStatus = (id, status) => update(s => ({ ...s, apps: { ...s.apps, [id]: { ...s.apps[id], status } } }));
  const setAppNotes = (id, notes) => update(s => ({ ...s, apps: { ...s.apps, [id]: { ...s.apps[id], notes } } }));
  const toggleStar = (i, field) => update(s => ({ ...s, stars: { ...s.stars, [i]: { ...s.stars[i], [field]: !s.stars[i][field] } } }));

  const addJournal = () => {
    if (!journalText.trim()) return;
    const entry = { id: Date.now(), date: new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }), text: journalText.trim() };
    update(s => ({ ...s, journalEntries: [entry, ...(s.journalEntries || [])] }));
    setJournalText("");
  };

  const deleteJournal = (id) => update(s => ({ ...s, journalEntries: (s.journalEntries || []).filter(e => e.id !== id) }));

  // Stats
  const totalChecks = Object.keys(state.checks).length;
  const doneChecks = Object.values(state.checks).filter(Boolean).length;

  const weekProgress = (wk) => {
    const days = state.weeks[wk] || {};
    const done = Object.values(days).reduce((a, d) => a + (d.tech ? 1 : 0) + (d.english ? 1 : 0), 0);
    return Math.round((done / 14) * 100);
  };

  const phaseProgress = (pid) => {
    const phWeeks = WEEKS.filter(w => w.phase === pid);
    const total = phWeeks.length * 14;
    const done = phWeeks.reduce((a, w) => {
      const days = state.weeks[w.id] || {};
      return a + Object.values(days).reduce((b, d) => b + (d.tech ? 1 : 0) + (d.english ? 1 : 0), 0);
    }, 0);
    return Math.round((done / total) * 100);
  };

  const topicProgress = (tid) => {
    const topic = TOPICS.find(t => t.id === tid);
    if (!topic) return 0;
    let total = 0, done = 0;
    topic.subtopics.forEach(s => s.items.forEach((_, i) => { total++; if (state.checks[`${s.id}-${i}`]) done++; }));
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const appStatusColor = { "not-applied": "#9CA3AF", "applied": "#3B82F6", "interview": "#F59E0B", "offer": "#10B981", "rejected": "#EF4444" };
  const appStatusLabel = { "not-applied": "Not Applied", "applied": "Applied", "interview": "Interviewing", "offer": "Offer 🎉", "rejected": "Rejected" };

  const ph = PHASES.find(p => p.id === activePhase) || PHASES[0];
  const currentTopic = TOPICS.find(t => t.id === activeTopic) || TOPICS[0];
  const currentWeekData = WEEKS.find(w => w.id === activeWeek) || WEEKS[0];
  const currentPhaseForWeek = PHASES.find(p => p.id === currentWeekData.phase) || PHASES[0];

  const NAV = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "weekly", icon: "📅", label: "Daily Log" },
    { id: "topics", icon: "📚", label: "Topics" },
    { id: "applications", icon: "🏢", label: "Applications" },
    { id: "english", icon: "🗣", label: "English" },
    { id: "journal", icon: "✏️", label: "Journal" },
  ];

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F9FAFB", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
        <div style={{ color: "#6B7280", fontSize: 14 }}>Loading your tracker from the cloud…</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter',system-ui,sans-serif", background: "#F9FAFB", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: "#111827", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1F2937" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", letterSpacing: "0.08em", textTransform: "uppercase" }}>EU Switch</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>4-Month Plan Tracker</div>
          {saving && <div style={{ fontSize: 10, color: "#3B82F6", marginTop: 4 }}>● Saving…</div>}
          {!saving && loaded && <div style={{ fontSize: 10, color: "#10B981", marginTop: 4 }}>✓ Synced</div>}
        </div>
        <div style={{ flex: 1, padding: "16px 12px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2, textAlign: "left", background: view === n.id ? "#1F2937" : "transparent", color: view === n.id ? "#F9FAFB" : "#9CA3AF", fontSize: 13, fontWeight: view === n.id ? 600 : 400, transition: "all 0.1s" }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1F2937" }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>Overall Progress</div>
          <ProgressBar value={(doneChecks / totalChecks) * 100} color="#3B82F6" height={4} />
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{doneChecks}/{totalChecks} topics</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>

        {/* ── DASHBOARD ── */}
        {view === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Dashboard</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Your EU switch prep — synced across all devices ☁️</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
              {PHASES.map(p => {
                const prog = phaseProgress(p.id);
                return (
                  <div key={p.id} onClick={() => { setView("weekly"); setActivePhase(p.id); setActiveWeek(WEEKS.find(w => w.phase === p.id)?.id || "w1"); }} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{p.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{p.subtitle}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>{p.weeks}</div>
                    <ProgressBar value={prog} color={p.color} />
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 5 }}>{prog}% complete</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Topic Progress</div>
                {TOPICS.map(t => {
                  const prog = topicProgress(t.id);
                  return (
                    <div key={t.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{t.label}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{prog}%</span>
                      </div>
                      <ProgressBar value={prog} color={t.color} height={5} />
                    </div>
                  );
                })}
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Application Pipeline</div>
                {Object.entries(appStatusLabel).map(([status, label]) => {
                  const count = Object.values(state.apps).filter(a => a.status === status).length;
                  return (
                    <div key={status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: appStatusColor[status] }} />
                        <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: appStatusColor[status] }}>{count}</span>
                    </div>
                  );
                })}
                <button onClick={() => setView("applications")} style={{ marginTop: 12, fontSize: 12, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}>Manage →</button>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>STAR Stories</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
                {STAR_STORIES.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #F9FAFB" }}>
                    <Checkbox checked={!!state.stars[i]?.written} onChange={() => toggleStar(i, "written")} size={14} />
                    <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{s}</span>
                    <Checkbox checked={!!state.stars[i]?.recorded} onChange={() => toggleStar(i, "recorded")} size={14} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>◀ Written</span>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>Recorded ▶</span>
              </div>
            </div>
          </div>
        )}

        {/* ── DAILY LOG ── */}
        {view === "weekly" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Daily Log</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Tick tech + English each day. Sunday = mandatory break.</p>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {PHASES.map(p => (
                <button key={p.id} onClick={() => { setActivePhase(p.id); setActiveWeek(WEEKS.find(w => w.phase === p.id)?.id || "w1"); }} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: activePhase === p.id ? p.color : "#F3F4F6", color: activePhase === p.id ? "#fff" : "#6B7280" }}>
                  {p.label} · {p.weeks}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {WEEKS.filter(w => w.phase === activePhase).map(w => (
                <button key={w.id} onClick={() => setActiveWeek(w.id)} style={{ padding: "5px 12px", borderRadius: 8, border: activeWeek === w.id ? `2px solid ${ph.color}` : "2px solid #E5E7EB", cursor: "pointer", fontSize: 12, background: activeWeek === w.id ? ph.light : "#fff", color: activeWeek === w.id ? ph.color : "#6B7280", fontWeight: activeWeek === w.id ? 600 : 400 }}>
                  {w.id.toUpperCase()} · {weekProgress(w.id)}%
                </button>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", background: currentPhaseForWeek.light, borderBottom: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: currentPhaseForWeek.color }}>{currentWeekData.id.toUpperCase()}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{currentWeekData.label}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Progress: {weekProgress(currentWeekData.id)}%</div>
              </div>
              {DAY_LABELS.map((day, di) => {
                const isBreak = di === 6;
                const dayState = state.weeks[currentWeekData.id]?.[di] || { tech: false, english: false };
                const techTask = DAILY_TECH[currentWeekData.id]?.[di] || "Study session";
                const engTask = DAILY_ENGLISH[currentWeekData.id]?.[di] || "15 min English";
                const dayNum = (WEEKS.findIndex(w => w.id === currentWeekData.id)) * 7 + di + 1;
                return (
                  <div key={di} style={{ display: "flex", alignItems: "flex-start", padding: "12px 20px", borderBottom: di < 6 ? "1px solid #F9FAFB" : "none", background: isBreak ? "#F0FDF4" : (dayState.tech && dayState.english) ? "#F8FFFE" : "#fff" }}>
                    <div style={{ width: 44, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isBreak ? "#10B981" : "#374151" }}>{day}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>Day {dayNum}</div>
                    </div>
                    <div style={{ flex: 1, marginLeft: 12 }}>
                      {isBreak ? (
                        <div style={{ fontSize: 13, color: "#10B981", fontWeight: 600 }}>💚 Full Break — Rest, recharge, no tech</div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                            <Checkbox checked={dayState.tech} onChange={() => toggleDay(currentWeekData.id, di, "tech")} />
                            <div><span style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6" }}>💻 TECH (60 min) · </span><span style={{ fontSize: 12, color: "#374151" }}>{techTask}</span></div>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <Checkbox checked={dayState.english} onChange={() => toggleDay(currentWeekData.id, di, "english")} />
                            <div><span style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6" }}>🗣 ENGLISH (15–20 min) · </span><span style={{ fontSize: 12, color: "#374151" }}>{engTask}</span></div>
                          </div>
                        </>
                      )}
                    </div>
                    {!isBreak && dayState.tech && dayState.english && <span style={{ fontSize: 18 }}>✅</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TOPICS ── */}
        {view === "topics" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Topic Checklist</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Tick each subtopic as you cover it</p>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {TOPICS.map(t => (
                <button key={t.id} onClick={() => setActiveTopic(t.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: activeTopic === t.id ? t.color : "#F3F4F6", color: activeTopic === t.id ? "#fff" : "#6B7280" }}>
                  {t.label.split(" ").slice(0, 3).join(" ")} · {topicProgress(t.id)}%
                </button>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{currentTopic.label}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{topicProgress(currentTopic.id)}% complete</div>
                </div>
                <div style={{ width: 120 }}><ProgressBar value={topicProgress(currentTopic.id)} color={currentTopic.color} /></div>
              </div>
              <div style={{ padding: "12px 20px" }}>
                {currentTopic.subtopics.map(sub => {
                  const subDone = sub.items.filter((_, i) => state.checks[`${sub.id}-${i}`]).length;
                  return (
                    <div key={sub.id} style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 6, height: 16, borderRadius: 3, background: currentTopic.color, display: "inline-block" }} />
                          {sub.group}
                        </div>
                        <Badge label={`${subDone}/${sub.items.length}`} color={currentTopic.color} bg={`${currentTopic.color}18`} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                        {sub.items.map((item, i) => {
                          const key = `${sub.id}-${i}`;
                          return (
                            <div key={i} onClick={() => toggleCheck(key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, cursor: "pointer" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <Checkbox checked={!!state.checks[key]} onChange={() => toggleCheck(key)} size={14} />
                              <span style={{ fontSize: 12, color: state.checks[key] ? "#9CA3AF" : "#374151", textDecoration: state.checks[key] ? "line-through" : "none" }}>{item}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── APPLICATIONS ── */}
        {view === "applications" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Job Applications</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Target: 25+ applications by Week 14</p>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {Object.entries(appStatusLabel).map(([status, label]) => {
                const count = Object.values(state.apps).filter(a => a.status === status).length;
                return (
                  <div key={status} style={{ background: "#fff", borderRadius: 10, padding: "10px 16px", border: "1px solid #E5E7EB", textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: appStatusColor[status] }}>{count}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {APPLICATIONS.map(app => {
                const appState = state.apps[app.id] || { status: "not-applied", notes: "" };
                return (
                  <div key={app.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{app.company}</div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>{app.country}</div>
                      </div>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: appStatusColor[appState.status], marginTop: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 10 }}>Stack: {app.stack}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                      {Object.entries(appStatusLabel).map(([status, label]) => (
                        <button key={status} onClick={() => setAppStatus(app.id, status)} style={{ padding: "3px 8px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontSize: 10, fontWeight: 600, borderColor: appState.status === status ? appStatusColor[status] : "#E5E7EB", background: appState.status === status ? `${appStatusColor[status]}18` : "transparent", color: appState.status === status ? appStatusColor[status] : "#9CA3AF" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <input value={appState.notes || ""} onChange={e => setAppNotes(app.id, e.target.value)} placeholder="Notes: interview date, contact, feedback…" style={{ width: "100%", fontSize: 11, color: "#374151", border: "1px solid #F3F4F6", borderRadius: 6, padding: "5px 8px", background: "#F9FAFB", outline: "none", boxSizing: "border-box" }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ENGLISH ── */}
        {view === "english" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>English Improvement</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>15–20 min every evening · Level 5–6 → Target 7.5+</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {[
                { month: "Month 1", color: "#3B82F6", bg: "#EFF6FF", focus: "Clarity + Pacing", habit: "Record → Listen → Redo. Speak 30% slower. Pause at every full stop.", resource: "Elsa Speak app (free) · 10 min/day" },
                { month: "Month 2", color: "#10B981", bg: "#ECFDF5", focus: "Tech Vocab in Speech", habit: "3 tech terms/day — say a full sentence using each aloud.", resource: "Anki Tech English deck · Merriam-Webster Word of the Day" },
                { month: "Month 3", color: "#F59E0B", bg: "#FFFBEB", focus: "Interview Structures", habit: "Answer 1 mock Q aloud (STAR). Record. Check structure + pacing.", resource: "Pramp.com (free) · italki.com 1 session/week" },
                { month: "Month 4", color: "#8B5CF6", bg: "#F5F3FF", focus: "EU Accent + Polish", habit: "10 min EU-accented English YouTube. Shadow speaker 2 sec behind.", resource: "Kurzgesagt YouTube · Lex Fridman Podcast" },
              ].map((m, i) => (
                <div key={i} style={{ background: m.bg, borderRadius: 12, padding: 18, border: `1px solid ${m.color}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.month}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{m.focus}</div>
                  <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 8 }}>{m.habit}</div>
                  <div style={{ fontSize: 11, color: m.color, fontWeight: 500 }}>📌 {m.resource}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#8B5CF610", borderRadius: 12, padding: 18, border: "1px solid #8B5CF630", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#8B5CF6", marginBottom: 8 }}>The Single Most Effective Habit</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}><strong>Record → Listen → Redo.</strong> 60 seconds on any topic. Play it back. You immediately hear what to fix. Redo once. Every evening. This alone moves you from 5–6 to 7.5+ in 4 months.</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>STAR Stories Tracker</div>
              {STAR_STORIES.map((story, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < STAR_STORIES.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                  <div style={{ fontSize: 12, color: "#9CA3AF", width: 20, textAlign: "center", fontWeight: 600 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 12, color: "#374151" }}>{story}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Checkbox checked={!!state.stars[i]?.written} onChange={() => toggleStar(i, "written")} size={15} />
                      <span style={{ fontSize: 10, color: "#9CA3AF" }}>Written</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Checkbox checked={!!state.stars[i]?.recorded} onChange={() => toggleStar(i, "recorded")} size={15} />
                      <span style={{ fontSize: 10, color: "#9CA3AF" }}>Recorded</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── JOURNAL ── */}
        {view === "journal" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Study Journal</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Reflections, blockers, wins, interview notes — all synced to cloud</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20, marginBottom: 20 }}>
              <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder="What did you learn today? What felt hard? Any interview feedback? Write freely…" style={{ width: "100%", minHeight: 100, fontSize: 13, color: "#374151", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
                <button onClick={addJournal} style={{ padding: "7px 18px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save Entry</button>
              </div>
            </div>
            {(state.journalEntries || []).length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 13 }}>No entries yet. Write your first reflection above.</div>
            )}
            {(state.journalEntries || []).map(entry => (
              <div key={entry.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px 20px", marginBottom: 12, position: "relative" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8, fontWeight: 500 }}>{entry.date}</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{entry.text}</div>
                <button onClick={() => deleteJournal(entry.id)} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#D1D5DB", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
