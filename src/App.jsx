import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getScheduledDate, formatDate, getDayStatus, buildCompletedSet, START_DATE } from "./dateUtils";

const DOC_ID = "tracker-state";
const COLLECTION = "eu-switch";

// ── Themes ────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg:         "#F5F4F0",
  card:       "#FFFFFF",
  cardBorder: "rgba(124,111,205,0.12)",
  sidebar:    "#1E1B3A",
  sidebarSub: "#F8F7FC",
  ink:        "#1A1A2E",
  inkMid:     "#3D3B52",
  muted:      "#8B8AA0",
  purple:     "#7C6FCD",
  purpleL:    "#EEEDFE",
  purplePale: "#F3F1FC",
  green:      "#22C55E",
  greenL:     "#DCFCE7",
  amber:      "#F59E0B",
  amberL:     "#FEF3C7",
  red:        "#EF4444",
  redL:       "#FEE2E2",
  heatDone:   "#7C6FCD",
  heatMiss:   "#EEEDFE",
  heatBreak:  "#F1EFE8",
};
const DARK = {
  bg:         "#000000",
  card:       "#1C1C1E",
  cardBorder: "rgba(157,147,224,0.15)",
  sidebar:    "#000000",
  sidebarSub: "#1C1C1E",
  ink:        "#F2F2F7",
  inkMid:     "#AEAEB2",
  muted:      "#636366",
  purple:     "#9D8FE8",
  purpleL:    "rgba(157,143,232,0.18)",
  purplePale: "rgba(157,143,232,0.08)",
  green:      "#30D158",
  greenL:     "rgba(48,209,88,0.15)",
  amber:      "#FFD60A",
  amberL:     "rgba(255,214,10,0.15)",
  red:        "#FF453A",
  redL:       "rgba(255,69,58,0.15)",
  heatDone:   "#9D8FE8",
  heatMiss:   "#2C2C2E",
  heatBreak:  "#1C1C1E",
};

// ── Static data ───────────────────────────────────────────────────────────────
const PHASES = [
  { id:"p1", label:"Phase 1", subtitle:"System Design + Java",   weeks:"Wks 1–4",  color:"#7C6FCD", darkColor:"#9D8FE8" },
  { id:"p2", label:"Phase 2", subtitle:"Cloud + AI Integration", weeks:"Wks 5–8",  color:"#22C55E", darkColor:"#30D158" },
  { id:"p3", label:"Phase 3", subtitle:"DSA + Mock Interviews",  weeks:"Wks 9–12", color:"#F59E0B", darkColor:"#FFD60A" },
  { id:"p4", label:"Phase 4", subtitle:"Apply + Interview",      weeks:"Wks 13–16",color:"#EF4444", darkColor:"#FF453A" },
];

