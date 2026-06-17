import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getScheduledDate, formatDate, getDayStatus, buildCompletedSet } from "./dateUtils";

const DOC_ID = "tracker-state";
const COLLECTION = "eu-switch";

// ── Colour tokens (BloomFi-inspired lavender palette) ─────────────────────────
const T = {
  purple:     "#7C6FCD",
  purpleDeep: "#5B4FB5",
  purpleLight:"#E8E6F8",
  purplePale: "#F3F1FC",
  navy:       "#1E1B3A",
  navyMid:    "#2D2952",
  cream:      "#F5F4F0",
  creamDark:  "#EDECE8",
  ink:        "#1A1A2E",
  inkMid:     "#3D3B52",
  muted:      "#8B8AA0",
  border:     "rgba(124,111,205,0.15)",
  borderMid:  "rgba(124,111,205,0.3)",
  green:      "#22C55E",
  amber:      "#F59E0B",
  red:        "#EF4444",
  white:      "#FFFFFF",
};

// Dark mode tokens
const DT = {
  purple:     "#9D93E0",
  purpleDeep: "#7C6FCD",
  purpleLight:"rgba(124,111,205,0.2)",
  purplePale: "rgba(124,111,205,0.1)",
  navy:       "#0D0B1E",
  navyMid:    "#1A1735",
  cream:      "#0F0E1A",
  creamDark:  "#1A1830",
  ink:        "#F0EEFF",
  inkMid:     "#C4C0E8",
  muted:      "#7A78A0",
  border:     "rgba(157,147,224,0.15)",
  borderMid:  "rgba(157,147,224,0.3)",
  green:      "#4ADE80",
  amber:      "#FBB040",
  red:        "#F87171",
  white:      "#1A1830",
};

// ── Data ──────────────────────────────────────────────────────────────────────
const PHASES = [
  { id:"p1", label:"Phase 1", subtitle:"System Design + Java",   weeks:"Weeks 1–4",  color:"#7C6FCD" },
  { id:"p2", label:"Phase 2", subtitle:"Cloud + AI Integration", weeks:"Weeks 5–8",  color:"#22C55E" },
  { id:"p3", label:"Phase 3", subtitle:"DSA + Mock Interviews",  weeks:"Weeks 9–12", color:"#F59E0B" },
  { id:"p4", label:"Phase 4", subtitle:"Apply + Interview",      weeks:"Weeks 13–16",color:"#EF4444" },
];

const TOPICS = [
  { id:"t1", phase:"p1", label:"System Design", color:"#7C6FCD", subtopics:[
    { id:"t1-1", group:"Fundamentals", items:["What is a distributed system","Latency vs throughput","Availability vs consistency","CAP theorem","PACELC theorem","SLA / SLO / SLI","Fault tolerance","Single point of failure (SPOF)"] },
    { id:"t1-2", group:"Scalability",  items:["Horizontal vs vertical scaling","Stateless vs stateful services","Load balancing algorithms","Layer 4 vs Layer 7 LB","Auto-scaling","Database read replicas","Database sharding","Consistent hashing"] },
    { id:"t1-3", group:"Caching",      items:["Cache hit ratio","Cache-aside pattern","Write-through cache","Write-behind cache","Read-through cache","LRU / LFU / FIFO eviction","Cache stampede prevention","TTL strategy","Redis vs Memcached","Distributed cache","Cache invalidation"] },
    { id:"t1-4", group:"Databases",    items:["ACID properties","Isolation levels","BASE properties","SQL vs NoSQL","Indexing internals","Composite indexes","Query explain plan","N+1 query problem","Connection pooling","Optimistic vs pessimistic locking","Normalisation","NoSQL types","Cassandra model","MongoDB aggregation"] },
    { id:"t1-5", group:"Messaging",    items:["Why message queues exist","Kafka architecture","Kafka offset management","Kafka replication factor","Kafka vs RabbitMQ","Dead letter queue","Event sourcing","CQRS pattern","Outbox pattern","Idempotency"] },
    { id:"t1-6", group:"API Design",   items:["REST principles","HTTP methods & status codes","API versioning","Cursor vs offset pagination","Rate limiting algorithms","API Gateway patterns","GraphQL vs REST","gRPC & protobuf","Idempotency keys","OpenAPI / Swagger"] },
    { id:"t1-7", group:"Resilience",   items:["Circuit breaker states","Resilience4j @CircuitBreaker","Retry with exponential backoff","Bulkhead pattern","Timeout on every call","Fallback strategies","Health checks","Graceful degradation"] },
    { id:"t1-8", group:"Design Cases", items:["URL shortener","Ride-sharing backend","WhatsApp messaging","Payment processing","Notification service","Search autocomplete","Distributed rate limiter"] },
  ]},
  { id:"t2", phase:"p1", label:"Core Java", color:"#F59E0B", subtopics:[
    { id:"t2-1", group:"JVM Internals",  items:["JVM architecture","Heap structure","Minor/Major/Full GC","GC algorithms","GC tuning flags","Memory leaks","Reading GC logs","JIT compiler","Escape analysis"] },
    { id:"t2-2", group:"Concurrency",    items:["Thread lifecycle","synchronized","volatile","Happens-before","AtomicInteger / CAS","ReentrantLock","ReadWriteLock","Deadlock prevention","ThreadLocal","ExecutorService","CompletableFuture chain","ForkJoinPool","Virtual threads (Java 21)","Structured concurrency"] },
    { id:"t2-3", group:"Collections",    items:["HashMap internals","HashMap resize","ConcurrentHashMap","LinkedHashMap (LRU)","TreeMap","ArrayDeque","PriorityQueue","CopyOnWriteArrayList","BlockingQueue"] },
    { id:"t2-4", group:"Java 17–21",     items:["Records","Sealed classes","Pattern matching instanceof","Text blocks","Switch expressions","Unnamed patterns","Sequenced collections","Virtual threads","String templates"] },
  ]},
  { id:"t3", phase:"p1", label:"Spring Boot 3", color:"#22C55E", subtopics:[
    { id:"t3-1", group:"Core IoC",             items:["Spring IoC container","BeanFactory vs ApplicationContext","Constructor injection","@Component/@Service/@Repository","Bean scopes","Bean lifecycle","Conditional beans","Auto-configuration"] },
    { id:"t3-2", group:"Security",             items:["Authentication vs authorisation","SecurityFilterChain","JWT flow","OAuth2 code flow","OAuth2 client credentials","CSRF","@PreAuthorize","BCrypt","CORS"] },
    { id:"t3-3", group:"Data & Transactions",  items:["JPA vs Hibernate vs Spring Data","Entity annotations","Relationships","FetchType.LAZY vs EAGER","N+1 fix with @EntityGraph","@Transactional propagation","@Transactional isolation","Optimistic locking @Version","Pageable"] },
    { id:"t3-4", group:"Cloud & Microservices",items:["Eureka setup","Spring Cloud Gateway","Spring Cloud Config","Feign client","Resilience4j","Micrometer Tracing","Actuator","Prometheus + Grafana","Kafka with Spring"] },
    { id:"t3-5", group:"Testing",              items:["@SpringBootTest vs @WebMvcTest","MockMvc","@MockBean vs @Mock","Testcontainers","WireMock","Spring Cloud Contract","JaCoCo"] },
  ]},
  { id:"t4", phase:"p2", label:"Docker & K8s", color:"#22C55E", subtopics:[
    { id:"t4-1", group:"Docker",     items:["Container vs VM","Dockerfile instructions","Multi-stage builds","docker-compose","Image layer caching","Docker networking","Volumes","Distroless images"] },
    { id:"t4-2", group:"Kubernetes", items:["Control plane","Worker nodes","Pod","Deployment","ReplicaSet","Service types","Ingress","ConfigMap","Secret","PV and PVC","Liveness vs readiness probe","HPA","Helm charts","kubectl commands"] },
  ]},
  { id:"t5", phase:"p2", label:"AI Integration", color:"#7C6FCD", subtopics:[
    { id:"t5-1", group:"LLM Fundamentals", items:["Tokens & context window","Temperature / max_tokens","Prompt roles","Zero-shot vs few-shot","Chain-of-thought","Hallucination mitigation","Streaming","Token cost"] },
    { id:"t5-2", group:"Spring AI",        items:["ChatClient","Prompt templates","BeanOutputParser","EmbeddingClient","VectorStore","RAG pipeline","Advisors","Function calling"] },
    { id:"t5-3", group:"RAG Pattern",      items:["Why RAG exists","Chunking strategies","Embeddings & cosine similarity","Vector search (ANN)","Re-ranking","Hybrid search","Context window management"] },
    { id:"t5-4", group:"Production AI",    items:["AI observability","Response caching","Prompt injection defence","Circuit breaker for AI","Async AI calls","Per-user rate limiting","A/B testing prompts"] },
  ]},
  { id:"t6", phase:"p3", label:"DSA Patterns", color:"#EF4444", subtopics:[
    { id:"t6-1", group:"Arrays & Strings",   items:["Two pointer — opposite ends","Two pointer — fast/slow","Sliding window fixed","Sliding window variable","Prefix sum","Kadane's algorithm","String manipulation"] },
    { id:"t6-2", group:"Hashing",            items:["Two Sum","Group Anagrams","Valid Anagram","Longest Consecutive","Top K Frequent"] },
    { id:"t6-3", group:"Linked Lists",       items:["Reverse (iterative)","Reverse (recursive)","Cycle detection Floyd's","Find cycle start","Merge sorted","Find middle","Remove Nth from end"] },
    { id:"t6-4", group:"Stacks & Queues",    items:["Valid Parentheses","Min Stack","Daily Temperatures","Next Greater Element","Evaluate RPN","Largest Rectangle"] },
    { id:"t6-5", group:"Trees",              items:["Inorder traversal","Preorder traversal","Postorder traversal","Level-order BFS","Max depth","Diameter","Validate BST","LCA","Serialize/Deserialize","Kth Smallest BST","Balanced check"] },
    { id:"t6-6", group:"Graphs",             items:["BFS shortest path","DFS cycle detection","Number of Islands","Clone Graph","Rotting Oranges","Topological sort","Union-Find","Dijkstra's"] },
    { id:"t6-7", group:"Dynamic Programming",items:["Memoisation vs tabulation","Climbing Stairs","House Robber","Coin Change","LIS","Word Break","Unique Paths","LCS","Edit Distance","Knapsack"] },
    { id:"t6-8", group:"Sorting & Search",   items:["Binary search standard","Binary search rotated","Binary search on answer","Merge sort","Quick sort","Top K with heap"] },
  ]},
];