const TOPICS = [
  { id:"t1", phase:"p1", label:"System Design", color:"#7C6FCD", subtopics:[
    { id:"t1-1", group:"Fundamentals", items:["What is a distributed system","Latency vs throughput","Availability vs consistency","CAP theorem","PACELC theorem","SLA / SLO / SLI","Fault tolerance","SPOF"] },
    { id:"t1-2", group:"Scalability",  items:["Horizontal vs vertical scaling","Stateless vs stateful","Load balancing algorithms","Layer 4 vs Layer 7 LB","Auto-scaling","Read replicas","Database sharding","Consistent hashing"] },
    { id:"t1-3", group:"Caching",      items:["Cache hit ratio","Cache-aside pattern","Write-through cache","Write-behind cache","Read-through cache","LRU/LFU/FIFO eviction","Cache stampede","TTL strategy","Redis vs Memcached","Distributed cache","Cache invalidation"] },
    { id:"t1-4", group:"Databases",    items:["ACID properties","Isolation levels","BASE properties","SQL vs NoSQL","Indexing internals","Composite indexes","Query explain plan","N+1 problem","Connection pooling","Optimistic vs pessimistic locking","Normalisation","NoSQL types","Cassandra","MongoDB"] },
    { id:"t1-5", group:"Messaging",    items:["Why queues exist","Kafka architecture","Kafka offsets","Kafka replication","Kafka vs RabbitMQ","Dead letter queue","Event sourcing","CQRS","Outbox pattern","Idempotency"] },
    { id:"t1-6", group:"API Design",   items:["REST principles","HTTP status codes","API versioning","Cursor vs offset pagination","Rate limiting algorithms","API Gateway","GraphQL vs REST","gRPC","Idempotency keys","OpenAPI/Swagger"] },
    { id:"t1-7", group:"Resilience",   items:["Circuit breaker states","Resilience4j","Retry + backoff","Bulkhead pattern","Timeout","Fallback","Health checks","Graceful degradation"] },
    { id:"t1-8", group:"Design Cases", items:["URL shortener","Ride-sharing","WhatsApp","Payment system","Notification service","Search autocomplete","Rate limiter"] },
  ]},
  { id:"t2", phase:"p1", label:"Core Java", color:"#F59E0B", subtopics:[
    { id:"t2-1", group:"JVM",          items:["JVM architecture","Heap structure","Minor/Major/Full GC","GC algorithms","GC tuning flags","Memory leaks","GC logs","JIT compiler","Escape analysis"] },
    { id:"t2-2", group:"Concurrency",  items:["Thread lifecycle","synchronized","volatile","Happens-before","CAS internals","ReentrantLock","ReadWriteLock","Deadlock prevention","ThreadLocal","ExecutorService","CompletableFuture","ForkJoinPool","Virtual threads","Structured concurrency"] },
    { id:"t2-3", group:"Collections",  items:["HashMap internals","HashMap resize","ConcurrentHashMap","LinkedHashMap LRU","TreeMap","ArrayDeque","PriorityQueue","CopyOnWriteArrayList","BlockingQueue"] },
    { id:"t2-4", group:"Java 17–21",   items:["Records","Sealed classes","Pattern matching instanceof","Text blocks","Switch expressions","Unnamed patterns","Sequenced collections","Virtual threads Loom","String templates"] },
  ]},
  { id:"t3", phase:"p1", label:"Spring Boot 3", color:"#22C55E", subtopics:[
    { id:"t3-1", group:"Core IoC",             items:["Spring IoC","BeanFactory vs ApplicationContext","Constructor injection","Stereotype annotations","Bean scopes","Lifecycle hooks","Conditional beans","Auto-configuration"] },
    { id:"t3-2", group:"Security",             items:["Authentication vs authorisation","SecurityFilterChain","JWT flow","OAuth2 code flow","OAuth2 client credentials","CSRF","@PreAuthorize","BCrypt","CORS"] },
    { id:"t3-3", group:"Data & Transactions",  items:["JPA vs Hibernate","Entity annotations","Relationships","FetchType","@EntityGraph","@Transactional propagation","@Transactional isolation","Optimistic locking","Pageable"] },
    { id:"t3-4", group:"Cloud & Microservices",items:["Eureka","Spring Cloud Gateway","Config Server","Feign client","Resilience4j","Micrometer Tracing","Actuator","Prometheus+Grafana","Kafka+Spring"] },
    { id:"t3-5", group:"Testing",              items:["@SpringBootTest vs @WebMvcTest","MockMvc","@MockBean vs @Mock","Testcontainers","WireMock","Spring Cloud Contract","JaCoCo"] },
  ]},
  { id:"t4", phase:"p2", label:"Docker & K8s", color:"#22C55E", subtopics:[
    { id:"t4-1", group:"Docker",     items:["Container vs VM","Dockerfile","Multi-stage builds","docker-compose","Image layers","Docker networking","Volumes","Distroless images"] },
    { id:"t4-2", group:"Kubernetes", items:["Control plane","Worker nodes","Pod","Deployment","ReplicaSet","Service types","Ingress","ConfigMap","Secret","PV/PVC","Probes","HPA","Helm","kubectl"] },
  ]},
  { id:"t5", phase:"p2", label:"AI Integration", color:"#7C6FCD", subtopics:[
    { id:"t5-1", group:"LLM Fundamentals", items:["Tokens & context window","Temperature","Prompt roles","Zero/few-shot","Chain-of-thought","Hallucination","Streaming","Token cost"] },
    { id:"t5-2", group:"Spring AI",        items:["ChatClient","Prompt templates","OutputParsers","EmbeddingClient","VectorStore","RAG pipeline","Advisors","Function calling"] },
    { id:"t5-3", group:"RAG Pattern",      items:["Why RAG","Chunking","Embeddings + cosine","ANN search","Re-ranking","Hybrid search","Context management"] },
    { id:"t5-4", group:"Production AI",    items:["AI observability","Response caching","Prompt injection","Circuit breaker AI","Async AI calls","Rate limiting AI","A/B testing prompts"] },
  ]},
  { id:"t6", phase:"p3", label:"DSA Patterns", color:"#EF4444", subtopics:[
    { id:"t6-1", group:"Arrays & Strings",   items:["Two pointer opposite ends","Two pointer fast/slow","Sliding window fixed","Sliding window variable","Prefix sum","Kadane's algorithm","String manipulation"] },
    { id:"t6-2", group:"Hashing",            items:["Two Sum","Group Anagrams","Valid Anagram","Longest Consecutive","Top K Frequent"] },
    { id:"t6-3", group:"Linked Lists",       items:["Reverse iterative","Reverse recursive","Cycle detection Floyd's","Find cycle start","Merge sorted","Find middle","Remove Nth from end"] },
    { id:"t6-4", group:"Stacks & Queues",    items:["Valid Parentheses","Min Stack","Daily Temperatures","Next Greater Element","Evaluate RPN","Largest Rectangle"] },
    { id:"t6-5", group:"Trees",              items:["Inorder traversal","Preorder","Postorder","Level-order BFS","Max depth","Diameter","Validate BST","LCA","Serialize/Deserialize","Kth Smallest BST","Balanced check"] },
    { id:"t6-6", group:"Graphs",             items:["BFS shortest path","DFS cycle detection","Number of Islands","Clone Graph","Rotting Oranges","Topological sort","Union-Find","Dijkstra's"] },
    { id:"t6-7", group:"Dynamic Programming",items:["Memoisation vs tabulation","Climbing Stairs","House Robber","Coin Change","LIS","Word Break","Unique Paths","LCS","Edit Distance","Knapsack"] },
    { id:"t6-8", group:"Sorting & Search",   items:["Binary search standard","Rotated array search","Binary search on answer","Merge sort","Quick sort","Top K heap"] },
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
  w1:["Distributed Systems intro — definitions, real examples, why systems fail","CAP Theorem + PACELC theorem deep dive","SLA / SLO / SLI + Fault Tolerance + SPOF","Load Balancing algorithms + Horizontal Scaling","DB Scaling: Replication & Sharding + Consistent Hashing","REVIEW Week 1 — draw all diagrams from memory","💚 Rest day — recharge"],
  w2:["Caching Fundamentals — cache-aside, write-through + Redis data types","Cache Eviction (LRU/LFU) + Cache Stampede + Redis Cluster","Java Concurrency Pt1 — Thread lifecycle, synchronized, volatile","Java Concurrency Pt2 — ExecutorService, CompletableFuture chain","Collections Internals — HashMap, ConcurrentHashMap, PriorityQueue","REVIEW Week 2 + Mini Design (caching layer for product API)","💚 Rest day — recharge"],
  w3:["Kafka Architecture — topic, partition, offset, consumer group","Event-Driven Patterns — CQRS, Outbox, Idempotency, DLQ","Spring Boot Core — IoC, constructor injection, Bean scopes","Spring Boot — Auto-configuration, Actuator, Micrometer","Spring Security — JWT flow, OAuth2 code + client credentials","REVIEW Week 3 + Design Notification Service","💚 Rest day — recharge"],
  w4:["REST API Design — status codes, idempotency, versioning, cursor pagination","Rate Limiting (token bucket, sliding window) + Spring Cloud Gateway","Resilience — Circuit Breaker, Retry with backoff, Bulkhead, Timeout","Spring Transactions + JPA — @Transactional, N+1 fix, @EntityGraph","Java 21 — Virtual threads, Records, Sealed classes, Pattern matching","FULL MONTH 1 REVIEW — redesign ride-sharing backend from memory","💚 Rest day — recharge"],
  w5:["Docker — Dockerfile, multi-stage build, docker build/run commands","Docker Networking + Compose — bridge networks, multi-service app","Kubernetes Architecture — control plane, worker nodes, Pod/Deployment","K8s Services + Ingress + ConfigMap + Secret + Namespace","K8s Probes + HPA + Resource limits + Helm chart structure","REVIEW Week 5 + write K8s Deployment YAML from memory","💚 Rest day — recharge"],
  w6:["AWS Core — IAM, EC2, S3, RDS (multi-AZ, read replicas), SQS","AWS Networking + ECS Fargate — VPC, security groups, task definition","GitHub Actions CI/CD — workflow YAML, build Spring Boot, push to ECR","Observability — structured logging, Prometheus, Grafana, Zipkin tracing","Spring Cloud — Eureka, Gateway routing, Config Server, Micrometer Tracing","REVIEW Week 6 + Draw 3-tier cloud architecture from memory","💚 Rest day — recharge"],
  w7:["LLM Fundamentals — tokens, context window, temperature, prompt roles","Spring AI — ChatClient, Prompt templates, BeanOutputParser","RAG Pipeline — chunk, embed, store (pgvector), retrieve, augment, generate","Function Calling + AI Observability + prompt injection defence","Portfolio BUILD — Spring Boot 3 + Spring AI + Kafka + Redis + GitHub","REVIEW Week 7 + add Actuator + Prometheus metrics to portfolio","💚 Rest day — recharge"],
  w8:["System Design: WhatsApp — Cassandra, WebSocket, Kafka fan-out","System Design: Payment System — idempotency key, Saga pattern","System Design: Notification Service — Kafka, DLQ, fan-out, preference","Consistency deep dive — Saga patterns, distributed lock (Redis)","Full design practice: Search Autocomplete — 45 min timed","FULL MONTH 2 REVIEW — portfolio deploy to AWS + CV first draft","💚 Rest day — recharge"],
  w9:["Arrays: Two Pointer + Sliding Window — 3 NeetCode problems","Hashing — Two Sum, Group Anagrams, Top K Frequent Elements","Linked Lists — Reverse, Floyd's cycle, Merge sorted, Find middle","Stacks + Monotonic Stack — Valid Parens, Min Stack, Daily Temps","Binary Search — standard, rotated array, binary search on answer","REVIEW Week 9 — 3 mixed timed problems (15 min each, no hints)","💚 Rest day — recharge"],
  w10:["Binary Trees Pt1 — all traversals iterative + recursive, Level-order BFS","Binary Trees Pt2 — Validate BST, LCA, Serialize/Deserialize","Graphs Pt1 — BFS shortest path, DFS, Number of Islands, Rotting Oranges","Graphs Pt2 — Topological sort (Kahn's), Union-Find, Dijkstra's","DP 1D — Climbing Stairs, House Robber, Coin Change, LIS","REVIEW Week 10 — 3 mixed (1 tree + 1 graph + 1 DP)","💚 Rest day — recharge"],
  w11:["Heap + Intervals — Kth Largest, Median from Stream, Meeting Rooms II","2D DP + String DP — Unique Paths, LCS, Edit Distance, Word Break","Behavioural Prep Pt1 — Write STAR Stories 1–4 + record each","Behavioural Prep Pt2 — Write STAR Stories 5–8 + record each","Mock Technical Interview — 1 LeetCode medium (timed) + 1 system design","REVIEW + CV finalise + Pramp.com mock interview session","💚 Rest day — recharge"],
  w12:["Full System Design Revision — 4 systems, 10 min each from memory","Java + Spring Boot Revision — GC, CompletableFuture, @Transactional","AI Integration Revision — RAG pipeline, function calling, observability","DSA Final — 5 mixed problems (15 min each, strict timer)","Cover Letter + Applications — 5 companies applied today","FULL MONTH 3 REVIEW + Go/No-Go checklist + 5 more applications","💚 Rest day — recharge"],
  w13:["Coding screen prep — 2 easy + 1 medium LeetCode daily warm-up","System Design round prep — opening structure, practice talking while drawing","Apply + Referrals — total 15 applications + 3 LinkedIn outreach messages","Questions to Ask Interviewers — prepare 5 smart, specific questions","Salary Negotiation Prep — levels.fyi research, 'never give number first'","REVIEW + Mid-Application Calibration — response rate + adjust strategy","💚 Rest day — recharge"],
  w14:["2 LeetCode mediums + Interview Debrief log — what was asked, gaps","Research company engineering blogs — prepare 1 specific question each","System Design + Java stay-sharp — 1 full design (30 min) + revision","Apply + Follow-up — 5 more apps (total 25+), follow up on 7+ day silences","Final-Round Prep: Architecture Interview — defend decisions calmly","REVIEW + Application Status Check — prioritise final-round companies","💚 Rest day — recharge"],
  w15:["Full 90-min Mock — 45 min design + 30 min coding + 15 min behavioural","Java 21 + Spring Boot 3 Final — virtual threads, jakarta namespace","Offer Evaluation Framework — base, bonus, equity, relocation, notice period","Visa Action Items — apostille checklist, immigration contact, relocation plan","Keep Applying — never stop until an offer is signed","Final Review + Go/No-Go checklist + portfolio public URL confirmed","💚 Rest day — recharge"],
  w16:["Interview remaining pipeline — trust the preparation, execute confidently","Compare Offers — score on salary 30%, growth 25%, relocation 20%, tech 15%","Resignation Planning — professional letter, notice negotiation, PF/tax","Post-Arrival Plan — local JUG, engineering all-hands visibility from Day 1","Keep Applying until signed offer in hand","🎉 Done. 110 days. One direction. One result.","💚 Rest day — celebrate"],
};

const DAILY_ENG={
  w1:["Elsa Speak setup (10 min). Then record yourself: 'What is a distributed system?' in 2 sentences. Play back. Note muffled words. Record again.","Read any tech paragraph aloud slowly — pause 1 full second at every full stop. Then record 60 sec explaining CAP theorem to a friend.","Say these aloud 5x each: 'scalability', 'fault tolerance', 'availability'. Then Elsa Speak 10 min pronunciation drill.","YouTube: watch 10 min tech talk WITHOUT subtitles. Write 3 words you missed. Look them up. Say them aloud.","Record your 90-sec 'Tell me about yourself' for a EU interview. Listen back. Does it flow? Redo once.","Record your 2-min mock interview introduction — no notes. Listen. Compare to yesterday. What improved?","10 min Elsa Speak only — light session, no pressure."],
  w2:["New words aloud 3x each: 'cache miss', 'eviction policy', 'TTL'. Record 60 sec explaining cache-aside to a non-engineer.","YouTube: 'How Redis works' Fireship (7 min). Watch WITHOUT subtitles. Note unfamiliar words. Say them aloud.","Record 60 sec: 'What is a thread and why do apps use multiple threads?' Simple language — imagine explaining to your PM.","STAR story: pick a real technical challenge. Write keyword bullets for S/T/A/R. Record 90-sec answer. Listen. Was Action detailed enough?","Professional phrases drill: say in a full sentence — 'The trade-off here is…', 'I would argue that…', 'From a performance standpoint…'","Mock Q: 'Why do you want to move to Europe?' Record 90 sec. Good structure: growth → ecosystem → long-term vision. No money talk.","10 min Elsa Speak — focus on word-ending consonants."],
  w3:["EU accent: search YouTube 'Dutch engineer English interview'. Watch 8 min. Write 2 observations about how it sounds different.","New words aloud: 'idempotent', 'eventual consistency', 'event-driven'. Record 60 sec on event sourcing.","Record 60 sec: 'Explain dependency injection to a non-technical person.' Use an analogy — what does it remind you of?","Lex Fridman Podcast: 10 min of any episode. Note how he pauses deliberately before answering. Try it yourself.","Record: 'How does JWT authentication work?' in plain English — no jargon first, then add technical terms. 60 sec.","STAR story: 'Tell me about a time you improved a process.' Record 90 sec. Result must be measurable — add a number.","10 min Elsa Speak only."],
  w4:["Record 60 sec: 'How would you design a REST API?' Keep it structured: first the principles, then the specifics.","EU accent: Estonian/Dutch YouTube speaker 8 min. Note 2 specific sounds that differ from Indian English.","Record 60 sec: 'What is a circuit breaker and why does every microservice need one?' No notes allowed.","STAR story: 'Describe a complex database or transaction challenge.' S/T/A/R — 90 sec — measurable result required.","2-min fluency drill: set a timer and talk about everything you've learned this month. Do NOT stop. Record it.","Full mock Q&A: record answers to — intro, tech challenge, why Europe, biggest strength. Listen to all four back-to-back.","Rest. Optional: light English podcast while walking."],
  w5:["New words aloud: 'containerisation', 'orchestration', 'pod scheduling'. Elsa Speak 10 min after.","Record 60 sec: 'Why should a company use Docker?' Use an analogy first, then the technical reason.","Record 60 sec: 'What is Kubernetes?' Start with the problem it solves, then what it does. No jargon in first 30 sec.","TED Talk: watch 10 min without subtitles. What % did you catch? Write it down. Watch again with subtitles. Note the gap.","Record: 'What is the difference between a liveness probe and a readiness probe, and what happens when each fails?'","Mock Q: 'Where do you see yourself in 3 years after moving to Europe?' Record 90 sec. Be specific about growth, not role titles.","10 min Elsa Speak."],
  w6:["AWS vocabulary drill — say in full sentences: 'high availability', 'elasticity', 'fault tolerant', 'multi-AZ'.","Record 60 sec: 'Explain EC2 vs ECS to someone who has never used cloud services.' Lead with an analogy.","Write a draft LinkedIn post (don't publish): 'What I learned about AWS this week.' Read it aloud. Does it sound like you?","Lex Fridman: 10 min. How does he handle a question he needs to think about? Note his exact approach.","STAR: 'Tell me about a time you improved a CI/CD process or deployment.' Record 90 sec with measurable result.","Mock Q: 'Why do you want to work at [company]?' Research their engineering blog first. Mention one real thing. Record 90 sec.","Rest. Light podcast in English."],
  w7:["New words aloud: 'hallucination', 'embedding', 'context window', 'inference'. Say in full sentences.","Record 90 sec: 'Why is AI integration an important skill for Java backend developers in 2026?' Be specific, not generic.","Listen to a Booking.com or Klarna engineering talk for 8 min. No subtitles. Note 2 unfamiliar vocab words.","STAR: 'Tell me about a project where you integrated a new technology.' Record 90 sec — the Action section needs the most detail.","Record 90 sec: describe your portfolio project as if introducing it in a tech interview. What it does, why you built it, what's hard about it.","Practice: 1) Read a tech blog paragraph aloud slowly. 2) Record 60-sec RAG explanation. 3) Shadow 1 min of a YouTube presenter.","Rest."],
  w8:["Review all Month 2 vocabulary. Find your 5 weakest words. Say each in 2 different sentences. Elsa Speak 10 min.","Record 90 sec: 'Why is building a payment system significantly harder than a standard CRUD API?' Be precise.","EU engineering talk: 10 min no subtitles. Write a 2-sentence summary of what you understood.","Mock behavioural: 'How do you deal with ambiguity or incomplete requirements?' Record 90 sec. Show initiative, not frustration.","60-sec elevator pitches — record each separately: 1) What is Kafka? 2) What is Docker? 3) What is RAG?","Full 20-min English practice: mock Q recording + Kurzgesagt shadowing 3 min + Elsa Speak 10 min.","Rest."],
  w9:["Record 60 sec: 'What is the sliding window technique and when do you use it instead of brute force?'","Elsa Speak 10 min. Then record: 'How do you approach a coding problem you've never seen before?' Show your process.","Lex Fridman 10 min: notice how he pauses before every answer — deliberate, confident. Try this in your next recording.","Record 60 sec: 'What is a stack and give me a real production example of when you'd use one?'","STAR: 'Tell me about a time you used a complex algorithm or data structure in a real project.' Record 90 sec.","Mock Q: 'What is your experience with algorithms and data structures in your current role?' Record 90 sec. Be honest + positive.","10 min Elsa Speak."],
  w10:["Record 60 sec: 'Explain the difference between BFS and DFS when traversing a tree.' When would you use each?","EU accent: Dutch or Estonian engineer speaking English on YouTube — 8 min. Note specific sounds and patterns.","Record 60 sec: Walk through your 'Number of Islands' solution step by step, as if in a live coding interview.","STAR: 'Describe the most technically complex problem you solved at work.' Record 90 sec — this is a top interview question.","2-min fluency: explain dynamic programming without stopping. Don't worry about mistakes. Just don't stop. Record.","Mock Q: 'How do you balance writing clean, maintainable code with meeting tight deadlines?' Record 90 sec.","Rest."],
  w11:["Elsa Speak 10 min. Then drill your weakest vocabulary from this entire week's technical content.","Record 60 sec: 'Explain dynamic programming to a junior developer who has never heard of it.' Use a real analogy.","Record STAR Stories 1 and 2 back to back — no notes, just keywords. Listen back. Fix the one that rambled. Record again.","Record STAR Stories 5 and 8. Listen critically — is your Action section specific? Does your Result have a number?","Stamina drill: all 8 STAR stories back-to-back from memory. No stopping. This simulates a real final-round interview.","'Tell me about yourself' — final polished version. Record. This is the first thing you say in every interview. Make it excellent.","Rest."],
  w12:["Shadow exercise: Kurzgesagt YouTube 3 min — repeat every sentence exactly 2 seconds after the narrator. Daily from now.","Anki or word list test: every tech word from all 3 months. Mark any you hesitate on. Review those tonight.","Record both: 'What is your biggest technical strength?' and 'What is an area you are actively working to improve?'","Record 90 sec: 'In distributed systems, how do you choose between consistency and availability?' Show nuance, not just CAP.","Write a professional LinkedIn referral message to an Indian engineer at Booking.com or Klarna. Read it aloud. Edit for natural tone.","Full mock interview 20 min — record as your monthly benchmark. Listen afterward. This is your evidence of improvement.","Rest."],
  w13:["Elsa Speak 10 min. Then record 60 sec at full interview energy — simulate the nerves, the pace, the confidence.","Practice clarifying questions aloud until natural: 'Could you clarify what you mean by…?', 'Just to confirm…', 'Is it fair to say that…?'","Write a professional 3-line follow-up email for a company you applied to. Read it aloud. Does it sound warm, not desperate?","Record your 5 prepared 'questions for the interviewer' — practice until they sound genuinely curious, not rehearsed.","Salary negotiation phrases aloud until completely natural: 'I'd love to understand the full package before committing to a number.'","Full 25-min mock interview — record + listen. This is your weekly English benchmark.","Rest."],
  w14:["Write + read aloud a post-interview thank-you email. Specific to the conversation — mention 1 thing you discussed.","Read a paragraph from your target company's engineering blog aloud. Then explain what you read in your own words — 60 sec.","Play your oldest recording from Month 1. Then record the same question again now. The difference is real. Note it.","Record: 'Thank you for the update. I'd welcome any feedback on areas where I could have done better.' Practice the tone.","Record your 5 questions for interviewers — final version. Natural, warm, specific. No nervous filler words.","Listen to 3 recordings from different weeks. Write 2 improvements you hear in yourself. This is motivation.","Rest."],
  w15:["Shadow Kurzgesagt daily — 3 min, repeat 2 sec behind the narrator. Do this every day this week. Non-negotiable.","Record: 'I'm confident in my ability to contribute from day one because…' Say it 5 times until completely natural.","Practice: 'I'm delighted to accept. I'd like to confirm the start date and the details of the relocation package.' Warm, clear, professional.","Read a government relocation guide page for your target country aloud. Summarise it in 3 sentences. Trains formal English reading.","Final LinkedIn outreach messages — read each aloud before sending. Does it sound like you? Professional but human?","Record 3-min: 'Tell me about yourself and your journey from India to this point.' This is who you are now. Make it count.","Rest. You earned it."],
  w16:["Record 'I'm confident in my ability to…' until it feels completely natural — zero hesitation.","Practice accepting an offer: 'I'm delighted to accept. I'd like to confirm the start date of [date].' Professional + warm.","Write + read aloud your resignation letter. Warm, grateful, professional. You may need referrals from here. Leave well.","Write your 6-month English goal for life in Europe. Commit to it. The environment does the rest of the work.","Final LinkedIn messages — natural tone, genuine, specific. Read each aloud before hitting send.","Record Day 1 of your next chapter. Who are you now after 110 days?","Rest. Celebrate. You made it."],
};

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
  const cols=["#7C6FCD","#22C55E","#F59E0B","#EF4444","#9D8FE8","#FFFFFF"];
  for(let i=0;i<50;i++){
    const el=document.createElement("div");
    const sz=Math.random()*8+4;
    el.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${cols[Math.floor(Math.random()*cols.length)]};border-radius:${Math.random()>.5?"50%":"2px"};pointer-events:none;z-index:9999;`;
    document.body.appendChild(el);
    const angle=Math.random()*Math.PI*2;
    const spd=Math.random()*300+120;
    const dx=Math.cos(angle)*spd,dy=Math.sin(angle)*spd-220;
    let st=null;const dur=700+Math.random()*400;
    const run=ts=>{if(!st)st=ts;const p=(ts-st)/dur;if(p>=1){el.remove();return;}
      el.style.transform=`translate(${dx*p}px,${dy*p+220*p*p}px) rotate(${p*720}deg)`;
      el.style.opacity=String(1-p);requestAnimationFrame(run);};
    requestAnimationFrame(run);
  }
}

// ── AnimCheckbox ──────────────────────────────────────────────────────────────
function Chk({checked,onChange,color,size=18,onConfetti}){
  const [anim,setAnim]=useState(false);
  const ref=useRef(null);
  const go=()=>{
    setAnim(true);setTimeout(()=>setAnim(false),400);
    if(!checked&&onConfetti&&ref.current){const r=ref.current.getBoundingClientRect();onConfetti(r.left+r.width/2,r.top+r.height/2);}
    onChange();
  };
  return <button ref={ref} onClick={e=>{e.stopPropagation();go();}} style={{
    width:size,height:size,minWidth:size,borderRadius:4,padding:0,cursor:"pointer",border:"none",flexShrink:0,
    background:checked?color:"transparent",outline:`2px solid ${checked?color:"rgba(124,111,205,0.35)"}`,outlineOffset:0,
    display:"flex",alignItems:"center",justifyContent:"center",
    transform:anim?(checked?"scale(1.3)":"scale(0.85)"):"scale(1)",
    transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1),background 0.2s,outline 0.2s",
  }}>{checked&&<svg width={size-6} height={size-6} viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</button>;
}

// ── Progress helpers ──────────────────────────────────────────────────────────
function Ring({value,size=52,color,bg}){
  const r=(size-6)/2,circ=2*Math.PI*r,dash=circ*(value/100);
  return <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg||"rgba(124,111,205,0.15)"} strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}/>
    </svg>
    <span style={{fontSize:11,fontWeight:700,color,zIndex:1}}>{Math.round(value)}%</span>
  </div>;
}

function Bar({value,color,bg,h=5}){
  return <div style={{height:h,background:bg||"rgba(124,111,205,0.12)",borderRadius:h,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,Math.max(0,value))}%`,background:color,borderRadius:h,transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}/>
  </div>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App(){
  const prefersDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [dark,setDark]=useState(prefersDark);
  const C=dark?DARK:LIGHT;

  const [state,setState]=useState(defaultState);
  const [view,setView]=useState("dashboard");
  const [slideDir,setSlideDir]=useState(1);
  const [animKey,setAnimKey]=useState(0);
  const [activeWeek,setActiveWeek]=useState("w1");
  const [activeTopic,setActiveTopic]=useState("t1");
  const [expandedDay,setExpandedDay]=useState(null);
  const [expandedPhases,setExpandedPhases]=useState({"p1":true,"p2":false,"p3":false,"p4":false});
  const [journalText,setJournalText]=useState("");
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [jobsLoading,setJobsLoading]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const saveTimer=useRef(null);

  useEffect(()=>{
    (async()=>{
      try{const snap=await getDoc(doc(db,COLLECTION,DOC_ID));if(snap.exists())setState(s=>({...defaultState(),...snap.data()}));}catch(e){console.error(e);}
      setLoaded(true);
    })();
    const mq=window.matchMedia("(prefers-color-scheme: dark)");
    const fn=e=>setDark(e.matches);
    mq.addEventListener("change",fn);
    return()=>mq.removeEventListener("change",fn);
  },[]);

  const save=useCallback(async ns=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(async()=>{setSaving(true);try{await setDoc(doc(db,COLLECTION,DOC_ID),ns);}catch(e){}setSaving(false);},800);},[]);
  const update=useCallback(fn=>{setState(prev=>{const next=fn(prev);save(next);return next;});},[save]);

  const go=(v)=>{
    const ORDER=["dashboard","analytics","log","topics","jobs","english","journal"];
    const from=ORDER.indexOf(view),to=ORDER.indexOf(v);
    setSlideDir(to>=from?1:-1);setAnimKey(k=>k+1);setView(v);setMoreOpen(false);
  };

  const toggleCheck=key=>{
    const wasFirst=Object.values(state.checks).filter(Boolean).length===0;
    update(s=>({...s,checks:{...s.checks,[key]:!s.checks[key]}}));
    if(wasFirst){fireConfetti(window.innerWidth/2,window.innerHeight/2);}
  };
  const toggleDay=(wk,di,field,confettiCb)=>update(s=>{
    const prev=s.weeks[wk]?.[di]||{tech:false,english:false};
    const next={...prev,[field]:!prev[field]};
    if(field==="tech"&&!prev.tech&&confettiCb)setTimeout(()=>confettiCb(),100);
    return{...s,weeks:{...s.weeks,[wk]:{...s.weeks[wk],[di]:next}}};
  });
  const toggleStar=(i,f)=>update(s=>({...s,stars:{...s.stars,[i]:{...s.stars[i],[f]:!s.stars[i][f]}}}));
  const setAppStatus=(id,status)=>update(s=>({...s,apps:{...s.apps,[id]:{...(s.apps[id]||{}),status}}}));
  const setAppNotes=(id,notes)=>update(s=>({...s,apps:{...s.apps,[id]:{...(s.apps[id]||{}),notes}}}));
  const addJournal=()=>{if(!journalText.trim())return;const e={id:Date.now(),date:new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}),text:journalText.trim()};update(s=>({...s,journalEntries:[e,...(s.journalEntries||[])]}));setJournalText("");};
  const deleteJournal=id=>update(s=>({...s,journalEntries:(s.journalEntries||[]).filter(e=>e.id!==id)}));
  const fetchJobs=async()=>{setJobsLoading(true);try{const r=await fetch("/api/jobs");const d=await r.json();update(s=>({...s,jobs:d.jobs||[],jobsFetchedAt:d.fetched_at}));}catch(e){}setJobsLoading(false);};

  const completedDays=buildCompletedSet(state.weeks,WEEKS);
  const totalChecks=Object.keys(state.checks).length;
  const doneChecks=Object.values(state.checks).filter(Boolean).length;
  const weekProg=wk=>{const d=state.weeks[wk]||{};const done=Object.values(d).reduce((a,x)=>a+(x.tech?1:0)+(x.english?1:0),0);return Math.round((done/14)*100);};
  const phaseProg=pid=>{const pw=WEEKS.filter(w=>w.phase===pid);const t=pw.length*14;const d=pw.reduce((a,w)=>a+Object.values(state.weeks[w.id]||{}).reduce((b,x)=>b+(x.tech?1:0)+(x.english?1:0),0),0);return Math.round((d/t)*100);};
  const topicProg=tid=>{const t=TOPICS.find(t=>t.id===tid);if(!t)return 0;let tot=0,dn=0;t.subtopics.forEach(s=>s.items.forEach((_,i)=>{tot++;if(state.checks[`${s.id}-${i}`])dn++;}));return tot>0?Math.round((dn/tot)*100):0;};
  const getDaySubs=(wk,di)=>{const m=DAY_TOPIC_MAP[wk]?.[di];if(!m)return[];return m.split(",").flatMap(sid=>{const top=TOPICS.find(t=>t.subtopics.some(s=>s.id===sid.trim()));const sub=top?.subtopics.find(s=>s.id===sid.trim());if(!sub)return[];return sub.items.map((item,i)=>({key:`${sub.id}-${i}`,label:item,color:top.color,group:sub.group,topicLabel:top.label}));});};

  // Streak calculation
  const streak=()=>{
    let s=0;const today=new Date();today.setHours(0,0,0,0);
    for(let i=0;i<112;i++){
      const d=getScheduledDate(i,completedDays);d.setHours(0,0,0,0);
      if(d>today)break;
      const wi=Math.floor(i/7),di=i%7;
      if(di===6)continue;
      const ds=state.weeks[WEEKS[wi]?.id]?.[di]||{};
      if(ds.tech)s++;else if(d<=today)s=0;
    }
    return s;
  };

  // Estimated completion
  const estCompletion=()=>{
    const done=WEEKS.reduce((a,w)=>a+Object.values(state.weeks[w.id]||{}).filter(d=>d.tech).length,0);
    if(done===0)return null;
    const elapsed=Math.max(1,Math.round((new Date()-START_DATE)/(86400000)));
    const rate=done/elapsed;
    const remaining=110-done;
    const daysLeft=Math.round(remaining/rate);
    const est=new Date();est.setDate(est.getDate()+daysLeft);
    return est.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  };

  // Heatmap data
  const heatmap=()=>{
    return WEEKS.map((w,wi)=>DAY_LABELS.map((_,di)=>{
      if(di===6)return"break";
      const ds=state.weeks[w.id]?.[di]||{};
      const gIdx=wi*7+di;
      const sd=getScheduledDate(gIdx,completedDays);sd.setHours(0,0,0,0);
      const today=new Date();today.setHours(0,0,0,0);
      if(ds.tech)return"done";
      if(sd<today)return"miss";
      return"future";
    }));
  };

  const appStatusColor={"not-applied":C.muted,"applied":C.purple,"interview":C.amber,"offer":C.green,"rejected":C.red};
  const appStatusLabel={"not-applied":"Not Applied","applied":"Applied","interview":"Interviewing","offer":"Offer 🎉","rejected":"Rejected"};
  const activeWeekData=WEEKS.find(w=>w.id===activeWeek)||WEEKS[0];
  const activePhase=PHASES.find(p=>p.id===activeWeekData.phase)||PHASES[0];
  const phColor=dark?activePhase.darkColor:activePhase.color;
  const ct=TOPICS.find(t=>t.id===activeTopic)||TOPICS[0];
  const weekIdx=WEEKS.findIndex(w=>w.id===activeWeek);

  const card=(extra={})=>({background:C.card,borderRadius:16,border:`1px solid ${C.cardBorder}`,padding:"16px 18px",...extra});

  const NAV_MOBILE=[
    {id:"dashboard",icon:"⊞",label:"Home"},
    {id:"analytics",icon:"📊",label:"Progress"},
    {id:"log",icon:"📅",label:"Log"},
    {id:"topics",icon:"📚",label:"Topics"},
    {id:"more",icon:"•••",label:"More"},
  ];
  const NAV_DESKTOP=[
    {id:"dashboard",icon:"⊞",label:"Home"},
    {id:"analytics",icon:"📊",label:"Analytics"},
    {id:"log",icon:"📅",label:"Daily Log"},
    {id:"topics",icon:"📚",label:"Topics"},
    {id:"jobs",icon:"💼",label:"Jobs"},
    {id:"english",icon:"🗣",label:"English"},
    {id:"journal",icon:"✏️",label:"Journal"},
  ];

  const css=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
    body{margin:0;overscroll-behavior:none;}
    ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(124,111,205,0.25);border-radius:4px;}
    .sb{transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1)!important;}.sb:active{transform:scale(0.93)!important;}
    .slide{animation:sl 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards;}
    @keyframes sl{from{opacity:0;transform:translateX(${slideDir*28}px)}to{opacity:1;transform:translateX(0)}}
    .acc{animation:ao 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;}
    @keyframes ao{from{opacity:0;transform:scaleY(0.85);transform-origin:top}to{opacity:1;transform:scaleY(1);transform-origin:top}}
    @media(max-width:768px){.dsk{display:none!important;}.mob{display:flex!important;}}
    @media(min-width:769px){.mob{display:none!important;}}
  `;

  if(!loaded)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:44,height:44,border:`3px solid ${C.purpleL}`,borderTop:`3px solid ${C.purple}`,borderRadius:"50%",animation:"sp 0.8s linear infinite",margin:"0 auto 14px"}}/>
        <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
        <div style={{fontSize:14,fontWeight:600,color:C.ink}}>Loading your tracker…</div>
        <div style={{fontSize:11,color:C.muted,marginTop:3}}>Syncing from Firebase</div>
      </div>
    </div>
  );

  const todayInfo=(()=>{
    const today=new Date();today.setHours(0,0,0,0);
    for(let i=0;i<112;i++){const d=getScheduledDate(i,completedDays);d.setHours(0,0,0,0);if(d.getTime()===today.getTime()){
      const wi=Math.floor(i/7),di=i%7;const week=WEEKS[wi];
      return{idx:i,wi,di,week,ds:state.weeks[week?.id]?.[di]||{tech:false,english:false},phase:PHASES.find(p=>p.id===week?.phase)||PHASES[0]};
    }}
    return null;
  })();

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:C.bg,color:C.ink,fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',sans-serif",overflow:"hidden"}}>
      <style>{css}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:C.card,borderBottom:`1px solid ${C.cardBorder}`,flexShrink:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:C.purple,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontSize:13,fontWeight:800}}>EU</span>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.ink}}>Switch Tracker</div>
            <div style={{fontSize:10,color:C.muted}}>{saving?"⟳ Saving…":"✓ Synced"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:C.purple,background:C.purpleL,padding:"3px 10px",borderRadius:20,fontWeight:600}}>{Math.round((doneChecks/totalChecks)*100)}% overall</span>
          <button className="sb" onClick={()=>setDark(d=>!d)} style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.cardBorder}`,background:C.purpleL,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{dark?"☀️":"🌙"}</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* Desktop sidebar */}
        <div className="dsk" style={{display:"flex",width:230,flexShrink:0,borderRight:`1px solid ${C.cardBorder}`,background:C.card}}>
          {/* Icon rail */}
          <div style={{width:52,background:C.sidebar,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:4}}>
            {NAV_DESKTOP.map(n=>(
              <button key={n.id} className="sb" onClick={()=>go(n.id)} title={n.label} style={{
                width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",
                background:view===n.id?"rgba(157,143,232,0.25)":"transparent",
                fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s",
              }}><span>{n.icon}</span></button>
            ))}
          </div>

          {/* Secondary sidebar — only shown on log view for phase/week, else just nav labels */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?C.sidebarSub:"#FAFAF8"}}>
            {view==="log"?(
              <>
                <div style={{padding:"12px 10px 6px",borderBottom:`1px solid ${C.cardBorder}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Daily Log</div>
                  {/* Accordion phases */}
                  {PHASES.map(p=>{
                    const pc=dark?p.darkColor:p.color;
                    const isOpen=expandedPhases[p.id];
                    return(
                      <div key={p.id}>
                        <button className="sb" onClick={()=>setExpandedPhases(ep=>({...ep,[p.id]:!ep[p.id]}))} style={{
                          width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:8,border:"none",
                          background:isOpen?`${pc}12`:"transparent",cursor:"pointer",textAlign:"left",
                          borderLeft:isOpen?`3px solid ${pc}`:"3px solid transparent",transition:"all 0.2s",marginBottom:1,
                        }}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:pc,flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,fontWeight:isOpen?600:400,color:isOpen?pc:C.inkMid}}>{p.label}</div>
                            <div style={{fontSize:9,color:C.muted}}>{p.weeks}</div>
                          </div>
                          <span style={{fontSize:9,color:C.muted,transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>{isOpen?"▲":"▼"}</span>
                        </button>
                        {isOpen&&(
                          <div style={{paddingLeft:16,marginBottom:4}}>
                            {WEEKS.filter(w=>w.phase===p.id).map(w=>(
                              <button key={w.id} className="sb" onClick={()=>setActiveWeek(w.id)} style={{
                                width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:7,border:"none",
                                background:activeWeek===w.id?`${pc}15`:"transparent",cursor:"pointer",textAlign:"left",
                                borderLeft:activeWeek===w.id?`2px solid ${pc}`:"2px solid transparent",transition:"all 0.15s",marginBottom:1,
                              }}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:10,fontWeight:activeWeek===w.id?600:400,color:activeWeek===w.id?pc:C.inkMid}}>{w.label}</div>
                                  <div style={{fontSize:8,color:C.muted}}>{w.subtitle}</div>
                                  <div style={{marginTop:3}}><Bar value={weekProg(w.id)} color={pc} bg={`${pc}15`} h={2}/></div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ):(
              <div style={{padding:"14px 10px"}}>
                <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Navigation</div>
                {NAV_DESKTOP.map(n=>(
                  <button key={n.id} className="sb" onClick={()=>go(n.id)} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:9,border:"none",
                    background:view===n.id?C.purpleL:"transparent",cursor:"pointer",marginBottom:2,textAlign:"left",
                    borderLeft:view===n.id?`3px solid ${C.purple}`:"3px solid transparent",transition:"all 0.15s",
                  }}>
                    <span style={{fontSize:15}}>{n.icon}</span>
                    <span style={{fontSize:12,fontWeight:view===n.id?600:400,color:view===n.id?C.purple:C.inkMid}}>{n.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,overflowY:"auto",position:"relative"}}>
          <div key={animKey} className="slide" style={{padding:"16px",paddingBottom:80,minHeight:"100%"}}>

            {/* ══ DASHBOARD ══ */}
            {view==="dashboard"&&(
              <div>
                <div style={{marginBottom:18}}>
                  <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.ink}}>Good evening 👋</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>EU switch journey · synced across all devices</p>
                </div>

                {/* Today card */}
                {todayInfo&&(
                  <div style={{background:todayInfo.phase?`${dark?todayInfo.phase.darkColor:todayInfo.phase.color}`:"#7C6FCD",borderRadius:20,padding:20,marginBottom:16,color:"#fff",boxShadow:`0 8px 28px ${dark?todayInfo.phase.darkColor:todayInfo.phase.color}33`}}>
                    <div style={{fontSize:10,opacity:0.7,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>📍 Today · {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
                    <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>Day {todayInfo.idx+1} · {todayInfo.week?.label}</div>
                    <div style={{fontSize:11,opacity:0.7,marginBottom:14}}>{todayInfo.week?.subtitle} · {todayInfo.phase?.label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <button className="sb" onClick={()=>toggleDay(todayInfo.week.id,todayInfo.di,"tech",()=>fireConfetti(window.innerWidth/2,200))} style={{background:todayInfo.ds.tech?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)",border:`1px solid ${todayInfo.ds.tech?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.15)"}`,borderRadius:12,padding:"11px 13px",cursor:"pointer",textAlign:"left",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
                        <div style={{fontSize:10,fontWeight:700,marginBottom:4,color:todayInfo.ds.tech?"#86efac":"rgba(255,255,255,0.8)"}}>💻 Tech · 60 min {todayInfo.ds.tech?"✓":""}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",lineHeight:1.4}}>{DAILY_TECH[todayInfo.week.id]?.[todayInfo.di]}</div>
                      </button>
                      <button className="sb" onClick={()=>toggleDay(todayInfo.week.id,todayInfo.di,"english")} style={{background:todayInfo.ds.english?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)",border:`1px solid ${todayInfo.ds.english?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.15)"}`,borderRadius:12,padding:"11px 13px",cursor:"pointer",textAlign:"left",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
                        <div style={{fontSize:10,fontWeight:700,marginBottom:4,color:todayInfo.ds.english?"#c4b5fd":"rgba(255,255,255,0.8)"}}>🗣 English · 15–20 min {todayInfo.ds.english?"✓":""}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",lineHeight:1.4}}>Record → Listen → Redo</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Phase cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
                  {PHASES.map(p=>{const pc=dark?p.darkColor:p.color;const prog=phaseProg(p.id);return(
                    <button key={p.id} className="sb" onClick={()=>{setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");go("log");}} style={{...card(),textAlign:"left",cursor:"pointer",border:`1px solid ${prog>0?pc+"40":C.cardBorder}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div><div style={{fontSize:11,fontWeight:700,color:pc,marginBottom:1}}>{p.label}</div><div style={{fontSize:12,fontWeight:600,color:C.ink}}>{p.subtitle}</div><div style={{fontSize:10,color:C.muted}}>{p.weeks}</div></div>
                        <Ring value={prog} size={42} color={pc} bg={`${pc}18`}/>
                      </div>
                      <Bar value={prog} color={pc} bg={`${pc}15`}/>
                    </button>
                  );})}
                </div>

                {/* Topic progress */}
                <div style={{...card(),marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>Topic progress</div>
                  {TOPICS.map(t=>{const p=topicProg(t.id);return(
                    <div key={t.id} style={{marginBottom:9,cursor:"pointer"}} onClick={()=>{setActiveTopic(t.id);go("topics");}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:12,color:C.ink}}>{t.label}</span>
                        <span style={{fontSize:11,fontWeight:700,color:t.color}}>{p}%</span>
                      </div>
                      <Bar value={p} color={t.color} bg={`${t.color}15`}/>
                    </div>
                  );})}
                </div>

                {/* STAR */}
                <div style={card()}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:10}}>STAR stories</div>
                  {STAR_STORIES.map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<STAR_STORIES.length-1?`1px solid ${C.cardBorder}`:"none"}}>
                      <Chk checked={!!state.stars[i]?.written} onChange={()=>toggleStar(i,"written")} color={C.purple} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                      <span style={{fontSize:12,color:C.ink,flex:1}}>{s}</span>
                      <Chk checked={!!state.stars[i]?.recorded} onChange={()=>toggleStar(i,"recorded")} color={C.green} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:10,color:C.muted}}>◀ Written</span><span style={{fontSize:10,color:C.muted}}>Recorded ▶</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ ANALYTICS ══ */}
            {view==="analytics"&&(()=>{
              const str=streak();
              const est=estCompletion();
              const hm=heatmap();
              const doneDays=WEEKS.reduce((a,w)=>a+Object.values(state.weeks[w.id]||{}).filter(d=>d.tech).length,0);
              const totalApps=Object.keys(state.apps||{}).length;

              return(
                <div>
                  <div style={{marginBottom:18}}>
                    <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.ink}}>Progress Analytics</h1>
                    <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Live data from your tracker</p>
                  </div>

                  {/* Stat row */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                    {[
                      {label:"Days done",value:doneDays,sub:`of 110 total`,color:C.purple,bg:C.purpleL,highlighted:true},
                      {label:"Topics checked",value:doneChecks,sub:`of ${totalChecks}`,color:C.ink,bg:C.card},
                      {label:"Current streak",value:`${str}${str>0?" 🔥":""}`,sub:"days in a row",color:C.amber,bg:C.amberL},
                      {label:"Est. completion",value:est||"–",sub:est?"based on your pace":"start studying",color:C.green,bg:C.greenL},
                    ].map((s,i)=>(
                      <div key={i} style={{background:s.highlighted?C.purple:s.bg,borderRadius:14,padding:"14px 13px",border:`1px solid ${s.highlighted?C.purple:C.cardBorder}`}}>
                        <div style={{fontSize:10,color:s.highlighted?"rgba(255,255,255,0.7)":C.muted,fontWeight:600,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
                        <div style={{fontSize:22,fontWeight:800,color:s.highlighted?"#fff":s.color,marginBottom:2}}>{s.value}</div>
                        <div style={{fontSize:10,color:s.highlighted?"rgba(255,255,255,0.6)":C.muted}}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Heatmap + topic bars */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div style={card()}>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:12}}>Activity heatmap</div>
                      <div style={{display:"flex",gap:3,flexWrap:"nowrap",overflowX:"auto"}}>
                        {hm.map((week,wi)=>(
                          <div key={wi} style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
                            {week.map((status,di)=>(
                              <div key={di} style={{width:13,height:13,borderRadius:3,background:status==="done"?C.heatDone:status==="miss"?C.heatMiss:status==="break"?C.heatBreak:dark?"#2C2C2E":"#F3F1FC",transition:"background 0.3s"}} title={`W${wi+1} ${DAY_LABELS[di]}`}/>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:10,marginTop:10}}>
                        {[{label:"Done",bg:C.heatDone},{label:"Missed",bg:C.heatMiss},{label:"Break",bg:C.heatBreak}].map(l=>(
                          <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
                            <div style={{width:9,height:9,borderRadius:2,background:l.bg}}/>
                            <span style={{fontSize:10,color:C.muted}}>{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={card()}>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:12}}>Topic completion</div>
                      {TOPICS.map(t=>{const p=topicProg(t.id);return(
                        <div key={t.id} style={{marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:11,color:C.ink}}>{t.label}</span>
                            <span style={{fontSize:11,fontWeight:700,color:t.color}}>{p}%</span>
                          </div>
                          <Bar value={p} color={t.color} bg={`${t.color}15`} h={5}/>
                        </div>
                      );})}
                    </div>
                  </div>

                  {/* Phase rings + apps pipeline + English */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                    <div style={card()}>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:12}}>Phase progress</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        {PHASES.map(p=>{const pc=dark?p.darkColor:p.color;return(
                          <div key={p.id} style={{textAlign:"center"}}>
                            <Ring value={phaseProg(p.id)} size={48} color={pc} bg={`${pc}15`}/>
                            <div style={{fontSize:10,color:C.muted,marginTop:4}}>{p.label}</div>
                          </div>
                        );})}
                      </div>
                    </div>

                    <div style={card()}>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:12}}>Applications</div>
                      {Object.entries(appStatusLabel).map(([status,label])=>{
                        const count=Object.values(state.apps||{}).filter(a=>a.status===status).length;
                        return(
                          <div key={status} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.cardBorder}`}}>
                            <div style={{width:7,height:7,borderRadius:"50%",background:appStatusColor[status]}}/>
                            <span style={{fontSize:11,color:C.ink,flex:1}}>{label}</span>
                            <span style={{fontSize:14,fontWeight:700,color:appStatusColor[status]}}>{count}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={card()}>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:12}}>English + STAR</div>
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:5}}>STAR written</div>
                        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                          {STAR_STORIES.map((_,i)=><div key={i} style={{width:14,height:14,borderRadius:3,background:state.stars[i]?.written?C.purple:C.purpleL}}/>)}
                        </div>
                      </div>
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:5}}>STAR recorded</div>
                        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                          {STAR_STORIES.map((_,i)=><div key={i} style={{width:14,height:14,borderRadius:3,background:state.stars[i]?.recorded?C.green:C.greenL}}/>)}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:C.muted,marginBottom:5}}>English this week</div>
                        <div style={{display:"flex",gap:3}}>
                          {DAY_LABELS.map((d,i)=>{
                            const todayWI=todayInfo?todayInfo.wi:0;
                            const ds=state.weeks[WEEKS[todayWI]?.id]?.[i]||{};
                            return(
                              <div key={i} style={{textAlign:"center"}}>
                                <div style={{width:14,height:14,borderRadius:3,background:i===6?C.heatBreak:ds.english?C.purple:C.purpleL,marginBottom:2}}/>
                                <div style={{fontSize:8,color:C.muted}}>{d[0]}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ══ DAILY LOG ══ */}
            {view==="log"&&(
              <div>
                <div style={{marginBottom:14}}>
                  <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>Daily Log</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Tap any day to expand subtopics + English steps</p>
                </div>

                {/* Mobile week picker */}
                <div className="mob" style={{display:"none",flexDirection:"column",gap:6,marginBottom:12}}>
                  <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:3}}>
                    {PHASES.map(p=>{const pc=dark?p.darkColor:p.color;return(
                      <button key={p.id} className="sb" onClick={()=>{setExpandedPhases(ep=>({...ep,[p.id]:!ep[p.id]}));setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");}} style={{padding:"5px 11px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:expandedPhases[p.id]?pc:C.purpleL,color:expandedPhases[p.id]?"#fff":C.inkMid,flexShrink:0,transition:"all 0.2s"}}>{p.label}</button>
                    );})}
                  </div>
                  {PHASES.filter(p=>expandedPhases[p.id]).flatMap(p=>WEEKS.filter(w=>w.phase===p.id)).length>0&&(
                    <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:3}}>
                      {PHASES.filter(p=>expandedPhases[p.id]).flatMap(p=>{const pc=dark?p.darkColor:p.color;return WEEKS.filter(w=>w.phase===p.id).map(w=>(
                        <button key={w.id} className="sb" onClick={()=>setActiveWeek(w.id)} style={{padding:"4px 10px",borderRadius:16,border:`1px solid ${activeWeek===w.id?pc:C.cardBorder}`,cursor:"pointer",fontSize:10,fontWeight:activeWeek===w.id?600:400,whiteSpace:"nowrap",background:activeWeek===w.id?`${pc}12`:C.card,color:activeWeek===w.id?pc:C.inkMid,flexShrink:0,transition:"all 0.15s"}}>{w.label}</button>
                      ));})}</div>
                  )}
                </div>

                {/* Week header */}
                <div style={{...card(),marginBottom:10,padding:"13px 15px",background:dark?`${phColor}15`:C.purplePale,border:`1px solid ${phColor}30`}}>
                  <div style={{fontSize:10,fontWeight:700,color:phColor,letterSpacing:"0.06em",textTransform:"uppercase"}}>{activeWeekData.label} · {activePhase.label}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink,marginTop:1,marginBottom:6}}>{activeWeekData.subtitle}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Bar value={weekProg(activeWeek)} color={phColor} bg={`${phColor}18`}/>
                    <span style={{fontSize:11,fontWeight:600,color:phColor,whiteSpace:"nowrap"}}>{weekProg(activeWeek)}%</span>
                  </div>
                </div>

                {/* Day rows */}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {DAY_LABELS.map((day,di)=>{
                    const isBreak=di===6;
                    const gIdx=weekIdx*7+di;
                    const ds=state.weeks[activeWeek]?.[di]||{tech:false,english:false};
                    const techTask=DAILY_TECH[activeWeek]?.[di]||"Study session";
                    const engTask=DAILY_ENG[activeWeek]?.[di]||"15–20 min English practice";
                    const dayNum=gIdx+1;
                    const schDate=getScheduledDate(gIdx,completedDays);
                    const dateStr=formatDate(schDate);
                    const isDone=!isBreak&&ds.tech;
                    const status=getDayStatus(schDate,isDone,isBreak);
                    const isExpanded=expandedDay===`${activeWeek}-${di}`;
                    const daySubs=getDaySubs(activeWeek,di);
                    const subsDone=daySubs.filter(s=>state.checks[s.key]).length;

                    const sc={
                      done:{bg:dark?`${C.green}12`:C.greenL,left:C.green,badge:"✅ Done",bc:C.green},
                      today:{bg:dark?`${C.purple}12`:C.purplePale,left:C.purple,badge:"📍 Today",bc:C.purple},
                      overdue:{bg:dark?`${C.amber}10`:C.amberL,left:C.amber,badge:"⏳ Pending",bc:C.amber},
                      upcoming:{bg:C.card,left:"transparent",badge:null,bc:null},
                      break:{bg:dark?`${C.green}08`:C.greenL,left:C.green,badge:null,bc:null},
                    }[status]||{bg:C.card,left:"transparent",badge:null,bc:null};

                    return(
                      <div key={di} style={{borderRadius:14,overflow:"hidden",border:`1px solid ${status==="today"?C.purple:status==="overdue"&&isDone===false&&status!=="upcoming"?C.amber:C.cardBorder}`,boxShadow:status==="today"?`0 2px 14px ${C.purple}22`:"none",transition:"box-shadow 0.3s"}}>
                        <div onClick={()=>!isBreak&&setExpandedDay(isExpanded?null:`${activeWeek}-${di}`)}
                          style={{display:"flex",alignItems:"flex-start",padding:"11px 13px",background:sc.bg,borderLeft:`3px solid ${sc.left}`,cursor:isBreak?"default":"pointer",transition:"background 0.15s"}}>
                          <div style={{width:58,flexShrink:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:status==="today"?C.purple:status==="overdue"?C.amber:isBreak?C.green:C.ink}}>{day}</div>
                            <div style={{fontSize:9,color:C.muted}}>Day {dayNum}</div>
                            <div style={{fontSize:9,color:status==="today"?C.purple:status==="overdue"?C.amber:C.muted,fontWeight:status==="today"?600:400}}>{dateStr}</div>
                          </div>
                          <div style={{flex:1,marginLeft:9}}>
                            {isBreak?(
                              <div style={{fontSize:12,color:C.green,fontWeight:600}}>💚 Rest day — recharge, no tech</div>
                            ):(
                              <>
                                {sc.badge&&<span style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${sc.bc}15`,color:sc.bc,marginBottom:5}}>{sc.badge}</span>}
                                <div style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:5}} onClick={e=>e.stopPropagation()}>
                                  <Chk checked={ds.tech} onChange={()=>toggleDay(activeWeek,di,"tech",!ds.tech?(()=>fireConfetti(window.innerWidth/2,window.innerHeight/2)):null)} color={C.purple} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                  <div><span style={{fontSize:10,fontWeight:700,color:C.purple}}>💻 TECH · </span><span style={{fontSize:11,color:C.ink}}>{techTask}</span></div>
                                </div>
                                <div style={{display:"flex",alignItems:"flex-start",gap:7}} onClick={e=>e.stopPropagation()}>
                                  <Chk checked={ds.english} onChange={()=>toggleDay(activeWeek,di,"english")} color={C.green} size={15} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                  <div><span style={{fontSize:10,fontWeight:700,color:C.green}}>🗣 ENGLISH · </span><span style={{fontSize:11,color:C.ink}}>15–20 min practice</span></div>
                                </div>
                              </>
                            )}
                          </div>
                          {!isBreak&&(
                            <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:5,flexShrink:0}}>
                              {daySubs.length>0&&<div style={{background:C.purpleL,borderRadius:8,padding:"3px 7px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:700,color:C.purple}}>{subsDone}/{daySubs.length}</div><div style={{fontSize:8,color:C.muted}}>topics</div></div>}
                              <span style={{fontSize:10,color:C.muted,transform:isExpanded?"rotate(180deg)":"rotate(0)",transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1)"}}>▼</span>
                            </div>
                          )}
                        </div>

                        {/* Expanded */}
                        {isExpanded&&!isBreak&&(
                          <div className="acc" style={{background:dark?"#1C1C1E":C.purplePale,borderTop:`1px solid ${C.cardBorder}`,padding:"11px 13px 13px 70px"}}>
                            {/* Subtopics */}
                            {daySubs.length>0&&(
                              <div style={{marginBottom:12}}>
                                <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>📚 Subtopics to cover</div>
                                {(()=>{
                                  const grps={};
                                  daySubs.forEach(s=>{const k=`${s.topicLabel}|${s.group}`;if(!grps[k])grps[k]={topicLabel:s.topicLabel,group:s.group,color:s.color,items:[]};grps[k].items.push(s);});
                                  return Object.values(grps).map((g,gi)=>(
                                    <div key={gi} style={{marginBottom:9}}>
                                      <div style={{fontSize:10,fontWeight:700,color:g.color,marginBottom:5,display:"flex",alignItems:"center",gap:5}}>
                                        <span style={{width:3,height:11,borderRadius:2,background:g.color,display:"inline-block"}}/>
                                        {g.topicLabel} · {g.group}
                                      </div>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:3}}>
                                        {g.items.map((item,ii)=>(
                                          <div key={ii} onClick={()=>toggleCheck(item.key)} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:8,cursor:"pointer",background:state.checks[item.key]?`${g.color}10`:"transparent",transition:"background 0.2s"}}>
                                            <Chk checked={!!state.checks[item.key]} onChange={()=>toggleCheck(item.key)} color={g.color} size={13} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                            <span style={{fontSize:11,color:state.checks[item.key]?C.muted:C.ink,textDecoration:state.checks[item.key]?"line-through":"none",transition:"all 0.2s"}}>{item.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ));
                                })()}
                                <div style={{fontSize:10,color:C.muted,fontStyle:"italic",marginTop:4}}>✨ Syncs to Topics section automatically</div>
                              </div>
                            )}

                            {/* English detail */}
                            <div style={{background:`${C.green}10`,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.green}20`}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                                <div style={{fontSize:11,fontWeight:700,color:C.ink}}>🗣 English — exact steps</div>
                                <span style={{fontSize:9,background:`${C.green}18`,color:C.green,padding:"2px 7px",borderRadius:20,fontWeight:600}}>15–20 min</span>
                              </div>
                              <div style={{fontSize:12,color:C.ink,lineHeight:1.6}}>{engTask}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ TOPICS ══ */}
            {view==="topics"&&(
              <div>
                <div style={{marginBottom:14}}>
                  <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>Topic Checklist</h1>
                  <p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Also tickable from Daily Log · {doneChecks}/{totalChecks} done</p>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  {TOPICS.map(t=>(
                    <button key={t.id} className="sb" onClick={()=>setActiveTopic(t.id)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:activeTopic===t.id?t.color:`${t.color}15`,color:activeTopic===t.id?"#fff":t.color,transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)"}}>{t.label} · {topicProg(t.id)}%</button>
                  ))}
                </div>
                <div style={card()}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.cardBorder}`}}>
                    <div><div style={{fontSize:15,fontWeight:800,color:C.ink}}>{ct.label}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{topicProg(ct.id)}% complete</div></div>
                    <Ring value={topicProg(ct.id)} size={50} color={ct.color} bg={`${ct.color}15`}/>
                  </div>
                  {ct.subtopics.map(sub=>{
                    const subDone=sub.items.filter((_,i)=>state.checks[`${sub.id}-${i}`]).length;
                    return(
                      <div key={sub.id} style={{marginBottom:16}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{width:3,height:14,borderRadius:2,background:ct.color,display:"inline-block"}}/>
                            <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{sub.group}</span>
                          </div>
                          <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:`${ct.color}15`,color:ct.color}}>{subDone}/{sub.items.length}</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:3}}>
                          {sub.items.map((item,i)=>{
                            const key=`${sub.id}-${i}`;
                            return(
                              <div key={i} onClick={()=>toggleCheck(key)} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:8,cursor:"pointer",background:state.checks[key]?`${ct.color}10`:"transparent",transition:"background 0.18s"}}>
                                <Chk checked={!!state.checks[key]} onChange={()=>toggleCheck(key)} color={ct.color} size={14} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                                <span style={{fontSize:11,color:state.checks[key]?C.muted:C.ink,textDecoration:state.checks[key]?"line-through":"none",transition:"all 0.2s"}}>{item}</span>
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

            {/* ══ JOBS ══ */}
            {view==="jobs"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div><h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>EU Java Jobs</h1><p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Live · visa sponsorship + relocation</p></div>
                  <button className="sb" onClick={fetchJobs} disabled={jobsLoading} style={{padding:"8px 14px",borderRadius:12,border:"none",cursor:jobsLoading?"not-allowed":"pointer",background:jobsLoading?C.purpleL:C.purple,color:jobsLoading?C.muted:"#fff",fontSize:12,fontWeight:700}}>{jobsLoading?"⟳ Fetching…":"🔄 Refresh"}</button>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                  {Object.entries(appStatusLabel).map(([status,label])=>{
                    const count=Object.values(state.apps||{}).filter(a=>a.status===status).length;
                    return <div key={status} style={{...card(),padding:"8px 13px",textAlign:"center",minWidth:65,flex:"none"}}><div style={{fontSize:18,fontWeight:800,color:appStatusColor[status]}}>{count}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{label}</div></div>;
                  })}
                </div>
                {(state.jobs||[]).length===0&&!jobsLoading&&(
                  <div style={{...card(),textAlign:"center",padding:40}}>
                    <div style={{fontSize:34,marginBottom:10}}>💼</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.ink,marginBottom:6}}>No jobs loaded yet</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Click Refresh to fetch latest EU Java roles with visa sponsorship</div>
                    <button className="sb" onClick={fetchJobs} style={{padding:"9px 20px",borderRadius:12,border:"none",cursor:"pointer",background:C.purple,color:"#fff",fontSize:12,fontWeight:700}}>Fetch Jobs Now</button>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10}}>
                  {(state.jobs||[]).map((job,ji)=>{
                    const appState=state.apps[job.id]||{status:"not-applied",notes:""};
                    return(
                      <div key={job.id||ji} style={card()}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{flex:1,marginRight:7}}>
                            <div style={{fontSize:13,fontWeight:700,color:C.ink,lineHeight:1.3,marginBottom:2}}>{job.title}</div>
                            <div style={{fontSize:11,fontWeight:600,color:C.purple}}>{job.company}</div>
                            <div style={{fontSize:10,color:C.muted,marginTop:1}}>📍 {job.location}</div>
                          </div>
                          <div style={{width:9,height:9,borderRadius:"50%",background:appStatusColor[appState.status],flexShrink:0,marginTop:3}}/>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                          {job.visa&&<span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:20,background:C.greenL,color:C.green}}>✈️ Visa</span>}
                          {(job.tags||[]).slice(0,4).map((t,i)=><span key={i} style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:20,background:C.purpleL,color:C.purple}}>{t}</span>)}
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                          {Object.entries(appStatusLabel).map(([status,label])=>(
                            <button key={status} className="sb" onClick={()=>setAppStatus(job.id,status)} style={{padding:"2px 7px",borderRadius:20,border:`1px solid ${appState.status===status?appStatusColor[status]:C.cardBorder}`,cursor:"pointer",fontSize:9,fontWeight:600,background:appState.status===status?`${appStatusColor[status]}15`:"transparent",color:appState.status===status?appStatusColor[status]:C.muted,transition:"all 0.15s"}}>{label}</button>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <input value={appState.notes||""} onChange={e=>setAppNotes(job.id,e.target.value)} placeholder="Notes…" style={{flex:1,fontSize:11,color:C.ink,border:`1px solid ${C.cardBorder}`,borderRadius:8,padding:"4px 8px",background:C.bg,outline:"none"}}/>
                          {job.url&&<a href={job.url} target="_blank" rel="noreferrer" style={{padding:"4px 9px",borderRadius:8,background:C.purple,color:"#fff",fontSize:10,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Apply →</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ ENGLISH ══ */}
            {view==="english"&&(
              <div>
                <div style={{marginBottom:14}}><h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>English Practice</h1><p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>15–20 min every evening · Level 5–6 → Target 7.5+</p></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10,marginBottom:12}}>
                  {[
                    {m:"Month 1",c:C.purple,focus:"Clarity + Pacing",tip:"Record → Listen → Redo. 60 seconds on any topic. Play it back. You immediately hear what to fix. Redo once.",tool:"Elsa Speak (free iOS/Android)"},
                    {m:"Month 2",c:C.green, focus:"Tech Vocab in Speech",tip:"3 tech terms/day in full spoken sentences. e.g. 'The system had high latency because the database wasn't indexed.'",tool:"Anki 'Tech English' deck + Elsa Speak"},
                    {m:"Month 3",c:C.amber, focus:"Interview Structures",tip:"Answer 1 mock Q in STAR format daily. Record it. Check: did you ramble? Was the structure clear? Did the Result have a number?",tool:"Pramp.com (free) + italki.com"},
                    {m:"Month 4",c:C.red,   focus:"EU Accent + Polish",tip:"Watch 10 min EU-accented English YouTube daily. Shadow the speaker — repeat every sentence 2 seconds after them.",tool:"Kurzgesagt + Lex Fridman Podcast"},
                  ].map((m,i)=>(
                    <div key={i} style={{...card(),borderTop:`3px solid ${m.c}`}}>
                      <div style={{fontSize:9,fontWeight:800,color:m.c,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{m.m}</div>
                      <div style={{fontSize:14,fontWeight:800,color:C.ink,marginBottom:6}}>{m.focus}</div>
                      <div style={{fontSize:12,color:C.inkMid,lineHeight:1.55,marginBottom:8}}>{m.tip}</div>
                      <div style={{fontSize:10,color:m.c,fontWeight:600}}>📌 {m.tool}</div>
                    </div>
                  ))}
                </div>
                <div style={{...card(),background:dark?`${C.purple}12`:C.purplePale,border:`1px solid ${C.purple}25`,marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:800,color:C.purple,marginBottom:6}}>🎙 The single most effective habit</div>
                  <div style={{fontSize:13,color:C.ink,lineHeight:1.7}}><strong>Record → Listen → Redo.</strong> 60 sec on any topic. Play back immediately. You will hear exactly what to fix. Redo once. Every evening. This alone moves you from 5–6 to 7.5+ in 4 months.</div>
                </div>
                <div style={{...card(),marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:4}}>Today's English practice</div>
                  <p style={{fontSize:12,color:C.muted,margin:"0 0 10px"}}>Open Daily Log → tap today → expand to see exact step-by-step instructions with timings and tools</p>
                  <button className="sb" onClick={()=>go("log")} style={{padding:"8px 14px",borderRadius:10,border:"none",cursor:"pointer",background:C.purple,color:"#fff",fontSize:12,fontWeight:700}}>Go to Daily Log →</button>
                </div>
                <div style={card()}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:10}}>STAR stories tracker</div>
                  {STAR_STORIES.map((story,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<STAR_STORIES.length-1?`1px solid ${C.cardBorder}`:"none"}}>
                      <div style={{fontSize:10,color:C.muted,width:18,textAlign:"center",fontWeight:700}}>{i+1}</div>
                      <div style={{flex:1,fontSize:12,color:C.ink}}>{story}</div>
                      <div style={{display:"flex",gap:10}}>
                        {[["written",C.purple],["recorded",C.green]].map(([f,c])=>(
                          <div key={f} style={{display:"flex",alignItems:"center",gap:4}}>
                            <Chk checked={!!state.stars[i]?.[f]} onChange={()=>toggleStar(i,f)} color={c} size={14} onConfetti={(x,y)=>fireConfetti(x,y)}/>
                            <span style={{fontSize:9,color:C.muted,textTransform:"capitalize"}}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ JOURNAL ══ */}
            {view==="journal"&&(
              <div>
                <div style={{marginBottom:14}}><h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink}}>Study Journal</h1><p style={{margin:"4px 0 0",fontSize:12,color:C.muted}}>Reflections, blockers, wins — cloud synced</p></div>
                <div style={{...card(),marginBottom:12}}>
                  <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="What did you learn? What felt hard? Interview feedback? Write freely…" style={{width:"100%",minHeight:95,fontSize:13,color:C.ink,border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:12,resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box",background:C.bg}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                    <span style={{fontSize:11,color:C.muted}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</span>
                    <button className="sb" onClick={addJournal} style={{padding:"7px 16px",background:dark?"#2C2C2E":C.ink,color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                  </div>
                </div>
                {(state.journalEntries||[]).length===0&&<div style={{textAlign:"center",padding:"36px 20px",color:C.muted,fontSize:13}}><div style={{fontSize:30,marginBottom:8}}>📝</div>No entries yet.</div>}
                {(state.journalEntries||[]).map(entry=>(
                  <div key={entry.id} style={{...card(),marginBottom:9,position:"relative"}}>
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

      {/* Mobile bottom tab bar */}
      <div className="mob" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:dark?"rgba(28,28,30,0.96)":"rgba(255,255,255,0.96)",borderTop:`1px solid ${C.cardBorder}`,padding:"6px 0 calc(6px + env(safe-area-inset-bottom))",zIndex:100,backdropFilter:"blur(20px)"}}>
        {NAV_MOBILE.map(n=>{
          const isActive=n.id==="more"?moreOpen:view===n.id;
          return(
            <button key={n.id} className="sb" onClick={()=>{if(n.id==="more")setMoreOpen(m=>!m);else{go(n.id);setMoreOpen(false);}}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",padding:"4px 0"}}>
              <span style={{fontSize:20,transform:isActive?"scale(1.15)":"scale(1)",transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1)"}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:isActive?700:400,color:isActive?C.purple:C.muted,transition:"color 0.15s"}}>{n.label}</span>
              {isActive&&<div style={{width:4,height:4,borderRadius:"50%",background:C.purple,marginTop:-1}}/>}
            </button>
          );
        })}
      </div>

      {/* More overlay */}
      {moreOpen&&(
        <div className="mob" style={{position:"fixed",bottom:"calc(56px + env(safe-area-inset-bottom))",left:0,right:0,background:dark?"rgba(28,28,30,0.98)":"rgba(255,255,255,0.98)",borderTop:`1px solid ${C.cardBorder}`,padding:"8px 14px",zIndex:99,backdropFilter:"blur(20px)"}}>
          {[{id:"jobs",icon:"💼",label:"Jobs"},{id:"english",icon:"🗣",label:"English"},{id:"journal",icon:"✏️",label:"Journal"}].map(n=>(
            <button key={n.id} className="sb" onClick={()=>go(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 6px",background:"transparent",border:"none",cursor:"pointer",borderBottom:`1px solid ${C.cardBorder}`,textAlign:"left"}}>
              <span style={{fontSize:22}}>{n.icon}</span>
              <span style={{fontSize:14,fontWeight:500,color:C.ink}}>{n.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