const DAY_TOPIC_MAP = {
  w1:["t1-1","t1-1","t1-1","t1-2","t1-2","t1-1,t1-2",null],
  w2:["t1-3","t1-3","t2-2","t2-2","t2-3","t1-3,t2-2,t2-3",null],
  w3:["t1-5","t1-5","t3-1","t3-1","t3-2","t1-5,t3-1,t3-2",null],
  w4:["t1-6","t1-6","t1-7","t3-3","t2-4","t1-6,t1-7,t3-3",null],
  w5:["t4-1","t4-1","t4-2","t4-2","t4-2","t4-1,t4-2",null],
  w6:["t5-1","t5-1","t5-1","t5-2","t3-4","t5-1,t3-4",null],
  w7:["t5-1","t5-2","t5-3","t5-4","t5-2,t5-3","t5-2,t5-3,t5-4",null],
  w8:["t1-8","t1-8","t1-8","t1-4","t1-8","t1-4,t1-8",null],
  w9:["t6-1","t6-2","t6-3","t6-4","t6-8","t6-1,t6-2,t6-3,t6-4",null],
  w10:["t6-5","t6-5","t6-6","t6-6","t6-7","t6-5,t6-6,t6-7",null],
  w11:["t6-7","t6-7",null,null,null,null,null],
  w12:["t1-8","t2-1,t3-1","t5-3","t6-1","t1-6",null,null],
  w13:[null,null,null,null,null,null,null],
  w14:[null,null,null,null,null,null,null],
  w15:[null,null,null,null,null,null,null],
  w16:[null,null,null,null,null,null,null],
};

const WEEKS = [
  {id:"w1", phase:"p1",label:"Week 1",subtitle:"Distributed Systems + JVM"},
  {id:"w2", phase:"p1",label:"Week 2",subtitle:"Caching + Java Concurrency"},
  {id:"w3", phase:"p1",label:"Week 3",subtitle:"Messaging + Spring Boot"},
  {id:"w4", phase:"p1",label:"Week 4",subtitle:"API Design + Resilience"},
  {id:"w5", phase:"p2",label:"Week 5",subtitle:"Docker + Kubernetes"},
  {id:"w6", phase:"p2",label:"Week 6",subtitle:"AWS + CI/CD"},
  {id:"w7", phase:"p2",label:"Week 7",subtitle:"Spring AI + RAG"},
  {id:"w8", phase:"p2",label:"Week 8",subtitle:"System Design Review"},
  {id:"w9", phase:"p3",label:"Week 9",subtitle:"Arrays, Strings, Hashing"},
  {id:"w10",phase:"p3",label:"Week 10",subtitle:"Trees, Graphs, DP"},
  {id:"w11",phase:"p3",label:"Week 11",subtitle:"Mock Interviews + STAR"},
  {id:"w12",phase:"p3",label:"Week 12",subtitle:"Month 3 Review + Apply"},
  {id:"w13",phase:"p4",label:"Week 13",subtitle:"Apply + First Interviews"},
  {id:"w14",phase:"p4",label:"Week 14",subtitle:"Active Interviews"},
  {id:"w15",phase:"p4",label:"Week 15",subtitle:"Final Rounds + Offers"},
  {id:"w16",phase:"p4",label:"Week 16",subtitle:"Wrap Up + Begin"},
];

const DAY_LABELS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const DAILY_TECH={
  w1:["Distributed Systems intro — definition, real examples, why systems fail","CAP Theorem deep dive + PACELC theorem","SLA / SLO / SLI + Fault Tolerance + SPOF","Load Balancing algorithms + Horizontal Scaling","DB Scaling: Replication & Sharding + Consistent Hashing","REVIEW Week 1 — draw all diagrams from memory","💚 Rest day"],
  w2:["Caching Fundamentals — cache-aside, write-through + Redis data types","Cache Eviction (LRU/LFU) + Cache Stampede + Redis Cluster","Java Concurrency Pt1 — Thread lifecycle, synchronized, volatile","Java Concurrency Pt2 — ExecutorService, CompletableFuture","Collections Internals — HashMap, ConcurrentHashMap, PriorityQueue","REVIEW Week 2 + Mini Design","💚 Rest day"],
  w3:["Kafka Architecture — topic, partition, offset, consumer group","Event-Driven Patterns — CQRS, Outbox, Idempotency, DLQ","Spring Boot Core — IoC, constructor injection, Bean scopes","Spring Boot — Auto-configuration, Actuator, Micrometer","Spring Security — JWT flow, OAuth2 code + client credentials","REVIEW Week 3 + Design Notification Service","💚 Rest day"],
  w4:["REST API Design — status codes, idempotency, versioning, pagination","Rate Limiting (token bucket, sliding window) + API Gateway","Resilience Patterns — Circuit Breaker, Retry, Bulkhead, Timeout","Spring Transactions + JPA — @Transactional, N+1 fix, @EntityGraph","Java 21 — Virtual threads, Records, Sealed classes","FULL MONTH 1 REVIEW — redesign ride-sharing from memory","💚 Rest day"],
  w5:["Docker — Dockerfile, multi-stage build, docker build/run","Docker Networking + Compose — bridge networks, multi-service","Kubernetes Architecture — control plane, worker nodes, Pod/Deployment","K8s Services + Ingress + ConfigMap + Secret + Namespace","K8s Probes + HPA + Resource limits + Helm chart structure","REVIEW Week 5 + write K8s Deployment YAML from memory","💚 Rest day"],
  w6:["AWS Core — IAM, EC2, S3, RDS, SQS","AWS Networking + ECS Fargate — VPC, security groups","GitHub Actions CI/CD — workflow YAML, build + push to ECR","Observability — structured logging, Prometheus, Grafana, Zipkin","Spring Cloud — Eureka, Gateway, Config Server, Micrometer Tracing","REVIEW Week 6 + Draw 3-tier cloud architecture","💚 Rest day"],
  w7:["LLM Fundamentals — tokens, context window, temperature, prompt roles","Spring AI — ChatClient, Prompt templates, OutputParsers","RAG Pipeline — chunk, embed, store, retrieve, augment, generate","Function Calling + AI Observability + prompt injection defence","Portfolio BUILD — Spring Boot 3 + Spring AI + Kafka + Redis","REVIEW Week 7 + add Actuator + Prometheus to portfolio","💚 Rest day"],
  w8:["System Design: WhatsApp — Cassandra, WebSocket, Kafka fan-out","System Design: Payment System — idempotency key, Saga pattern","System Design: Notification Service — Kafka, DLQ, fan-out","Consistency deep dive — Saga, distributed lock, leader election","Full design practice: Search Autocomplete (45 min timed)","FULL MONTH 2 REVIEW — portfolio deploy to AWS + CV draft","💚 Rest day"],
  w9:["Arrays: Two Pointer + Sliding Window — 3 NeetCode problems","Hashing Patterns — Two Sum, Group Anagrams, Top K Frequent","Linked Lists — Reverse, Floyd's cycle, Merge sorted, Find middle","Stacks + Monotonic Stack — Valid Parens, Min Stack, Daily Temps","Binary Search — standard, rotated array, binary search on answer","REVIEW Week 9 — 3 mixed timed problems (15 min each)","💚 Rest day"],
  w10:["Binary Trees Pt1 — all traversals iterative + recursive, Level-order BFS","Binary Trees Pt2 — Validate BST, LCA, Serialize/Deserialize","Graphs Pt1 — BFS shortest path, DFS, Number of Islands","Graphs Pt2 — Topological sort, Union-Find, Dijkstra's","DP 1D — Climbing Stairs, House Robber, Coin Change, LIS","REVIEW Week 10 — 3 mixed (1 tree + 1 graph + 1 DP)","💚 Rest day"],
  w11:["Heap + Intervals — Kth Largest, Median from Stream, Meeting Rooms II","2D DP + String DP — Unique Paths, LCS, Edit Distance","Behavioural Prep Pt1 — Write STAR Stories 1–4 + record each","Behavioural Prep Pt2 — Write STAR Stories 5–8 + record each","Mock Technical Interview — 1 LeetCode medium timed + 1 system design","REVIEW + CV finalise + Pramp.com mock session","💚 Rest day"],
  w12:["Full System Design Revision — 4 systems, 10 min each from memory","Java + Spring Boot Revision — GC, CompletableFuture, @Transactional","AI Integration Revision — RAG, function calling, observability","DSA Final — 5 mixed problems (15 min each, strict timer)","Cover Letter + Applications — 5 companies applied today","FULL MONTH 3 REVIEW + Go/No-Go checklist + 5 more apps","💚 Rest day"],
  w13:["Coding screen prep — 2 easy + 1 medium LeetCode warm-up","System Design round prep — opening structure, talk while drawing","Apply + Referrals — total 15 applications, 3 LinkedIn outreach","Questions to Ask Interviewers — prepare 5 smart Qs","Salary Negotiation Prep — levels.fyi research","REVIEW + Mid-Application Calibration","💚 Rest day"],
  w14:["2 LeetCode mediums + Interview Debrief log","Research company engineering blogs — prepare 1 specific question","System Design + Java practice — 1 full design (30 min)","Apply + Follow-up — 5 more apps (total 25+)","Final-Round Prep: Architecture Interview — defend decisions","REVIEW + Application Status Check","💚 Rest day"],
  w15:["Full 90-min Mock — 45 min design + 30 min coding + 15 min STAR","Java 21 + Spring Boot 3 Final — virtual threads, jakarta namespace","Offer Evaluation Framework — base, bonus, equity, relocation","Visa Action Items — apostille checklist, immigration contact","Keep Applying — never stop until offer is signed","Final Review + Go/No-Go checklist confirmed","💚 Rest day"],
  w16:["Interview remaining pipeline — trust the preparation","Compare Offers — score on salary, growth, relocation, tech","Resignation Planning — professional letter, notice negotiation","Post-Arrival Plan — local JUG, engineering all-hands","Keep Applying until signed offer","🎉 Done. 110 days. One direction. One result.","💚 Rest day"],
};

// Detailed English instructions per day
const DAILY_ENGLISH_DETAIL={
  w1:[
    {task:"Pronunciation warm-up",steps:["Open Elsa Speak app (free)","Complete the Day 1 onboarding session — takes 8 min","Focus on the sounds it flags as weak (common: 'th', 'v', word endings)","After Elsa Speak: say these 3 words aloud 5 times each slowly: 'distributed', 'latency', 'throughput'","Record yourself defining 'distributed system' in 2 sentences on your voice memo app","Play it back — note 1 thing that sounds unclear","Record once more"],duration:"15 min",tool:"Elsa Speak (free iOS/Android)"},
    {task:"Reading aloud + CAP explanation",steps:["Find any tech paragraph online (Medium, Hacker News)","Read it aloud very slowly — pause 1 full second at every full stop","Now record yourself for 60 seconds explaining CAP theorem as if to a friend","Say: 'CAP theorem says that a distributed system can only guarantee two of three things: Consistency, Availability, and Partition Tolerance'","Play it back. Did you rush? Did words sound muffled?","Record once more, 30% slower"],duration:"15 min",tool:"Voice Memos (iPhone)"},
    {task:"Tech vocabulary practice",steps:["Say each word aloud 3 times clearly: 'scalability', 'fault tolerance', 'availability', 'consistency'","Now make a full sentence with each: e.g. 'The system needs high availability because users expect 99.9% uptime'","Open Elsa Speak — do a 10-min session focused on pronunciation accuracy","End by recording a 30-sec voice note: 'Today I learned about...'"],duration:"15 min",tool:"Elsa Speak"},
    {task:"Listening without subtitles",steps:["Open YouTube — search 'What is distributed computing TED'","Watch 10 minutes WITHOUT subtitles","Write down 3 words or phrases you didn't catch","Look them up, say them aloud","Watch those 10 minutes again WITH subtitles — measure your comprehension gap"],duration:"15 min",tool:"YouTube"},
    {task:"Tell me about yourself",steps:["This is the most important question in any EU interview. Prepare your 90-second answer now.","Structure: Current role (20 sec) → Key experience (30 sec) → What you're building toward (20 sec) → Why EU (20 sec)","Record yourself answering on voice memos","Listen back: Does it flow naturally? Did you say 'um' a lot?","Record again. Aim for zero 'um' and a natural pace"],duration:"20 min",tool:"Voice Memos"},
    {task:"Full mock introduction",steps:["Record your complete 2-minute interview introduction from scratch — no notes","Pretend you just entered a video call with a Dutch interviewer","Include: your name, current role, years of experience, tech stack, why you're interested in EU","Listen back critically — is it clear? Natural? Confident?","Redo it once. Compare both recordings."],duration:"20 min",tool:"Voice Memos"},
    {task:"Rest",steps:["10 min Elsa Speak only — light session, no recording pressure"],duration:"10 min",tool:"Elsa Speak"},
  ],
  w2:[
    {task:"Caching explanation",steps:["New vocabulary to say aloud 3x each: 'cache miss', 'eviction policy', 'cache invalidation', 'TTL'","Record 60 seconds: 'Explain how cache-aside pattern works to a non-engineer'","Tip: Use an analogy — 'It's like keeping your most-used books on your desk instead of going to the library every time'","Play back. Is the analogy clear?"],duration:"15 min",tool:"Voice Memos"},
    {task:"Listening — Redis explanation",steps:["Search YouTube: 'How Redis works Fireship' (7 min video)","Watch WITHOUT subtitles","Note any words you didn't catch","Say those words aloud 3 times each","Write 1 sentence summarising what Redis does — say it aloud"],duration:"15 min",tool:"YouTube"},
    {task:"Technical explanation drill",steps:["Record 60 sec: 'What is a thread and why do applications use multiple threads?'","Keep it simple — imagine explaining to your product manager, not a developer","Common mistake: going too technical too fast. Start with the why, then the how.","Listen back. Did you explain the 'why' before the 'how'?"],duration:"15 min",tool:"Voice Memos"},
    {task:"STAR story — technical challenge",steps:["STAR = Situation (15 sec) → Task (10 sec) → Action (40 sec) → Result (15 sec)","Pick a real technical challenge from your 5.8 years of experience","Write bullet points for each section — don't write full sentences, just keywords","Record your 90-second answer — speak from keywords, not a script","Listen. Did the Action section have enough detail?"],duration:"20 min",tool:"Voice Memos"},
    {task:"Professional phrases drill",steps:["Practice saying these phrases until they feel natural — record yourself saying each in a full sentence:","• 'The trade-off here is...' → 'The trade-off here is consistency vs availability'","• 'I would argue that...' → 'I would argue that a distributed cache is better here because...'","• 'From a performance standpoint...' → 'From a performance standpoint, Redis outperforms a DB call by 10x'","Record a 60-sec explanation of this week's caching topic using at least 2 of these phrases"],duration:"15 min",tool:"Voice Memos"},
    {task:"Mock question: Why Europe?",steps:["This question WILL come up. Prepare a genuine, positive answer.","Record: 'Why do you want to move to Europe and work here specifically?'","Good structure: Professional growth → European tech ecosystem → Specific country/city appeal → Long-term vision","Avoid: making it only about money or visa. Make it about growth and opportunity.","Record twice. Pick the better one. That's your answer."],duration:"20 min",tool:"Voice Memos"},
    {task:"Rest",steps:["10 min Elsa Speak only"],duration:"10 min",tool:"Elsa Speak"},
  ],
};
// Fill remaining weeks with default structure
for(const wk of ["w3","w4","w5","w6","w7","w8","w9","w10","w11","w12","w13","w14","w15","w16"]){
  DAILY_ENGLISH_DETAIL[wk]=DAY_LABELS.map((_,di)=>({
    task:["EU Accent Listening","Tech Vocabulary in Speech","Structured Answer Practice","STAR Story Recording","Professional Phrases Drill","Mock Interview Practice","Rest"][di],
    steps:di===6?["10 min Elsa Speak only — light session"]:["Open your voice memo app","Record 60 seconds on today's tech topic in plain English","Play it back — note 1 thing to improve","Record once more with that improvement","End with Elsa Speak for 5 min"],
    duration:di===6?"10 min":"15–20 min",
    tool:di===6?"Elsa Speak":"Voice Memos + Elsa Speak",
  }));
}

const STAR_STORIES=["Biggest technical challenge you faced","Conflict with a colleague — how you resolved it","Time you failed or made a mistake","Led a project without being the manager","When you disagreed with a technical decision","Had to learn something very quickly under pressure","You improved a process or system proactively","Working across teams or with non-engineers"];

const defaultState=()=>{
  const checks={};
  TOPICS.forEach(t=>t.subtopics.forEach(s=>s.items.forEach((_,i)=>{checks[`${s.id}-${i}`]=false;})));
  const weeks={};
  WEEKS.forEach(w=>{weeks[w.id]={};for(let d=0;d<7;d++)weeks[w.id][d]={tech:false,english:false};});
  const stars={};
  STAR_STORIES.forEach((_,i)=>{stars[i]={written:false,recorded:false};});
  return{checks,weeks,apps:{},stars,journalEntries:[],jobs:[],jobsFetchedAt:null};
};

// ── Confetti ──────────────────────────────────────────────────────────────────
function fireConfetti(x,y){
  const colors=["#7C6FCD","#22C55E","#F59E0B","#EF4444","#E8E6F8","#1E1B3A"];
  for(let i=0;i<40;i++){
    const el=document.createElement("div");
    const size=Math.random()*8+4;
    el.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?"50%":"2px"};pointer-events:none;z-index:9999;`;
    document.body.appendChild(el);
    const angle=Math.random()*Math.PI*2;
    const speed=Math.random()*300+100;
    const dx=Math.cos(angle)*speed;
    const dy=Math.sin(angle)*speed-200;
    let start=null;
    const dur=800+Math.random()*400;
    const animate=ts=>{
      if(!start)start=ts;
      const p=(ts-start)/dur;
      if(p>=1){el.remove();return;}
      const ease=1-Math.pow(p,2);
      el.style.transform=`translate(${dx*p}px,${dy*p+200*p*p}px) rotate(${p*720}deg)`;
      el.style.opacity=String(1-p);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

// ── Animated Checkbox ─────────────────────────────────────────────────────────
function AnimCheckbox({checked,onChange,color="#7C6FCD",size=18,onConfetti}){
  const [anim,setAnim]=useState(false);
  const ref=useRef(null);
  const handle=()=>{
    setAnim(true);
    setTimeout(()=>setAnim(false),400);
    if(!checked&&onConfetti&&ref.current){
      const r=ref.current.getBoundingClientRect();
      onConfetti(r.left+r.width/2,r.top+r.height/2);
    }
    onChange();
  };
  return(
    <button ref={ref} onClick={e=>{e.stopPropagation();handle();}} style={{
      width:size,height:size,minWidth:size,borderRadius:4,padding:0,cursor:"pointer",border:"none",
      background:checked?color:"transparent",
      outline:`2px solid ${checked?color:"rgba(124,111,205,0.4)"}`,outlineOffset:0,
      display:"flex",alignItems:"center",justifyContent:"center",
      transform:anim?(checked?"scale(1.3)":"scale(0.85)"):"scale(1)",
      transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease, outline 0.2s ease",
      flexShrink:0,
    }}>
      {checked&&(
        <svg width={size-6} height={size-6} viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{strokeDasharray:14,strokeDashoffset:anim?14:0,transition:"stroke-dashoffset 0.3s ease"}}/>
        </svg>
      )}
    </button>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({value,size=52,color="#7C6FCD",bg="rgba(124,111,205,0.1)"}){
  const r=(size-6)/2,circ=2*Math.PI*r,dash=circ*(value/100);
  return(
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}/>
      </svg>
      <span style={{fontSize:11,fontWeight:700,color,zIndex:1}}>{value}%</span>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({value,color="#7C6FCD",height=5,bg="rgba(124,111,205,0.12)"}){
  return(
    <div style={{height,background:bg,borderRadius:height,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(100,Math.max(0,value))}%`,background:color,borderRadius:height,
        transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}/>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [dark,setDark]=useState(prefersDark);
  const [state,setState]=useState(defaultState);
  const [view,setView]=useState("dashboard");
  const [prevView,setPrevView]=useState("dashboard");
  const [slideDir,setSlideDir]=useState(1);
  const [activePhase,setActivePhase]=useState("p1");
  const [activeWeek,setActiveWeek]=useState("w1");
  const [activeTopic,setActiveTopic]=useState("t1");
  const [expandedDay,setExpandedDay]=useState(null);
  const [expandedEnglish,setExpandedEnglish]=useState(null);
  const [journalText,setJournalText]=useState("");
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [jobsLoading,setJobsLoading]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const [animKey,setAnimKey]=useState(0);
  const saveTimer=useRef(null);

  const C=dark?DT:T;

  useEffect(()=>{
    (async()=>{
      try{const snap=await getDoc(doc(db,COLLECTION,DOC_ID));if(snap.exists())setState(s=>({...defaultState(),...snap.data()}));}catch(e){console.error(e);}
      setLoaded(true);
    })();
  },[]);

  const save=useCallback(async ns=>{
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{setSaving(true);try{await setDoc(doc(db,COLLECTION,DOC_ID),ns);}catch(e){console.error(e);}setSaving(false);},800);
  },[]);

  const update=useCallback(fn=>{setState(prev=>{const next=fn(prev);save(next);return next;});},[save]);

  const navigate=(v)=>{
    const ORDER=["dashboard","log","topics","jobs","english","journal","more"];
    const from=ORDER.indexOf(view),to=ORDER.indexOf(v);
    setSlideDir(to>=from?1:-1);
    setPrevView(view);
    setAnimKey(k=>k+1);
    setView(v);
    setMoreOpen(false);
  };

  const toggleCheck=key=>{
    const wasFirst=Object.values(state.checks).filter(Boolean).length===0;
    update(s=>{
      const next={...s,checks:{...s.checks,[key]:!s.checks[key]}};
      return next;
    });
    if(wasFirst){
      const el=document.getElementById("root")||document.body;
      const r=el.getBoundingClientRect();
      fireConfetti(r.width/2,r.height/2);
    }
  };

  const toggleDay=(wk,di,field,confettiCb)=>update(s=>{
    const prev=s.weeks[wk]?.[di]||{tech:false,english:false};
    const next={...prev,[field]:!prev[field]};
    const newWeeks={...s,weeks:{...s.weeks,[wk]:{...s.weeks[wk],[di]:next}}};
    // Check if day just became complete (tech ticked = done)
    if(field==="tech"&&!prev.tech&&confettiCb){
      setTimeout(()=>confettiCb(),100);
    }
    return newWeeks;
  });

  const toggleStar=(i,f)=>update(s=>({...s,stars:{...s.stars,[i]:{...s.stars[i],[f]:!s.stars[i][f]}}}));
  const setAppStatus=(id,status)=>update(s=>({...s,apps:{...s.apps,[id]:{...(s.apps[id]||{}),status}}}));
  const setAppNotes=(id,notes)=>update(s=>({...s,apps:{...s.apps,[id]:{...(s.apps[id]||{}),notes}}}));
  const addJournal=()=>{
    if(!journalText.trim())return;
    const entry={id:Date.now(),date:new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}),text:journalText.trim()};
    update(s=>({...s,journalEntries:[entry,...(s.journalEntries||[])]}));
    setJournalText("");
  };
  const deleteJournal=id=>update(s=>({...s,journalEntries:(s.journalEntries||[]).filter(e=>e.id!==id)}));

  const fetchJobs=async()=>{
    setJobsLoading(true);
    try{const r=await fetch("/api/jobs");const d=await r.json();update(s=>({...s,jobs:d.jobs||[],jobsFetchedAt:d.fetched_at}));}catch(e){console.error(e);}
    setJobsLoading(false);
  };

  const completedDays=buildCompletedSet(state.weeks,WEEKS);
  const totalChecks=Object.keys(state.checks).length;
  const doneChecks=Object.values(state.checks).filter(Boolean).length;
  const weekProg=wk=>{const d=state.weeks[wk]||{};const done=Object.values(d).reduce((a,x)=>a+(x.tech?1:0)+(x.english?1:0),0);return Math.round((done/14)*100);};
  const phaseProg=pid=>{const pw=WEEKS.filter(w=>w.phase===pid);const total=pw.length*14;const done=pw.reduce((a,w)=>a+Object.values(state.weeks[w.id]||{}).reduce((b,x)=>b+(x.tech?1:0)+(x.english?1:0),0),0);return Math.round((done/total)*100);};
  const topicProg=tid=>{const t=TOPICS.find(t=>t.id===tid);if(!t)return 0;let total=0,done=0;t.subtopics.forEach(s=>s.items.forEach((_,i)=>{total++;if(state.checks[`${s.id}-${i}`])done++;}));return total>0?Math.round((done/total)*100):0;};

  const getDaySubtopics=(weekId,dayIdx)=>{
    const mapVal=DAY_TOPIC_MAP[weekId]?.[dayIdx];
    if(!mapVal)return[];
    return mapVal.split(",").flatMap(subId=>{
      const topic=TOPICS.find(t=>t.subtopics.some(s=>s.id===subId.trim()));
      const sub=topic?.subtopics.find(s=>s.id===subId.trim());
      if(!sub)return[];
      return sub.items.map((item,i)=>({key:`${sub.id}-${i}`,label:item,color:topic.color,group:sub.group,topicLabel:topic.label}));
    });
  };

  const appStatusColor={"not-applied":C.muted,"applied":C.purple,"interview":C.amber,"offer":C.green,"rejected":C.red};
  const appStatusLabel={"not-applied":"Not Applied","applied":"Applied","interview":"Interviewing","offer":"Offer 🎉","rejected":"Rejected"};

  const ph=PHASES.find(p=>p.id===activePhase)||PHASES[0];
  const ct=TOPICS.find(t=>t.id===activeTopic)||TOPICS[0];
  const cw=WEEKS.find(w=>w.id===activeWeek)||WEEKS[0];

  const css=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
    body{margin:0;overscroll-behavior:none;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:rgba(124,111,205,0.3);border-radius:4px;}
    .spring-btn{transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);}
    .spring-btn:active{transform:scale(0.92)!important;}
    .slide-in{animation:slideIn 0.35s cubic-bezier(0.25,0.46,0.45,0.94) forwards;}
    @keyframes slideIn{from{opacity:0;transform:translateX(${slideDir*32}px)}to{opacity:1;transform:translateX(0)}}
    .fade-in{animation:fadeIn 0.25s ease forwards;}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .accordion-enter{animation:accordionOpen 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;}
    @keyframes accordionOpen{from{opacity:0;transform:scaleY(0.8);transform-origin:top}to{opacity:1;transform:scaleY(1);transform-origin:top}}
    input,textarea,select{font-family:inherit;}
    @media(max-width:768px){.desktop-only{display:none!important;}.mobile-show{display:flex!important;}}
    @media(min-width:769px){.mobile-only{display:none!important;}}
  `;

  const NAV_MOBILE=[
    {id:"dashboard",icon:"⊞",label:"Home"},
    {id:"log",icon:"📅",label:"Log"},
    {id:"topics",icon:"📚",label:"Topics"},
    {id:"jobs",icon:"💼",label:"Jobs"},
    {id:"more",icon:"•••",label:"More"},
  ];
  const NAV_DESKTOP=[
    {id:"dashboard",icon:"⊞",label:"Dashboard"},
    {id:"log",icon:"📅",label:"Daily Log"},
    {id:"topics",icon:"📚",label:"Topics"},
    {id:"jobs",icon:"💼",label:"Jobs"},
    {id:"english",icon:"🗣",label:"English"},
    {id:"journal",icon:"✏️",label:"Journal"},
  ];
  const MORE_ITEMS=[
    {id:"english",icon:"🗣",label:"English"},
    {id:"journal",icon:"✏️",label:"Journal"},
  ];

  if(!loaded)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.cream}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,border:`3px solid ${C.purpleLight}`,borderTop:`3px solid ${C.purple}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{fontSize:15,fontWeight:600,color:C.ink}}>Loading your tracker…</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>Syncing from Firebase</div>
      </div>
    </div>
  );

  // Shared card style
  const card=(extra={})=>({background:C.white,borderRadius:16,border:`1px solid ${C.border}`,padding:"18px 20px",...extra});
  const navCard=(extra={})=>({background:dark?C.navyMid:C.cream,borderRadius:12,border:`1px solid ${C.border}`,...extra});

  const weekIdx=WEEKS.findIndex(w=>w.id===activeWeek);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:C.cream,color:C.ink,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflow:"hidden"}}>
      <style>{css}</style>

      {/* ── Top header ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:C.white,borderBottom:`1px solid ${C.border}`,flexShrink:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:C.purple,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontSize:14,fontWeight:800}}>EU</span>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.ink}}>Switch Tracker</div>
            <div style={{fontSize:10,color:C.muted}}>{saving?"⟳ Saving…":"✓ Synced"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:11,color:C.muted,background:C.purpleLight,padding:"3px 10px",borderRadius:20,fontWeight:500}}>
            {Math.round((doneChecks/totalChecks)*100)}% overall
          </div>
          <button className="spring-btn" onClick={()=>setDark(d=>!d)} style={{
            width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,
            background:C.purpleLight,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            {dark?"☀️":"🌙"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Desktop sidebar ── */}
        <div className="desktop-only" style={{display:"flex",width:220,flexShrink:0,borderRight:`1px solid ${C.border}`,background:C.white}}>
          {/* Icon rail */}
          <div style={{width:52,background:C.navy,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 0",gap:4}}>
            {NAV_DESKTOP.map(n=>(
              <button key={n.id} className="spring-btn" onClick={()=>navigate(n.id)} style={{
                width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",
                background:view===n.id?"rgba(124,111,205,0.3)":"transparent",
                fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                transition:"background 0.2s ease",
              }} title={n.label}>
                <span>{n.icon}</span>
              </button>
            ))}
          </div>

          {/* Secondary sidebar */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?C.navyMid:C.cream}}>
            {/* Phase tabs */}
            <div style={{padding:"12px 10px 8px",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Phases</div>
              {PHASES.map(p=>(
                <button key={p.id} className="spring-btn" onClick={()=>{setActivePhase(p.id);setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");}} style={{
                  width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:8,border:"none",
                  background:activePhase===p.id?`${p.color}18`:"transparent",
                  cursor:"pointer",marginBottom:2,textAlign:"left",
                  borderLeft:activePhase===p.id?`3px solid ${p.color}`:"3px solid transparent",
                  transition:"all 0.2s ease",
                }}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:11,fontWeight:activePhase===p.id?600:400,color:activePhase===p.id?p.color:C.inkMid}}>{p.label}</div>
                    <div style={{fontSize:9,color:C.muted}}>{p.weeks}</div>
                  </div>
                  <div style={{marginLeft:"auto",fontSize:10,fontWeight:600,color:p.color}}>{phaseProg(p.id)}%</div>
                </button>
              ))}
            </div>
            {/* Week list — only current phase */}
            <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>
              <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Weeks</div>
              {WEEKS.filter(w=>w.phase===activePhase).map(w=>(
                <button key={w.id} className="spring-btn" onClick={()=>setActiveWeek(w.id)} style={{
                  width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:8,
                  border:"none",background:activeWeek===w.id?`${ph.color}12`:"transparent",
                  cursor:"pointer",marginBottom:2,textAlign:"left",transition:"all 0.2s ease",
                  borderLeft:activeWeek===w.id?`3px solid ${ph.color}`:"3px solid transparent",
                }}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:activeWeek===w.id?600:400,color:activeWeek===w.id?ph.color:C.inkMid}}>{w.label}</div>
                    <div style={{fontSize:9,color:C.muted,marginTop:1}}>{w.subtitle}</div>
                    <div style={{marginTop:3}}><ProgressBar value={weekProg(w.id)} color={ph.color} height={3}/></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{flex:1,overflowY:"auto",position:"relative"}}>
          <div key={animKey} className="slide-in" style={{padding:"16px",paddingBottom:80,minHeight:"100%"}}>

            {/* ════ DASHBOARD ════ */}
            {view==="dashboard"&&(()=>{
              const today=new Date();today.setHours(0,0,0,0);
              let todayIdx=null;
              for(let i=0;i<112;i++){const d=getScheduledDate(i,completedDays);d.setHours(0,0,0,0);if(d.getTime()===today.getTime()){todayIdx=i;break;}}
              const wi=todayIdx!==null?Math.floor(todayIdx/7):0;
              const di=todayIdx!==null?todayIdx%7:0;
              const week=WEEKS[wi];
              const ds=week?(state.weeks[week.id]?.[di]||{tech:false,english:false}):{tech:false,english:false};
              const phase=week?PHASES.find(p=>p.id===week.phase):PHASES[0];
              const techTask=week?DAILY_TECH[week.id]?.[di]:"Rest";
              return(
                <div>
                  <div style={{marginBottom:20}}>
                    <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.ink}}>Good evening 👋</h1>
                    <p style={{margin:"4px 0 0",fontSize:13,color:C.muted}}>Your EU switch journey — synced across all devices</p>
                  </div>

                  {/* Today card */}
                  {todayIdx!==null&&(
                    <div style={{background:C.navy,borderRadius:20,padding:20,marginBottom:18,color:"#fff",
                      boxShadow:`0 8px 32px ${C.purple}44`,transition:"all 0.3s ease"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                        <div>
                          <div style={{fontSize:10,fontWeight:700,opacity:0.6,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>
                            📍 Today · {today.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
                          </div>
                          <div style={{fontSize:19,fontWeight:800,marginBottom:2}}>Day {todayIdx+1} · {week?.label}</div>
                          <div style={{fontSize:12,opacity:0.7}}>{week?.subtitle} · {phase?.label}</div>
                        </div>
                        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"8px 14px",textAlign:"center"}}>
                          <div style={{fontSize:18,fontWeight:800}}>{ds.tech&&ds.english?"✅":"⏳"}</div>
                          <div style={{fontSize:9,opacity:0.7,marginTop:2}}>today</div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <button className="spring-btn" onClick={()=>toggleDay(week.id,di,"tech",()=>{const el=document.querySelector(".today-card");if(el){const r=el.getBoundingClientRect();fireConfetti(r.width/2,200);}})} style={{
                          background:ds.tech?"rgba(34,197,94,0.3)":"rgba(255,255,255,0.1)",
                          border:`1px solid ${ds.tech?"rgba(34,197,94,0.6)":"rgba(255,255,255,0.2)"}`,
                          borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                        }}>
                          <div style={{fontSize:10,fontWeight:700,marginBottom:4,color:ds.tech?"#4ADE80":"rgba(255,255,255,0.8)"}}>💻 Tech · 60 min {ds.tech?"✓":""}</div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",lineHeight:1.4}}>{techTask}</div>
                        </button>
                        <button className="spring-btn" onClick={()=>toggleDay(week.id,di,"english")} style={{
                          background:ds.english?"rgba(124,111,205,0.4)":"rgba(255,255,255,0.1)",
                          border:`1px solid ${ds.english?"rgba(124,111,205,0.8)":"rgba(255,255,255,0.2)"}`,
                          borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                        }}>
                          <div style={{fontSize:10,fontWeight:700,marginBottom:4,color:ds.english?C.purple:"rgba(255,255,255,0.8)"}}>🗣 English · 15–20 min {ds.english?"✓":""}</div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",lineHeight:1.4}}>Record → Listen → Redo</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Phase progress */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:18}}>
                    {PHASES.map(p=>{
                      const prog=phaseProg(p.id);
                      return(
                        <button key={p.id} className="spring-btn" onClick={()=>{setActivePhase(p.id);setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");navigate("log");}} style={{
                          ...card(),textAlign:"left",cursor:"pointer",border:`1px solid ${activePhase===p.id?p.color:C.border}`,
                          background:activePhase===p.id?`${p.color}08`:C.white,
                        }}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:p.color,marginBottom:2}}>{p.label}</div>
                              <div style={{fontSize:12,fontWeight:600,color:C.ink}}>{p.subtitle}</div>
                              <div style={{fontSize:10,color:C.muted}}>{p.weeks}</div>
                            </div>
                            <ProgressRing value={prog} size={44} color={p.color} bg={`${p.color}18`}/>
                          </div>
                          <ProgressBar value={prog} color={p.color}/>
                        </button>
                      );
                    })}
                  </div>

                  {/* Topic progress */}
                  <div style={{...card(),marginBottom:18}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:14}}>Topic Progress</div>
                    {TOPICS.map(t=>{
                      const prog=topicProg(t.id);
                      return(
                        <div key={t.id} style={{marginBottom:10,cursor:"pointer"}} onClick={()=>{setActiveTopic(t.id);navigate("topics");}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:12,fontWeight:500,color:C.ink}}>{t.label}</span>
                            <span style={{fontSize:11,fontWeight:700,color:t.color}}>{prog}%</span>
                          </div>
                          <ProgressBar value={prog} color={t.color} bg={`${t.color}15`}/>
                        </div>
                      );
                    })}
                  </div>

                  {/* STAR overview */}
                  <div style={card()}>
                    <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:12}}>STAR Stories</div>
                    {STAR_STORIES.map((s,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i<STAR_STORIES.length-1?`1px solid ${C.border}`:"none"}}>
                        <AnimCheckbox checked={!!state.stars[i]?.written} onChange={()=>toggleStar(i,"written")} color={C.purple} size={16}
                          onConfetti={(x,y)=>fireConfetti(x,y)}/>
                        <span style={{fontSize:12,color:C.ink,flex:1}}>{s}</span>
                        <AnimCheckbox checked={!!state.stars[i]?.recorded} onChange={()=>toggleStar(i,"recorded")} color={C.green} size={16}
                          onConfetti={(x,y)=>fireConfetti(x,y)}/>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                      <span style={{fontSize:10,color:C.muted}}>◀ Written</span>
                      <span style={{fontSize:10,color:C.muted}}>Recorded ▶</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ════ DAILY LOG ════ */}
            {view==="log"&&(
              <div>
                <div style={{marginBottom:16}}>
                  <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>Daily Log</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Tap any day to expand subtopics</p>
                </div>

                {/* Mobile phase + week selector */}
                <div className="mobile-show" style={{display:"none",flexDirection:"column",gap:8,marginBottom:14}}>
                  <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                    {PHASES.map(p=>(
                      <button key={p.id} className="spring-btn" onClick={()=>{setActivePhase(p.id);setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");}} style={{
                        padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",
                        background:activePhase===p.id?p.color:C.purpleLight,color:activePhase===p.id?"#fff":C.inkMid,
                        transition:"all 0.2s ease",flexShrink:0,
                      }}>{p.label}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                    {WEEKS.filter(w=>w.phase===activePhase).map(w=>(
                      <button key={w.id} className="spring-btn" onClick={()=>setActiveWeek(w.id)} style={{
                        padding:"5px 12px",borderRadius:20,border:`1px solid ${activeWeek===w.id?ph.color:C.border}`,
                        cursor:"pointer",fontSize:11,fontWeight:activeWeek===w.id?600:400,whiteSpace:"nowrap",
                        background:activeWeek===w.id?`${ph.color}12`:C.white,color:activeWeek===w.id?ph.color:C.inkMid,
                        transition:"all 0.2s ease",flexShrink:0,
                      }}>{w.label}</button>
                    ))}
                  </div>
                </div>

                {/* Week header */}
                <div style={{...card(),marginBottom:12,padding:"14px 16px",background:dark?C.navyMid:C.purplePale,border:`1px solid ${ph.color}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:ph.color,letterSpacing:"0.06em",textTransform:"uppercase"}}>{cw.label} · {ph.label}</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.ink,marginTop:2}}>{cw.subtitle}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                    <ProgressBar value={weekProg(cw.id)} color={ph.color} bg={`${ph.color}18`}/>
                    <span style={{fontSize:11,fontWeight:600,color:ph.color,whiteSpace:"nowrap"}}>{weekProg(cw.id)}%</span>
                  </div>
                </div>

                {/* Days */}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {DAY_LABELS.map((day,di)=>{
                    const isBreak=di===6;
                    const globalIdx=weekIdx*7+di;
                    const ds=state.weeks[cw.id]?.[di]||{tech:false,english:false};
                    const techTask=DAILY_TECH[cw.id]?.[di]||"Study session";
                    const engDetail=DAILY_ENGLISH_DETAIL[cw.id]?.[di];
                    const dayNum=globalIdx+1;
                    const schDate=getScheduledDate(globalIdx,completedDays);
                    const dateStr=formatDate(schDate);
                    const isDone=!isBreak&&ds.tech;
                    const status=getDayStatus(schDate,isDone,isBreak);
                    const isExpanded=expandedDay===`${cw.id}-${di}`;
                    const daySubs=getDaySubtopics(cw.id,di);
                    const subsDone=daySubs.filter(s=>state.checks[s.key]).length;

                    const statusStyle={
                      done:{bg:`${C.green}08`,left:C.green,badge:"✅",bc:C.green},
                      today:{bg:`${C.purple}08`,left:C.purple,badge:"Today",bc:C.purple},
                      overdue:{bg:`${C.amber}08`,left:C.amber,badge:"⏳ Pending",bc:C.amber},
                      upcoming:{bg:C.white,left:"transparent",badge:null,bc:null},
                      break:{bg:`${C.green}05`,left:C.green,badge:null,bc:null},
                    }[status]||{bg:C.white,left:"transparent",badge:null,bc:null};

                    return(
                      <div key={di} style={{borderRadius:14,overflow:"hidden",border:`1px solid ${status==="today"?C.purple:status==="overdue"?C.amber:C.border}`,
                        boxShadow:status==="today"?`0 2px 16px ${C.purple}22`:"none",transition:"box-shadow 0.3s ease"}}>
                        {/* Day row */}
                        <div onClick={()=>!isBreak&&setExpandedDay(isExpanded?null:`${cw.id}-${di}`)}
                          style={{display:"flex",alignItems:"flex-start",padding:"12px 14px",
                            background:statusStyle.bg,borderLeft:`3px solid ${statusStyle.left}`,
                            cursor:isBreak?"default":"pointer",transition:"background 0.2s ease"}}>
                          <div style={{width:60,flexShrink:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:status==="today"?C.purple:status==="overdue"?C.amber:C.ink}}>{day}</div>
                            <div style={{fontSize:10,color:C.muted}}>Day {dayNum}</div>
                            <div style={{fontSize:10,color:status==="today"?C.purple:status==="overdue"?C.amber:C.muted,fontWeight:status==="today"?600:400}}>{dateStr}</div>
                          </div>
                          <div style={{flex:1,marginLeft:10}}>
                            {isBreak?(
                              <div style={{fontSize:13,color:C.green,fontWeight:600}}>💚 Rest day — recharge, no tech</div>
                            ):(
                              <>
                                {statusStyle.badge&&(
                                  <span style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                                    background:`${statusStyle.bc}18`,color:statusStyle.bc,marginBottom:6}}>{statusStyle.badge}</span>
                                )}
                                <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}} onClick={e=>e.stopPropagation()}>
                                  <AnimCheckbox checked={ds.tech} onChange={()=>{
                                    const wasUndone=!ds.tech;
                                    toggleDay(cw.id,di,"tech",wasUndone?((x,y)=>fireConfetti(x,y)):null);
                                  }} color={C.purple} size={16} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                  <div><span style={{fontSize:10,fontWeight:700,color:C.purple}}>💻 TECH · </span><span style={{fontSize:12,color:C.ink}}>{techTask}</span></div>
                                </div>
                                <div style={{display:"flex",alignItems:"flex-start",gap:8}} onClick={e=>e.stopPropagation()}>
                                  <AnimCheckbox checked={ds.english} onChange={()=>toggleDay(cw.id,di,"english")} color={C.green} size={16} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                  <div><span style={{fontSize:10,fontWeight:700,color:C.green}}>🗣 ENGLISH · </span><span style={{fontSize:12,color:C.ink}}>{engDetail?.task||"15–20 min practice"}</span></div>
                                </div>
                              </>
                            )}
                          </div>
                          {!isBreak&&(
                            <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:6,flexShrink:0}}>
                              {daySubs.length>0&&(
                                <div style={{background:C.purpleLight,borderRadius:8,padding:"3px 8px",textAlign:"center"}}>
                                  <div style={{fontSize:11,fontWeight:700,color:C.purple}}>{subsDone}/{daySubs.length}</div>
                                  <div style={{fontSize:8,color:C.muted}}>topics</div>
                                </div>
                              )}
                              <span style={{fontSize:11,color:C.muted,transform:isExpanded?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>▼</span>
                            </div>
                          )}
                        </div>

                        {/* Expanded: subtopics + English detail */}
                        {isExpanded&&!isBreak&&(
                          <div className="accordion-enter" style={{background:dark?C.navyMid:`${C.purplePale}`,borderTop:`1px solid ${C.border}`,padding:"12px 14px 14px 74px"}}>

                            {/* Subtopics */}
                            {daySubs.length>0&&(
                              <div style={{marginBottom:14}}>
                                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>📚 Subtopics to cover today</div>
                                {(()=>{
                                  const groups={};
                                  daySubs.forEach(s=>{const k=`${s.topicLabel}|${s.group}`;if(!groups[k])groups[k]={topicLabel:s.topicLabel,group:s.group,color:s.color,items:[]};groups[k].items.push(s);});
                                  return Object.values(groups).map((g,gi)=>(
                                    <div key={gi} style={{marginBottom:10}}>
                                      <div style={{fontSize:10,fontWeight:700,color:g.color,marginBottom:5,display:"flex",alignItems:"center",gap:5}}>
                                        <span style={{width:3,height:12,borderRadius:2,background:g.color,display:"inline-block"}}/>
                                        {g.topicLabel} · {g.group}
                                      </div>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:3}}>
                                        {g.items.map((item,ii)=>(
                                          <div key={ii} onClick={()=>toggleCheck(item.key)}
                                            style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,cursor:"pointer",
                                              background:state.checks[item.key]?`${g.color}12`:"transparent",transition:"background 0.2s ease"}}>
                                            <AnimCheckbox checked={!!state.checks[item.key]} onChange={()=>toggleCheck(item.key)} color={g.color} size={14}
                                              onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                            <span style={{fontSize:12,color:state.checks[item.key]?C.muted:C.ink,
                                              textDecoration:state.checks[item.key]?"line-through":"none",transition:"all 0.2s ease"}}>{item.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ));
                                })()}
                                <div style={{fontSize:10,color:C.muted,fontStyle:"italic",marginTop:6}}>✨ These sync to your Topics section automatically</div>
                              </div>
                            )}

                            {/* English detail */}
                            {engDetail&&(
                              <div>
                                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>🗣 English Practice — Exact Steps</div>
                                <div style={{background:`${C.green}10`,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.green}25`}}>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                    <div style={{fontSize:12,fontWeight:700,color:C.ink}}>{engDetail.task}</div>
                                    <span style={{fontSize:10,background:`${C.green}20`,color:C.green,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{engDetail.duration}</span>
                                  </div>
                                  <div style={{fontSize:10,color:C.muted,marginBottom:8}}>Tool: {engDetail.tool}</div>
                                  {engDetail.steps.map((step,si)=>(
                                    <div key={si} style={{display:"flex",gap:8,marginBottom:5}}>
                                      <span style={{fontSize:10,fontWeight:700,color:C.green,minWidth:16,textAlign:"center"}}>{si+1}.</span>
                                      <span style={{fontSize:12,color:C.ink,lineHeight:1.4}}>{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {daySubs.length===0&&!engDetail&&(
                              <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>Review / application day — use Topics section to tick what you cover.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════ TOPICS ════ */}
            {view==="topics"&&(
              <div>
                <div style={{marginBottom:16}}>
                  <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>Topic Checklist</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Also tickable from Daily Log · {doneChecks}/{totalChecks} done</p>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                  {TOPICS.map(t=>(
                    <button key={t.id} className="spring-btn" onClick={()=>setActiveTopic(t.id)} style={{
                      padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
                      background:activeTopic===t.id?t.color:`${t.color}15`,color:activeTopic===t.id?"#fff":t.color,
                      transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                    }}>{t.label} · {topicProg(t.id)}%</button>
                  ))}
                </div>
                <div style={card()}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:C.ink}}>{ct.label}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:2}}>{topicProg(ct.id)}% complete</div>
                    </div>
                    <ProgressRing value={topicProg(ct.id)} size={52} color={ct.color} bg={`${ct.color}18`}/>
                  </div>
                  {ct.subtopics.map(sub=>{
                    const subDone=sub.items.filter((_,i)=>state.checks[`${sub.id}-${i}`]).length;
                    return(
                      <div key={sub.id} style={{marginBottom:18}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <span style={{width:3,height:16,borderRadius:2,background:ct.color,display:"inline-block"}}/>
                            <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{sub.group}</span>
                          </div>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${ct.color}15`,color:ct.color}}>{subDone}/{sub.items.length}</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:4}}>
                          {sub.items.map((item,i)=>{
                            const key=`${sub.id}-${i}`;
                            return(
                              <div key={i} onClick={()=>toggleCheck(key)}
                                style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,cursor:"pointer",
                                  background:state.checks[key]?`${ct.color}10`:"transparent",transition:"background 0.2s ease"}}
                                onMouseEnter={e=>{if(!state.checks[key])e.currentTarget.style.background=`${ct.color}08`;}}
                                onMouseLeave={e=>{e.currentTarget.style.background=state.checks[key]?`${ct.color}10`:"transparent";}}>
                                <AnimCheckbox checked={!!state.checks[key]} onChange={()=>toggleCheck(key)} color={ct.color} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                <span style={{fontSize:12,color:state.checks[key]?C.muted:C.ink,textDecoration:state.checks[key]?"line-through":"none",transition:"all 0.2s ease"}}>{item}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════ JOBS ════ */}
            {view==="jobs"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                  <div>
                    <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>EU Java Jobs</h1>
                    <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Live listings · visa sponsorship + relocation</p>
                  </div>
                  <button className="spring-btn" onClick={fetchJobs} disabled={jobsLoading} style={{
                    padding:"8px 16px",borderRadius:12,border:"none",cursor:jobsLoading?"not-allowed":"pointer",
                    background:jobsLoading?C.purpleLight:C.purple,color:jobsLoading?C.muted:"#fff",
                    fontSize:12,fontWeight:700,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  }}>{jobsLoading?"⟳ Fetching…":"🔄 Refresh"}</button>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                  {Object.entries(appStatusLabel).map(([status,label])=>{
                    const count=Object.values(state.apps).filter(a=>a.status===status).length;
                    return(
                      <div key={status} style={{...card(),padding:"8px 14px",textAlign:"center",minWidth:70,flex:"none"}}>
                        <div style={{fontSize:18,fontWeight:800,color:appStatusColor[status]}}>{count}</div>
                        <div style={{fontSize:9,color:C.muted,marginTop:1}}>{label}</div>
                      </div>
                    );
                  })}
                </div>
                {(state.jobs||[]).length===0&&!jobsLoading&&(
                  <div style={{...card(),textAlign:"center",padding:40}}>
                    <div style={{fontSize:36,marginBottom:10}}>💼</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.ink,marginBottom:6}}>No jobs loaded yet</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Click Refresh to fetch latest EU Java roles</div>
                    <button className="spring-btn" onClick={fetchJobs} style={{padding:"10px 24px",borderRadius:12,border:"none",cursor:"pointer",background:C.purple,color:"#fff",fontSize:13,fontWeight:700}}>Fetch Jobs Now</button>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                  {(state.jobs||[]).map((job,ji)=>{
                    const appState=state.apps[job.id]||{status:"not-applied",notes:""};
                    return(
                      <div key={job.id||ji} className="spring-btn" style={{...card(),cursor:"default"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{flex:1,marginRight:8}}>
                            <div style={{fontSize:13,fontWeight:700,color:C.ink,lineHeight:1.3,marginBottom:2}}>{job.title}</div>
                            <div style={{fontSize:11,fontWeight:600,color:C.purple}}>{job.company}</div>
                            <div style={{fontSize:10,color:C.muted,marginTop:1}}>📍 {job.location}</div>
                          </div>
                          <div style={{width:10,height:10,borderRadius:"50%",background:appStatusColor[appState.status],flexShrink:0,marginTop:4}}/>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                          {job.visa&&<span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:20,background:`${C.green}15`,color:C.green}}>✈️ Visa</span>}
                          {(job.tags||[]).slice(0,4).map((t,i)=><span key={i} style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:20,background:C.purpleLight,color:C.purple}}>{t}</span>)}
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                          {Object.entries(appStatusLabel).map(([status,label])=>(
                            <button key={status} className="spring-btn" onClick={()=>setAppStatus(job.id,status)} style={{
                              padding:"2px 7px",borderRadius:20,border:`1px solid ${appState.status===status?appStatusColor[status]:C.border}`,
                              cursor:"pointer",fontSize:9,fontWeight:600,
                              background:appState.status===status?`${appStatusColor[status]}15`:"transparent",
                              color:appState.status===status?appStatusColor[status]:C.muted,transition:"all 0.2s ease",
                            }}>{label}</button>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <input value={appState.notes||""} onChange={e=>setAppNotes(job.id,e.target.value)}
                            placeholder="Notes…" style={{flex:1,fontSize:11,color:C.ink,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",background:C.cream,outline:"none"}}/>
                          {job.url&&<a href={job.url} target="_blank" rel="noreferrer" style={{padding:"4px 10px",borderRadius:8,background:C.purple,color:"#fff",fontSize:10,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>Apply →</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════ ENGLISH ════ */}
            {view==="english"&&(
              <div>
                <div style={{marginBottom:16}}>
                  <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>English Practice</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>15–20 min every evening · Level 5–6 → Target 7.5+</p>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12,marginBottom:16}}>
                  {[
                    {month:"Month 1",color:C.purple,focus:"Clarity + Pacing",habit:"Record → Listen → Redo. Speak 30% slower."},
                    {month:"Month 2",color:C.green, focus:"Tech Vocab in Speech",habit:"3 tech terms/day in full sentences aloud."},
                    {month:"Month 3",color:C.amber, focus:"Interview Structures",habit:"Answer 1 mock Q aloud in STAR format daily."},
                    {month:"Month 4",color:C.red,   focus:"EU Accent + Polish",habit:"Shadow EU English YouTube speakers 3 min/day."},
                  ].map((m,i)=>(
                    <div key={i} style={{...card(),borderTop:`3px solid ${m.color}`,background:dark?C.navyMid:C.white}}>
                      <div style={{fontSize:9,fontWeight:800,color:m.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{m.month}</div>
                      <div style={{fontSize:14,fontWeight:800,color:C.ink,marginBottom:6}}>{m.focus}</div>
                      <div style={{fontSize:12,color:C.inkMid,lineHeight:1.5}}>{m.habit}</div>
                    </div>
                  ))}
                </div>
                <div style={{...card(),background:dark?C.navyMid:`${C.purple}08`,border:`1px solid ${C.purple}25`,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.purple,marginBottom:6}}>🎙 The Single Most Effective Habit</div>
                  <div style={{fontSize:13,color:C.ink,lineHeight:1.7}}><strong>Record → Listen → Redo.</strong> 60 seconds on any topic. Play it back immediately. You will hear exactly what to fix. Redo once. Every evening for 4 months. This alone moves you from 5–6 to 7.5+.</div>
                </div>
                <div style={{...card(),marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:4}}>Today's English Practice</div>
                  <p style={{fontSize:12,color:C.muted,margin:"0 0 12px"}}>Go to Daily Log → tap today → expand to see exact step-by-step instructions</p>
                  <button className="spring-btn" onClick={()=>navigate("log")} style={{padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",background:C.purple,color:"#fff",fontSize:12,fontWeight:700}}>Go to Daily Log →</button>
                </div>
                <div style={card()}>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:12}}>STAR Stories Tracker</div>
                  {STAR_STORIES.map((story,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<STAR_STORIES.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{fontSize:11,color:C.muted,width:20,textAlign:"center",fontWeight:700}}>{i+1}</div>
                      <div style={{flex:1,fontSize:12,color:C.ink}}>{story}</div>
                      <div style={{display:"flex",gap:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <AnimCheckbox checked={!!state.stars[i]?.written} onChange={()=>toggleStar(i,"written")} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                          <span style={{fontSize:9,color:C.muted}}>Written</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <AnimCheckbox checked={!!state.stars[i]?.recorded} onChange={()=>toggleStar(i,"recorded")} color={C.green} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                          <span style={{fontSize:9,color:C.muted}}>Recorded</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════ JOURNAL ════ */}
            {view==="journal"&&(
              <div>
                <div style={{marginBottom:16}}>
                  <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>Study Journal</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Reflections, blockers, wins — synced to cloud</p>
                </div>
                <div style={{...card(),marginBottom:16}}>
                  <textarea value={journalText} onChange={e=>setJournalText(e.target.value)}
                    placeholder="What did you learn? What felt hard? Any interview feedback? Write freely…"
                    style={{width:"100%",minHeight:100,fontSize:13,color:C.ink,border:`1px solid ${C.border}`,borderRadius:10,
                      padding:12,resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box",background:C.cream}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                    <span style={{fontSize:11,color:C.muted}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</span>
                    <button className="spring-btn" onClick={addJournal} style={{padding:"8px 18px",background:C.navy,color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                  </div>
                </div>
                {(state.journalEntries||[]).length===0&&(
                  <div style={{textAlign:"center",padding:"40px 20px",color:C.muted,fontSize:13}}>
                    <div style={{fontSize:32,marginBottom:8}}>📝</div>No entries yet.
                  </div>
                )}
                {(state.journalEntries||[]).map(entry=>(
                  <div key={entry.id} style={{...card(),marginBottom:10,position:"relative"}}>
                    <div style={{fontSize:10,color:C.muted,marginBottom:6,fontWeight:600}}>{entry.date}</div>
                    <div style={{fontSize:13,color:C.ink,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{entry.text}</div>
                    <button onClick={()=>deleteJournal(entry.id)} style={{position:"absolute",top:10,right:12,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div className="mobile-only" style={{
        display:"flex",position:"fixed",bottom:0,left:0,right:0,
        background:C.white,borderTop:`1px solid ${C.border}`,
        padding:"6px 0 calc(6px + env(safe-area-inset-bottom))",zIndex:100,
        boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        {NAV_MOBILE.map(n=>{
          const isActive=n.id==="more"?moreOpen:view===n.id;
          return(
            <button key={n.id} className="spring-btn" onClick={()=>{
              if(n.id==="more"){setMoreOpen(m=>!m);}
              else{navigate(n.id);setMoreOpen(false);}
            }} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",
            }}>
              <span style={{fontSize:20,transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",transform:isActive?"scale(1.2)":"scale(1)"}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:isActive?700:400,color:isActive?C.purple:C.muted,transition:"color 0.2s ease"}}>{n.label}</span>
              {isActive&&<div style={{width:4,height:4,borderRadius:"50%",background:C.purple,marginTop:-2}}/>}
            </button>
          );
        })}
      </div>

      {/* More menu overlay */}
      {moreOpen&&(
        <div className="mobile-only" style={{
          position:"fixed",bottom:"calc(56px + env(safe-area-inset-bottom))",left:0,right:0,
          background:C.white,borderTop:`1px solid ${C.border}`,
          padding:"10px 16px",zIndex:99,boxShadow:"0 -8px 24px rgba(0,0,0,0.1)",
        }}>
          {MORE_ITEMS.map(n=>(
            <button key={n.id} className="spring-btn" onClick={()=>navigate(n.id)} style={{
              width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 8px",
              background:"transparent",border:"none",cursor:"pointer",
              borderBottom:`1px solid ${C.border}`,textAlign:"left",
            }}>
              <span style={{fontSize:22}}>{n.icon}</span>
              <span style={{fontSize:14,fontWeight:500,color:C.ink}}>{n.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
