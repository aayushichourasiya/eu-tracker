import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getScheduledDate, formatDate, getDayStatus, buildCompletedSet, isToday, START_DATE } from "./dateUtils";

const DOC_ID = "tracker-state";
const COLLECTION = "eu-switch";

// ── Palette ───────────────────────────────────────────────────────────────────
const G = {
  blue:   "#3B82F6", lblue: "#EFF6FF", dblue: "#1D4ED8",
  green:  "#10B981", lgreen:"#ECFDF5",
  amber:  "#F59E0B", lamber:"#FFFBEB",
  purple: "#8B5CF6", lpurple:"#F5F3FF",
  teal:   "#14B8A6", red: "#EF4444", lred:"#FEF2F2",
  gray:   "#F9FAFB", dgray:"#6B7280", ink:"#111827",
};

const PHASES = [
  { id:"p1", label:"Phase 1", subtitle:"System Design + Java",   weeks:"Weeks 1–4",  color:G.blue,   light:G.lblue,   grad:"linear-gradient(135deg,#3B82F6,#1D4ED8)" },
  { id:"p2", label:"Phase 2", subtitle:"Cloud + AI Integration", weeks:"Weeks 5–8",  color:G.green,  light:G.lgreen,  grad:"linear-gradient(135deg,#10B981,#059669)" },
  { id:"p3", label:"Phase 3", subtitle:"DSA + Mock Interviews",  weeks:"Weeks 9–12", color:G.amber,  light:G.lamber,  grad:"linear-gradient(135deg,#F59E0B,#D97706)" },
  { id:"p4", label:"Phase 4", subtitle:"Apply + Interview",      weeks:"Weeks 13–16",color:G.purple, light:G.lpurple, grad:"linear-gradient(135deg,#8B5CF6,#6D28D9)" },
];

const TOPICS = [
  { id:"t1", phase:"p1", label:"System Design & Distributed Systems", color:G.blue, subtopics:[
    { id:"t1-1", group:"Fundamentals", items:["What is a distributed system","Latency vs throughput","Availability vs consistency","CAP theorem","PACELC theorem","SLA / SLO / SLI","Fault tolerance","Single point of failure (SPOF)"] },
    { id:"t1-2", group:"Scalability",  items:["Horizontal vs vertical scaling","Stateless vs stateful services","Load balancing algorithms","Layer 4 vs Layer 7 LB","Auto-scaling","Database read replicas","Database sharding","Consistent hashing"] },
    { id:"t1-3", group:"Caching",      items:["Cache hit ratio","Cache-aside (Lazy loading)","Write-through cache","Write-behind cache","Read-through cache","LRU / LFU / FIFO eviction","Cache stampede prevention","TTL strategy","Redis vs Memcached","Distributed cache","Cache invalidation"] },
    { id:"t1-4", group:"Databases",    items:["ACID properties","Isolation levels","BASE properties","SQL vs NoSQL decision","Indexing internals","Composite indexes","Query explain plan","N+1 query problem","Connection pooling (HikariCP)","Optimistic vs pessimistic locking","Normalisation / denormalisation","NoSQL types","Cassandra model","MongoDB aggregation"] },
    { id:"t1-5", group:"Messaging",    items:["Why message queues exist","Kafka architecture","Kafka offset management","Kafka replication factor","Kafka vs RabbitMQ","Dead letter queue (DLQ)","Event sourcing","CQRS pattern","Outbox pattern","Idempotency"] },
    { id:"t1-6", group:"API Design",   items:["REST principles","HTTP methods & status codes","API versioning strategies","Cursor vs offset pagination","Rate limiting algorithms","API Gateway patterns","GraphQL vs REST","gRPC & protobuf","Idempotency keys","OpenAPI / Swagger"] },
    { id:"t1-7", group:"Resilience",   items:["Circuit breaker states","Resilience4j @CircuitBreaker","Retry with exponential backoff","Bulkhead pattern","Timeout on every call","Fallback strategies","Health checks (liveness vs readiness)","Graceful degradation"] },
    { id:"t1-8", group:"Design Cases", items:["URL shortener","Ride-sharing backend","WhatsApp messaging system","Payment processing","Notification service","Search autocomplete","Distributed rate limiter"] },
  ]},
  { id:"t2", phase:"p1", label:"Core Java Deep Dive", color:G.amber, subtopics:[
    { id:"t2-1", group:"JVM Internals",   items:["JVM architecture overview","Heap structure (Eden, S0, S1, Old, Metaspace)","Minor GC vs Major GC vs Full GC","GC algorithms: Serial, Parallel, G1, ZGC","GC tuning flags","Memory leaks (causes)","Reading GC logs","JIT compiler basics","Escape analysis"] },
    { id:"t2-2", group:"Concurrency",     items:["Thread lifecycle (6 states)","synchronized keyword","volatile — visibility only","Happens-before relationship","AtomicInteger / CAS internals","ReentrantLock vs synchronized","ReadWriteLock","Deadlock conditions + prevention","Thread starvation vs livelock","ThreadLocal (use & leak risk)","ExecutorService pool types","CompletableFuture chain","ForkJoinPool / work stealing","Virtual threads (Java 21)","Structured concurrency (Java 21)"] },
    { id:"t2-3", group:"Collections",     items:["HashMap internals","HashMap resize","ConcurrentHashMap","LinkedHashMap (LRU)","TreeMap","ArrayDeque vs LinkedList","PriorityQueue (min-heap)","CopyOnWriteArrayList","BlockingQueue types"] },
    { id:"t2-4", group:"Java 17–21",      items:["Records","Sealed classes","Pattern matching for instanceof","Text blocks","Switch expressions","Unnamed patterns / variables","Sequenced collections","Virtual threads (Project Loom)","String templates (preview)"] },
  ]},
  { id:"t3", phase:"p1", label:"Spring Boot 3 Deep Dive", color:G.teal, subtopics:[
    { id:"t3-1", group:"Core IoC",            items:["Spring IoC container","BeanFactory vs ApplicationContext","Constructor vs field injection","@Component / @Service / @Repository","Bean scopes","Bean lifecycle hooks","@Configuration vs @Component","Conditional beans","Auto-configuration mechanism"] },
    { id:"t3-2", group:"Security",            items:["Authentication vs authorisation","SecurityFilterChain","JWT structure & stateless auth flow","OAuth2 authorization code flow","OAuth2 client credentials flow","CSRF — when to disable","@PreAuthorize / @PostAuthorize","BCrypt password hashing","CORS configuration"] },
    { id:"t3-3", group:"Data & Transactions", items:["JPA vs Hibernate vs Spring Data JPA","Entity annotations","Relationship mappings","FetchType.LAZY vs EAGER","N+1 in JPA — fix with @EntityGraph","@Transactional propagation levels","@Transactional isolation levels","Optimistic locking @Version","Spring Data repositories","DTO projections","Pageable pagination"] },
    { id:"t3-4", group:"Cloud & Microservices",items:["Eureka server/client setup","Spring Cloud Gateway routing","Spring Cloud Config Server","Feign client","Resilience4j integration","Distributed tracing (Micrometer)","Spring Boot Actuator endpoints","Prometheus + Grafana","Kafka with Spring (@KafkaListener)"] },
    { id:"t3-5", group:"Testing",             items:["@SpringBootTest vs @WebMvcTest vs @DataJpaTest","MockMvc controller testing","@MockBean vs @Mock","Testcontainers","WireMock","Spring Cloud Contract","JaCoCo coverage"] },
  ]},
  { id:"t4", phase:"p2", label:"Docker & Kubernetes", color:G.green, subtopics:[
    { id:"t4-1", group:"Docker",     items:["Container vs VM","Docker architecture","Dockerfile instructions","Multi-stage builds for Java","docker-compose multi-service","Image layer caching","Docker networking","Docker volumes","Distroless images",".dockerignore"] },
    { id:"t4-2", group:"Kubernetes", items:["Control plane components","Worker node components","Pod concept","Deployment + rolling updates","ReplicaSet","Service types","Ingress","ConfigMap","Secret","PV and PVC","Namespace","Resource limits","Liveness vs readiness probe","HPA (autoscaling)","StatefulSet","DaemonSet","Helm charts","kubectl commands"] },
  ]},
  { id:"t5", phase:"p2", label:"AI Integration in Java", color:G.purple, subtopics:[
    { id:"t5-1", group:"LLM Fundamentals", items:["Tokens & context window","Temperature / max_tokens","System / user / assistant roles","Zero-shot vs few-shot prompting","Chain-of-thought prompting","Hallucination mitigation","Streaming responses","Token cost calculation"] },
    { id:"t5-2", group:"Spring AI",        items:["Spring AI dependency setup","ChatClient usage","Prompt templates","BeanOutputParser / MapOutputParser","EmbeddingClient","VectorStore types","RAG pipeline in Spring AI","Advisors","Function / Tool calling"] },
    { id:"t5-3", group:"RAG Pattern",      items:["Why RAG exists","Chunking strategies","Embedding models & cosine similarity","Vector similarity search (ANN)","Re-ranking","Hybrid search","Context window management"] },
    { id:"t5-4", group:"Production AI",    items:["AI observability","Response caching strategy","Prompt injection defence","Circuit breaker for AI API","Async AI calls (@Async)","Per-user rate limiting","A/B testing prompts"] },
  ]},
  { id:"t6", phase:"p3", label:"DSA — Interview Patterns", color:G.red, subtopics:[
    { id:"t6-1", group:"Arrays & Strings",   items:["Two pointer — opposite ends","Two pointer — fast/slow","Sliding window fixed size","Sliding window variable size","Prefix sum","Kadane's algorithm","String manipulation patterns"] },
    { id:"t6-2", group:"Hashing",            items:["Two Sum complement lookup","Group anagrams","Valid anagram","Longest consecutive sequence","Top K frequent elements"] },
    { id:"t6-3", group:"Linked Lists",       items:["Reverse linked list (iterative)","Reverse linked list (recursive)","Cycle detection (Floyd's)","Find cycle start","Merge two sorted lists","Find middle node","Remove Nth from end"] },
    { id:"t6-4", group:"Stacks & Queues",    items:["Valid parentheses","Min stack","Daily temperatures (monotonic stack)","Next greater element","Evaluate RPN","Largest rectangle in histogram"] },
    { id:"t6-5", group:"Trees",              items:["Inorder traversal (iterative + recursive)","Preorder traversal","Postorder traversal","Level-order BFS","Max depth","Diameter","Validate BST","LCA","Serialize/deserialize","Construct from traversals","Kth smallest in BST","Balanced binary tree"] },
    { id:"t6-6", group:"Graphs",             items:["BFS shortest path","DFS cycle detection","Number of islands","Clone graph","Rotting oranges (multi-source BFS)","Topological sort","Union-Find","Dijkstra's algorithm"] },
    { id:"t6-7", group:"Dynamic Programming",items:["Top-down memoisation vs bottom-up","Climbing stairs","House robber","Coin change","LIS","Word break","Unique paths","LCS","Edit distance","Knapsack / subset sum"] },
    { id:"t6-8", group:"Sorting & Searching",items:["Binary search standard","Binary search on rotated array","Binary search on answer","Merge sort","Quick sort","Top K with heap"] },
  ]},
];

// Map each day (weekId + dayIndex) to its relevant topic subtopics
const DAY_TOPIC_MAP = {
  w1:  ["t1-1","t1-1","t1-1","t1-2","t1-2","t1-1,t1-2",null],
  w2:  ["t1-3","t1-3","t2-2","t2-2","t2-3","t1-3,t2-2,t2-3",null],
  w3:  ["t1-5","t1-5","t3-1","t3-1","t3-2","t1-5,t3-1,t3-2",null],
  w4:  ["t1-6","t1-6","t1-7","t3-3","t2-4","t1-6,t1-7,t3-3",null],
  w5:  ["t4-1","t4-1","t4-2","t4-2","t4-2","t4-1,t4-2",null],
  w6:  ["t5-1","t5-1","t5-1","t5-2","t3-4","t5-1,t3-4",null],
  w7:  ["t5-1","t5-2","t5-3","t5-4","t5-2,t5-3","t5-2,t5-3,t5-4",null],
  w8:  ["t1-8","t1-8","t1-8","t1-4","t1-8","t1-4,t1-8",null],
  w9:  ["t6-1","t6-2","t6-3","t6-4","t6-8","t6-1,t6-2,t6-3,t6-4",null],
  w10: ["t6-5","t6-5","t6-6","t6-6","t6-7","t6-5,t6-6,t6-7",null],
  w11: ["t6-7","t6-7",null,null,null,null,null],
  w12: ["t1-8","t2-1,t3-1","t5-3","t6-1","t1-6",null,null],
  w13: [null,null,null,null,null,null,null],
  w14: [null,null,null,null,null,null,null],
  w15: [null,null,null,null,null,null,null],
  w16: [null,null,null,null,null,null,null],
};

const WEEKS = [
  { id:"w1",  phase:"p1", label:"Distributed Systems Fundamentals + JVM" },
  { id:"w2",  phase:"p1", label:"Caching Systems + Java Concurrency" },
  { id:"w3",  phase:"p1", label:"Messaging Systems + Spring Boot Core" },
  { id:"w4",  phase:"p1", label:"API Design + Resilience + Month 1 Review" },
  { id:"w5",  phase:"p2", label:"Docker + Kubernetes Core" },
  { id:"w6",  phase:"p2", label:"AWS Core + CI/CD Pipeline" },
  { id:"w7",  phase:"p2", label:"Spring AI + AI Integration" },
  { id:"w8",  phase:"p2", label:"Month 2 Review + System Design Practice" },
  { id:"w9",  phase:"p3", label:"DSA — Arrays, Strings, Hashing" },
  { id:"w10", phase:"p3", label:"DSA — Trees, Graphs, DP" },
  { id:"w11", phase:"p3", label:"Mock Interviews + Behavioural Prep" },
  { id:"w12", phase:"p3", label:"Month 3 Review + Application Prep" },
  { id:"w13", phase:"p4", label:"Apply + First Interviews" },
  { id:"w14", phase:"p4", label:"Active Interviews — Keep Grinding" },
  { id:"w15", phase:"p4", label:"Final Rounds + Offer Stage" },
  { id:"w16", phase:"p4", label:"Wrap Up + Offer + Begin" },
];

const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const DAILY_TECH = {
  w1: ["Distributed Systems intro — definitions, real examples, why systems fail","CAP Theorem deep dive + PACELC theorem","SLA / SLO / SLI + Fault Tolerance + SPOF","Load Balancing algorithms + Horizontal Scaling","DB Scaling: Replication & Sharding + Consistent Hashing","REVIEW Week 1 — draw diagrams from memory","💚 BREAK"],
  w2: ["Caching Fundamentals — cache-aside, write-through + Redis data types","Cache Eviction (LRU/LFU) + Cache Stampede + Redis Cluster","Java Concurrency Pt1 — Thread lifecycle, synchronized, volatile","Java Concurrency Pt2 — ExecutorService, CompletableFuture","Collections Internals — HashMap, ConcurrentHashMap, PriorityQueue","REVIEW Week 2 + Mini Design (product API caching layer)","💚 BREAK"],
  w3: ["Kafka Architecture — topic, partition, offset, consumer group","Event-Driven Patterns — CQRS, Outbox, Idempotency, DLQ","Spring Boot Core — IoC container, constructor injection, Bean scopes","Spring Boot — Auto-configuration, Actuator, Micrometer","Spring Security — JWT flow, OAuth2 code flow + client credentials","REVIEW Week 3 + Design Notification Service","💚 BREAK"],
  w4: ["REST API Design — status codes, idempotency, versioning, cursor pagination","Rate Limiting (token bucket, sliding window) + Spring Cloud Gateway","Resilience Patterns — Circuit Breaker, Retry, Bulkhead, Timeout","Spring Transactions + JPA — @Transactional, N+1 fix, @EntityGraph","Java 21 — Virtual threads, Records, Sealed classes, Pattern matching","FULL MONTH 1 REVIEW — redesign ride-sharing backend from memory","💚 BREAK"],
  w5: ["Docker Fundamentals — Dockerfile, multi-stage build, docker build/run","Docker Networking + Compose — bridge networks, multi-service compose","Kubernetes Architecture — control plane, worker nodes, Pod/Deployment","K8s Services + Ingress + ConfigMap + Secret + Namespace","K8s Probes + HPA + Resource limits + Helm chart structure","REVIEW Week 5 + write K8s Deployment YAML from memory","💚 BREAK"],
  w6: ["AWS Core — IAM, EC2, S3, RDS (multi-AZ, read replicas), SQS","AWS Networking + ECS Fargate — VPC, security groups, task definition","GitHub Actions CI/CD — workflow YAML, build Spring Boot, push ECR","Observability — structured logging, Prometheus, Grafana, Zipkin tracing","Spring Cloud — Eureka, Gateway routing, Config Server, Micrometer Tracing","REVIEW Week 6 + Draw 3-tier cloud architecture (ALB→ECS→RDS+Cache)","💚 BREAK"],
  w7: ["LLM Fundamentals — tokens, context window, temperature, prompt roles","Spring AI Framework — ChatClient, Prompt templates, OutputParsers","RAG Pipeline — chunk, embed, store (pgvector), retrieve, augment, generate","Function Calling + AI Observability + prompt injection defence","Portfolio BUILD — Spring Boot 3 + Spring AI + Kafka + Redis + GitHub","REVIEW Week 7 + add Actuator + Prometheus metrics to portfolio","💚 BREAK"],
  w8: ["System Design Case Study: WhatsApp — Cassandra, WebSocket, Kafka fan-out","System Design Case Study: Payment System — idempotency, Saga pattern","System Design Case Study: Notification Service — Kafka, DLQ, fan-out","Consistency deep dive — Saga, distributed lock (Redis), leader election","Full design practice: Search Autocomplete (45 min timed)","FULL MONTH 2 REVIEW — portfolio deploy to AWS + CV first draft","💚 BREAK"],
  w9: ["Arrays: Two Pointer + Sliding Window — 3 NeetCode problems","Hashing Patterns — Two Sum, Group Anagrams, Top K Frequent","Linked Lists — Reverse, Floyd's cycle, Merge sorted, Find middle","Stacks + Monotonic Stack — Valid Parens, Min Stack, Daily Temps","Binary Search — standard, rotated array, binary search on answer","REVIEW Week 9 — 3 mixed timed problems (15 min each, no hints)","💚 BREAK"],
  w10:["Binary Trees Pt1 — all 3 traversals iterative + recursive, Level-order BFS","Binary Trees Pt2 — Validate BST, LCA, Serialize/Deserialize","Graphs Pt1 — BFS shortest path, DFS, Number of Islands, Rotting Oranges","Graphs Pt2 — Topological sort (Kahn's), Union-Find, Dijkstra's","Dynamic Programming 1D — Climbing Stairs, House Robber, Coin Change, LIS","REVIEW Week 10 — 3 mixed (1 tree + 1 graph + 1 DP)","💚 BREAK"],
  w11:["Heap + Intervals — Kth Largest, Median from Stream, Meeting Rooms II","2D DP + String DP — Unique Paths, LCS, Edit Distance, Word Break","Behavioural Prep Pt1 — Write STAR Stories 1–4 + record each","Behavioural Prep Pt2 — Write STAR Stories 5–8 + record each","Mock Technical Interview — 1 LeetCode medium (timed) + 1 system design","REVIEW + CV finalise + Pramp.com mock interview session","💚 BREAK"],
  w12:["Full System Design Revision — 4 systems, 10 min each from memory","Java + Spring Boot Revision — GC types, CompletableFuture, @Transactional","AI Integration Revision — RAG pipeline, function calling, AI observability","DSA Final — 5 mixed problems (15 min each, strict timer)","Cover Letter + Applications — 5 companies applied today","FULL MONTH 3 REVIEW — Go/No-Go checklist, Pramp mock, 5 more apps","💚 BREAK"],
  w13:["Coding screen prep — 2 easy + 1 medium LeetCode warm-up","System Design round prep — opening structure, talk while drawing","Apply + Referrals — total 15 applications, 3 LinkedIn outreach messages","Questions to Ask Interviewers — prepare 5 smart Qs","Salary Negotiation Prep — levels.fyi research, 'never give number first'","REVIEW + Mid-Application Calibration — tally responses, adjust strategy","💚 BREAK"],
  w14:["2 LeetCode mediums + Interview Debrief log — what was asked, gaps","Research each company's engineering blog — prepare 1 specific question","System Design + Java practice — 1 full design (30 min) + Java revision","Apply + Follow-up — 5 more apps (total 25+), follow up on 7+ day silences","Final-Round Prep: Architecture Interview — defend decisions under challenge","REVIEW + Application Status Check — update tracker, prioritise final rounds","💚 BREAK"],
  w15:["Full 90-min Mock — 45 min system design + 30 min coding + 15 min behavioural","Java 21 + Spring Boot 3 Final — virtual threads, jakarta namespace","Offer Evaluation Framework — base, bonus, equity, relocation, notice period","Visa Action Items — apostille checklist, immigration contact, relocation plan","Keep Applying — never stop until offer is signed","Final Review + Go/No-Go checklist + portfolio public URL confirmed","💚 BREAK"],
  w16:["Interview remaining pipeline — trust the preparation, execute","Compare Offers — score on salary, growth, relocation, tech, location","Resignation Planning — professional letter, notice negotiation, PF/tax","Post-Arrival Plan — local JUG, engineering all-hands, Staff Engineer book","Keep Applying until signed offer in hand","🎉 Done. 110 days. One direction. One result.","💚 BREAK"],
};

const DAILY_ENGLISH = {
  w1: ["Elsa Speak setup (10 min) · Record: 'distributed system' in 2 sentences","Read aloud 2 paragraphs slowly · Record 60-sec CAP theorem explanation","Say tech vocab aloud 5x each: 'scalability', 'fault tolerance' · Elsa Speak 10 min","TED Talk 10 min — watch WITHOUT subtitles first, then WITH. Note gap.","Record 'Tell me about yourself' for EU interview (90 sec) · Listen back","Record 2-min mock interview introduction · Listen · Redo once","10 min Elsa Speak only"],
  w2: ["Record 60-sec caching explanation · New words: cache miss, eviction policy","YouTube 'How Redis works' (7 min, no subtitles) · Note unfamiliar words","Record 60 sec: 'What is a thread?' in simple English","STAR story: 'Describe a technical challenge at work' — record 90 sec","Professional phrases aloud: 'The trade-off here is…', 'I would argue that…'","Mock Q: 'Why do you want to move to Europe?' — record 60–90 sec","10 min Elsa Speak only"],
  w3: ["EU accent listening: Dutch/German YouTube speaker (8 min) · Write 2 observations","New words: 'idempotent', 'eventual consistency' · Record 60-sec on event sourcing","Record 60 sec: 'Explain dependency injection to a non-technical person'","Lex Fridman Podcast: 10 min listening · Note his speech structure","Record 60 sec: 'How does JWT authentication work?' — plain English","STAR story: 'Tell me about a time you improved a process' — 90 sec recorded","10 min Elsa Speak only"],
  w4: ["Record 60 sec: 'How do you design a REST API?'","EU accent: Estonian/Dutch English YouTube (8 min) · Note specific sounds","Record 60 sec: 'What is a circuit breaker and why does every microservice need one?'","STAR: 'Describe a complex database/transaction challenge' — 90 sec","2-min fluency: talk about everything learned in Month 1 — don't stop. Record.","Full mock Q&A 20 min — record all answers · Listen back","Rest — light English podcast optional"],
  w5: ["Elsa Speak 10 min · New words: 'containerisation', 'orchestration', 'pod'","Record 60 sec: 'Why use Docker?' in your own words","Record 60 sec: 'What is Kubernetes and why do companies use it?'","TED Talk: watch without subtitles · measure comprehension %","Record: 'What are liveness vs readiness probes and what happens when each fails?'","Mock Q: 'Where do you see yourself in 3 years after moving to Europe?' — 90 sec","10 min Elsa Speak only"],
  w6: ["AWS vocab aloud: 'high availability', 'elasticity', 'durability', 'fault tolerant'","Record 60 sec: 'Explain EC2 vs ECS to a non-engineer' using an analogy","Write LinkedIn post draft: 'What I learned about AWS this week' · Read aloud","Lex Fridman 10 min: observe speech patterns and pacing · Write 2 observations","STAR story: 'Tell me about improving a CI/CD or deployment process' — 90 sec","Mock Q: 'Why do you want to work at [Company]?' — research blog first · record","Rest. Light English podcast optional"],
  w7: ["New words aloud: 'hallucination', 'embedding', 'context window', 'inference'","Record 90 sec: 'Why is AI integration an important skill for backend devs in 2026?'","Booking.com or Klarna engineering talk: 8 min listening · Note unfamiliar vocab","STAR story: 'Tell me about a project where you integrated a new technology' — 90 sec","Record 90 sec: describe your portfolio project as if in a tech interview","1) Read tech blog paragraph aloud (pacing) 2) Record RAG explanation 3) Shadow YouTube","Rest"],
  w8: ["Review all Month 2 vocabulary · Pick weakest 5 words · Elsa Speak 10 min","Record 90 sec: 'Why is building a payment system harder than a typical CRUD API?'","EU engineering talk: 10 min no subtitles · Write 2-sentence summary of what you caught","Mock behavioural: 'How do you deal with ambiguity in requirements?' — 90 sec recorded","60-sec elevator pitches: explain Kafka · Docker · RAG — record all three separately","Full 20-min English practice: mock Qs + shadow 3 min Kurzgesagt + Elsa Speak","Rest"],
  w9: ["Record 60 sec: 'What is the sliding window technique and when do you use it?'","Elsa Speak 10 min · Record: 'How do you approach a coding problem you haven't seen?'","Lex Fridman 10 min: note deliberate pausing before answers · Try it yourself","Record 60 sec: 'What is a stack and give a real-world example of when you'd use one'","STAR story: 'Tell me about a complex algorithm or data structure you used at work'","Mock Q: 'What is your experience with algorithms and data structures in your role?'","10 min Elsa Speak only"],
  w10:["Record 60 sec: 'Explain the difference between BFS and DFS when traversing a tree'","EU accent: Estonian or Dutch engineer on YouTube 8 min · Note specific word sounds","Record 60 sec: walk through your 'Number of Islands' approach step by step aloud","STAR story: 'Describe a technically complex problem you solved at work' — 90 sec","2-min fluency: explain dynamic programming without stopping. Record. Don't worry about mistakes.","Mock Q: 'How do you balance writing maintainable code with meeting deadlines?'","Rest"],
  w11:["Elsa Speak 10 min + drill all tech vocab from this week","Record 60 sec: 'Explain dynamic programming to a junior developer'","Record STAR Stories 1 & 2 aloud · Listen back critically · Redo each once","Record STAR Stories 5 & 8 aloud · Listen back · Fix structure where you rambled","8 STAR stories back-to-back from memory — no notes — English stamina training","'Tell me about yourself' — final rehearsed version · Record · This is your opener","Rest"],
  w12:["Shadow exercise: Kurzgesagt YouTube video 3 min — repeat every sentence 2 sec behind","Anki or word list: test every tech vocab word from all 4 months · Mark hesitations","Record both: 'What's your biggest technical strength?' and 'Area you're actively improving?'","Record 90 sec: 'How do you balance consistency and availability in distributed systems?'","Write + read aloud a professional LinkedIn referral request message · Edit for natural tone","Full mock interview 20 min — record as your benchmark · listen after","Rest"],
  w13:["Elsa Speak 10 min · Record 60 sec at full interview energy — simulate the nerves","Practice clarifying questions aloud: 'Could you clarify…?', 'Just to confirm…', 'Would it be fair to say…?'","Write + read aloud a professional application follow-up email","Record your 5 prepared 'questions for the interviewer' — natural, not rehearsed-sounding","Practice salary negotiation phrases aloud until they feel completely natural","Full 25-min mock interview — record + listen · This is your weekly benchmark","Rest"],
  w14:["Write + read aloud post-interview thank-you email · Keep it specific to the conversation","Read target company engineering blog paragraph aloud → explain it in your own words (60 sec)","Listen to your Week 1 recording → record the same answer now → hear the difference","Record professional response to a rejection: 'I'd appreciate any feedback on areas to strengthen'","Record 5 prepared interview Qs for the interviewer — final natural version, no nerves","Listen to 3 old recordings vs. today's — the improvement is real. Note it.","Rest"],
  w15:["Shadow Kurzgesagt every day this week — 3 min daily, 2-second repeat-behind","Record: 'I'm confident in my ability to contribute from day one because…' — say 5x until natural","Practice: 'I'm delighted to accept the offer. I'd like to confirm the start date…' — warm + clear","Read a government relocation guide page aloud → summarise in 3 sentences","Final LinkedIn outreach messages — natural professional tone · Read each aloud before sending","Record 3-min: 'Tell me about yourself and your journey' — from India to here","Rest — you've earned it"],
  w16:["Record: 'I'm confident in my ability to…' — until completely natural, no hesitation","Practice: 'I'm delighted to accept the offer' — warm, clear, professional. Record.","Write + read aloud your resignation letter — warm, grateful, no bridges burned","Write your 6-month English goal after arriving in Europe. Commit to it in writing.","Final LinkedIn outreach messages · Read each aloud · Polish tone","Record Day 1 of your next chapter: who are you now after 110 days?","Rest"],
};

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
  TOPICS.forEach(t => t.subtopics.forEach(s => s.items.forEach((_,i) => { checks[`${s.id}-${i}`] = false; })));
  const weeks = {};
  WEEKS.forEach(w => { weeks[w.id] = {}; for(let d=0;d<7;d++) weeks[w.id][d] = {tech:false,english:false}; });
  const apps = {};
  const stars = {};
  STAR_STORIES.forEach((_,i) => { stars[i] = {written:false,recorded:false}; });
  return { checks, weeks, apps, stars, journalEntries:[], jobs:[], jobsFetchedAt:null, customApps:[] };
};

// ── Tiny UI components ────────────────────────────────────────────────────────
const Checkbox = ({ checked, onChange, color="#3B82F6", size=16 }) => (
  <button onClick={e=>{e.stopPropagation();onChange();}} style={{
    width:size, height:size, minWidth:size, borderRadius:4, padding:0, cursor:"pointer",
    border: checked ? "none" : "2px solid #D1D5DB",
    background: checked ? color : "transparent",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"all 0.2s", flexShrink:0,
  }}>
    {checked && <svg width={size-4} height={size-4} viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>}
  </button>
);

const ProgressRing = ({ value, size=56, color="#3B82F6", label="" }) => {
  const r = (size-6)/2, circ = 2*Math.PI*r, dash = circ*(value/100);
  return (
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 0.5s ease"}}/>
      </svg>
      <span style={{fontSize:11,fontWeight:700,color,zIndex:1}}>{value}%</span>
    </div>
  );
};

const ProgressBar = ({ value, color="#3B82F6", height=6 }) => (
  <div style={{height,background:"#F3F4F6",borderRadius:height,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,Math.max(0,value))}%`,background:color,borderRadius:height,transition:"width 0.5s ease"}}/>
  </div>
);

const Tag = ({ label, color }) => (
  <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:`${color}18`,color,border:`1px solid ${color}30`}}>{label}</span>
);

const GlassCard = ({ children, style={}, onClick }) => (
  <div onClick={onClick} style={{
    background:"rgba(255,255,255,0.85)", backdropFilter:"blur(12px)",
    borderRadius:16, border:"1px solid rgba(255,255,255,0.6)",
    boxShadow:"0 4px 24px rgba(0,0,0,0.06)", ...style
  }}>{children}</div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(defaultState);
  const [view, setView] = useState("dashboard");
  const [activePhase, setActivePhase] = useState("p1");
  const [activeWeek, setActiveWeek] = useState("w1");
  const [activeTopic, setActiveTopic] = useState("t1");
  const [expandedDay, setExpandedDay] = useState(null);
  const [journalText, setJournalText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTION, DOC_ID));
        if (snap.exists()) setState(s => ({ ...defaultState(), ...snap.data() }));
      } catch(e) { console.error("Load error:", e); }
      setLoaded(true);
    })();
  }, []);

  const save = useCallback(async (ns) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await setDoc(doc(db, COLLECTION, DOC_ID), ns); } catch(e) { console.error(e); }
      setSaving(false);
    }, 800);
  }, []);

  const update = useCallback(fn => {
    setState(prev => { const next = fn(prev); save(next); return next; });
  }, [save]);

  const toggleCheck = key => update(s => ({ ...s, checks: { ...s.checks, [key]: !s.checks[key] } }));
  const toggleDay = (wk, di, field) => update(s => ({
    ...s, weeks: { ...s.weeks, [wk]: { ...s.weeks[wk], [di]: { ...s.weeks[wk][di], [field]: !s.weeks[wk][di][field] } } }
  }));
  const toggleStar = (i, f) => update(s => ({ ...s, stars: { ...s.stars, [i]: { ...s.stars[i], [f]: !s.stars[i][f] } } }));
  const setAppStatus = (id, status) => update(s => ({ ...s, apps: { ...s.apps, [id]: { ...(s.apps[id]||{}), status } } }));
  const setAppNotes  = (id, notes)  => update(s => ({ ...s, apps: { ...s.apps, [id]: { ...(s.apps[id]||{}), notes  } } }));

  const addJournal = () => {
    if (!journalText.trim()) return;
    const entry = { id: Date.now(), date: new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}), text: journalText.trim() };
    update(s => ({ ...s, journalEntries: [entry, ...(s.journalEntries||[])] }));
    setJournalText("");
  };
  const deleteJournal = id => update(s => ({ ...s, journalEntries: (s.journalEntries||[]).filter(e => e.id !== id) }));

  const fetchJobs = async () => {
    setJobsLoading(true); setJobsError(null);
    try {
      const r = await fetch("/api/jobs");
      const d = await r.json();
      update(s => ({ ...s, jobs: d.jobs || [], jobsFetchedAt: d.fetched_at }));
    } catch(e) {
      setJobsError("Could not fetch jobs. Check your internet connection.");
    }
    setJobsLoading(false);
  };

  // ── Stats helpers ─────────────────────────────────────────────────────────
  const completedDays = buildCompletedSet(state.weeks, WEEKS);
  const totalChecks = Object.keys(state.checks).length;
  const doneChecks  = Object.values(state.checks).filter(Boolean).length;

  const weekProg = wk => {
    const days = state.weeks[wk] || {};
    const done = Object.values(days).reduce((a,d) => a+(d.tech?1:0)+(d.english?1:0), 0);
    return Math.round((done/14)*100);
  };
  const phaseProg = pid => {
    const pw = WEEKS.filter(w => w.phase===pid);
    const total = pw.length*14;
    const done = pw.reduce((a,w) => a+Object.values(state.weeks[w.id]||{}).reduce((b,d)=>b+(d.tech?1:0)+(d.english?1:0),0),0);
    return Math.round((done/total)*100);
  };
  const topicProg = tid => {
    const t = TOPICS.find(t=>t.id===tid); if(!t) return 0;
    let total=0,done=0;
    t.subtopics.forEach(s=>s.items.forEach((_,i)=>{total++;if(state.checks[`${s.id}-${i}`])done++;}));
    return total>0?Math.round((done/total)*100):0;
  };

  // Get subtopics for a given day
  const getDaySubtopics = (weekId, dayIdx) => {
    const mapVal = DAY_TOPIC_MAP[weekId]?.[dayIdx];
    if (!mapVal) return [];
    return mapVal.split(",").flatMap(subId => {
      const topic = TOPICS.find(t => t.subtopics.some(s => s.id===subId.trim()));
      const sub   = topic?.subtopics.find(s => s.id===subId.trim());
      if (!sub) return [];
      return sub.items.map((item, i) => ({
        key: `${sub.id}-${i}`, label: item, color: topic.color, group: sub.group, topicLabel: topic.label
      }));
    });
  };

  const SC = {
    done:    { bg:"#F0FDF9", left:"#10B981", badge:"✅ Done",     bc:"#10B981", bb:"#D1FAE5" },
    today:   { bg:"#EFF6FF", left:"#3B82F6", badge:"📍 Today",    bc:"#3B82F6", bb:"#DBEAFE" },
    overdue: { bg:"#FFFBEB", left:"#F59E0B", badge:"⏳ Pending",  bc:"#F59E0B", bb:"#FEF3C7" },
    upcoming:{ bg:"#fff",    left:"transparent", badge:null, bc:null, bb:null },
    break:   { bg:"#F0FDF4", left:"transparent", badge:null, bc:null, bb:null },
  };

  const ph  = PHASES.find(p=>p.id===activePhase)||PHASES[0];
  const ct  = TOPICS.find(t=>t.id===activeTopic)||TOPICS[0];
  const cw  = WEEKS.find(w=>w.id===activeWeek)||WEEKS[0];
  const cwPh= PHASES.find(p=>p.id===cw.phase)||PHASES[0];

  const appStatusColor = {"not-applied":"#9CA3AF","applied":"#3B82F6","interview":"#F59E0B","offer":"#10B981","rejected":"#EF4444"};
  const appStatusLabel = {"not-applied":"Not Applied","applied":"Applied","interview":"Interviewing","offer":"Offer 🎉","rejected":"Rejected"};

  const NAV = [
    {id:"dashboard",icon:"⊞",label:"Dashboard"},
    {id:"weekly",   icon:"📅",label:"Daily Log"},
    {id:"topics",   icon:"📚",label:"Topics"},
    {id:"jobs",     icon:"💼",label:"Jobs"},
    {id:"english",  icon:"🗣",label:"English"},
    {id:"journal",  icon:"✏️",label:"Journal"},
  ];

  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)"}}>
      <div style={{textAlign:"center",color:"#fff"}}>
        <div style={{fontSize:48,marginBottom:16,animation:"spin 1s linear infinite"}}>🔄</div>
        <div style={{fontSize:16,fontWeight:600}}>Loading your tracker…</div>
        <div style={{fontSize:12,opacity:0.7,marginTop:4}}>Syncing from Firebase</div>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',system-ui,sans-serif",
      background:"linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdf4 100%)",overflow:"hidden"}}>

      {/* ── Sidebar ── */}
      <div style={{width:210,background:"linear-gradient(180deg,#0f172a 0%,#1e1b4b 100%)",
        display:"flex",flexDirection:"column",padding:"0",flexShrink:0,
        boxShadow:"4px 0 24px rgba(0,0,0,0.15)"}}>
        <div style={{padding:"24px 20px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:11,fontWeight:800,color:"#a5b4fc",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>EU Switch</div>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Career Tracker</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>
            {saving ? "⟳ Saving…" : "✓ Cloud synced"}
          </div>
        </div>

        {/* Overall ring */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:12}}>
          <ProgressRing value={Math.round((doneChecks/totalChecks)*100)} size={48} color="#818cf8"/>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Overall</div>
            <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{doneChecks}/{totalChecks} topics</div>
          </div>
        </div>

        <div style={{flex:1,padding:"12px 10px",overflowY:"auto"}}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setView(n.id)} style={{
              width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
              borderRadius:10,border:"none",cursor:"pointer",marginBottom:2,textAlign:"left",
              background: view===n.id ? "rgba(129,140,248,0.2)" : "transparent",
              color: view===n.id ? "#a5b4fc" : "rgba(255,255,255,0.5)",
              fontSize:13,fontWeight:view===n.id?600:400,transition:"all 0.15s",
              borderLeft: view===n.id ? "3px solid #818cf8" : "3px solid transparent",
            }}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        {/* Phase progress */}
        <div style={{padding:"12px 16px 20px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          {PHASES.map(p=>(
            <div key={p.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{p.label}</span>
                <span style={{fontSize:10,color:p.color,fontWeight:600}}>{phaseProg(p.id)}%</span>
              </div>
              <ProgressBar value={phaseProg(p.id)} color={p.color} height={3}/>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{flex:1,overflowY:"auto",padding:28}}>

        {/* ══════════════ DASHBOARD ══════════════ */}
        {view==="dashboard" && (
          <div>
            <div style={{marginBottom:24}}>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.ink}}>Good evening, Aayushi 👋</h1>
              <p style={{margin:"4px 0 0",fontSize:13,color:G.dgray}}>
                Started {START_DATE.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · Synced across all your devices
              </p>
            </div>

            {/* Today card */}
            {(() => {
              const today = new Date(); today.setHours(0,0,0,0);
              let todayIdx = null;
              for(let i=0;i<112;i++){
                const d=getScheduledDate(i,completedDays); d.setHours(0,0,0,0);
                if(d.getTime()===today.getTime()){todayIdx=i;break;}
              }
              if(todayIdx===null) return (
                <GlassCard style={{padding:24,marginBottom:24,background:"linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))"}}>
                  <div style={{fontSize:15,fontWeight:600,color:G.ink}}>🎉 No scheduled study day today — take a rest or catch up!</div>
                </GlassCard>
              );
              const wi=Math.floor(todayIdx/7), di=todayIdx%7;
              const week=WEEKS[wi]; const isBreak=di===6;
              const techTask=week?(DAILY_TECH[week.id]?.[di]||"Study session"):null;
              const engTask=week?(DAILY_ENGLISH[week.id]?.[di]||"15 min English"):null;
              const ds=week?(state.weeks[week.id]?.[di]||{tech:false,english:false}):null;
              const phase=week?PHASES.find(p=>p.id===week.phase):null;
              const daySubs=week?getDaySubtopics(week.id,di):[];
              const subsDone=daySubs.filter(s=>state.checks[s.key]).length;

              return (
                <div style={{background:`linear-gradient(135deg,${phase?.color||"#6366f1"}dd,${phase?.color||"#6366f1"}99)`,
                  borderRadius:20,padding:24,marginBottom:24,color:"#fff",
                  boxShadow:`0 8px 32px ${phase?.color||"#6366f1"}44`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,opacity:0.8,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>
                        📍 Today · {today.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
                      </div>
                      <div style={{fontSize:20,fontWeight:800,marginBottom:2}}>Day {todayIdx+1} · {week?.id?.toUpperCase()}</div>
                      <div style={{fontSize:13,opacity:0.8}}>{week?.label}</div>
                    </div>
                    {daySubs.length>0 && (
                      <div style={{background:"rgba(255,255,255,0.2)",borderRadius:12,padding:"6px 14px",textAlign:"center"}}>
                        <div style={{fontSize:20,fontWeight:800}}>{subsDone}/{daySubs.length}</div>
                        <div style={{fontSize:10,opacity:0.8}}>subtopics</div>
                      </div>
                    )}
                  </div>
                  {isBreak ? (
                    <div style={{fontSize:15,fontWeight:600}}>💚 Full Break Day — Rest and recharge</div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div onClick={()=>toggleDay(week.id,di,"tech")} style={{
                        background: ds?.tech?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)",
                        border:`1px solid ${ds?.tech?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}`,
                        borderRadius:12,padding:"12px 14px",cursor:"pointer",transition:"all 0.2s",
                      }}>
                        <div style={{fontSize:11,fontWeight:700,marginBottom:6,opacity:0.9}}>💻 TECH (60 min) {ds?.tech?"✅":""}</div>
                        <div style={{fontSize:12,opacity:0.85,lineHeight:1.4}}>{techTask}</div>
                      </div>
                      <div onClick={()=>toggleDay(week.id,di,"english")} style={{
                        background: ds?.english?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)",
                        border:`1px solid ${ds?.english?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}`,
                        borderRadius:12,padding:"12px 14px",cursor:"pointer",transition:"all 0.2s",
                      }}>
                        <div style={{fontSize:11,fontWeight:700,marginBottom:6,opacity:0.9}}>🗣 ENGLISH (15–20 min) {ds?.english?"✅":""}</div>
                        <div style={{fontSize:12,opacity:0.85,lineHeight:1.4}}>{engTask}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Phase cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
              {PHASES.map(p=>{
                const prog=phaseProg(p.id);
                return (
                  <GlassCard key={p.id} onClick={()=>{setView("weekly");setActivePhase(p.id);setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");}}
                    style={{padding:18,cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.12)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                  >
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:p.color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{p.label}</div>
                        <div style={{fontSize:13,fontWeight:700,color:G.ink}}>{p.subtitle}</div>
                        <div style={{fontSize:11,color:G.dgray}}>{p.weeks}</div>
                      </div>
                      <ProgressRing value={prog} size={44} color={p.color}/>
                    </div>
                    <ProgressBar value={prog} color={p.color} height={4}/>
                  </GlassCard>
                );
              })}
            </div>

            {/* Topic progress + App pipeline */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <GlassCard style={{padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:G.ink,marginBottom:14}}>Topic Checklist Progress</div>
                {TOPICS.map(t=>{
                  const prog=topicProg(t.id);
                  return (
                    <div key={t.id} style={{marginBottom:12,cursor:"pointer"}} onClick={()=>{setView("topics");setActiveTopic(t.id);}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:500,color:G.ink}}>{t.label}</span>
                        <span style={{fontSize:11,fontWeight:700,color:t.color}}>{prog}%</span>
                      </div>
                      <ProgressBar value={prog} color={t.color} height={6}/>
                    </div>
                  );
                })}
              </GlassCard>

              <GlassCard style={{padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:G.ink,marginBottom:14}}>Application Pipeline</div>
                {Object.entries(appStatusLabel).map(([status,label])=>{
                  const count=Object.values(state.apps).filter(a=>a.status===status).length;
                  return (
                    <div key={status} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F3F4F6"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:appStatusColor[status]}}/>
                        <span style={{fontSize:13,color:G.ink}}>{label}</span>
                      </div>
                      <span style={{fontSize:15,fontWeight:700,color:appStatusColor[status]}}>{count}</span>
                    </div>
                  );
                })}
                <button onClick={()=>setView("jobs")} style={{marginTop:12,fontSize:12,color:G.blue,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600}}>
                  Browse jobs →
                </button>
              </GlassCard>
            </div>

            {/* STAR stories */}
            <GlassCard style={{padding:20}}>
              <div style={{fontSize:14,fontWeight:700,color:G.ink,marginBottom:12}}>STAR Stories</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 24px"}}>
                {STAR_STORIES.map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #F9FAFB"}}>
                    <Checkbox checked={!!state.stars[i]?.written} onChange={()=>toggleStar(i,"written")} size={14}/>
                    <span style={{fontSize:12,color:G.ink,flex:1}}>{s}</span>
                    <Checkbox checked={!!state.stars[i]?.recorded} onChange={()=>toggleStar(i,"recorded")} color={G.purple} size={14}/>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                <span style={{fontSize:10,color:G.dgray}}>◀ Written</span>
                <span style={{fontSize:10,color:G.dgray}}>Recorded ▶</span>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ══════════════ DAILY LOG ══════════════ */}
        {view==="weekly" && (
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.ink}}>Daily Log</h1>
              <p style={{margin:"4px 0 0",fontSize:13,color:G.dgray}}>Tick tech + English · Expand any day to tick subtopics · Sunday = mandatory break</p>
            </div>

            {/* Phase tabs */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {PHASES.map(p=>(
                <button key={p.id} onClick={()=>{setActivePhase(p.id);setActiveWeek(WEEKS.find(w=>w.phase===p.id)?.id||"w1");}} style={{
                  padding:"7px 16px",borderRadius:24,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                  background: activePhase===p.id ? p.grad : "rgba(255,255,255,0.7)",
                  color: activePhase===p.id ? "#fff" : G.dgray,
                  boxShadow: activePhase===p.id ? `0 4px 12px ${p.color}44` : "none",
                  transition:"all 0.2s",
                }}>
                  {p.label} · {p.weeks}
                </button>
              ))}
            </div>

            {/* Week tabs */}
            <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
              {WEEKS.filter(w=>w.phase===activePhase).map(w=>(
                <button key={w.id} onClick={()=>setActiveWeek(w.id)} style={{
                  padding:"5px 14px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:activeWeek===w.id?700:400,
                  border: activeWeek===w.id ? `2px solid ${ph.color}` : "2px solid #E5E7EB",
                  background: activeWeek===w.id ? ph.light : "rgba(255,255,255,0.7)",
                  color: activeWeek===w.id ? ph.color : G.dgray,
                  transition:"all 0.15s",
                }}>
                  {w.id.toUpperCase()} · {weekProg(w.id)}%
                </button>
              ))}
            </div>

            <GlassCard>
              <div style={{padding:"16px 20px",background:cwPh.light,borderRadius:"16px 16px 0 0",borderBottom:"1px solid #E5E7EB"}}>
                <div style={{fontSize:12,fontWeight:700,color:cwPh.color,letterSpacing:"0.06em",textTransform:"uppercase"}}>{cw.id.toUpperCase()} · {cwPh.label}</div>
                <div style={{fontSize:16,fontWeight:700,color:G.ink,marginTop:2}}>{cw.label}</div>
                <div style={{fontSize:12,color:G.dgray,marginTop:4}}>Progress: <strong>{weekProg(cw.id)}%</strong> · Click any day to expand subtopics</div>
              </div>

              {(() => {
                const weekIdx = WEEKS.findIndex(w=>w.id===cw.id);
                return DAY_LABELS.map((day,di)=>{
                  const isBreak = di===6;
                  const globalIdx = weekIdx*7+di;
                  const ds = state.weeks[cw.id]?.[di]||{tech:false,english:false};
                  const techTask = DAILY_TECH[cw.id]?.[di]||"Study session";
                  const engTask  = DAILY_ENGLISH[cw.id]?.[di]||"15 min English";
                  const dayNum   = globalIdx+1;
                  const schDate  = getScheduledDate(globalIdx, completedDays);
                  const dateStr  = formatDate(schDate);
                  const isDone   = !isBreak && ds.tech && ds.english;
                  const status   = getDayStatus(schDate, isDone, isBreak);
                  const sc       = SC[status]||SC.upcoming;
                  const isExpanded = expandedDay===`${cw.id}-${di}`;
                  const daySubs  = getDaySubtopics(cw.id, di);
                  const subsDone = daySubs.filter(s=>state.checks[s.key]).length;

                  return (
                    <div key={di} style={{borderBottom: di<6 ? "1px solid #F3F4F6" : "none"}}>
                      {/* Day header row */}
                      <div onClick={()=>!isBreak&&setExpandedDay(isExpanded?null:`${cw.id}-${di}`)}
                        style={{display:"flex",alignItems:"flex-start",padding:"14px 20px",
                          background:sc.bg, borderLeft:`3px solid ${sc.left}`,
                          cursor:isBreak?"default":"pointer",transition:"background 0.15s",
                        }}
                        onMouseEnter={e=>{if(!isBreak)e.currentTarget.style.background=status==="today"?"#EFF6FF":status==="overdue"?"#FFF5F5":"#FAFAFA";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=sc.bg;}}
                      >
                        {/* Date column */}
                        <div style={{width:68,flexShrink:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:status==="overdue"?G.red:status==="today"?G.blue:isBreak?G.green:"#374151"}}>{day}</div>
                          <div style={{fontSize:10,color:G.dgray}}>Day {dayNum}</div>
                          <div style={{fontSize:10,fontWeight:status==="today"?700:400,color:status==="overdue"?G.red:status==="today"?G.blue:G.dgray}}>{dateStr}</div>
                        </div>

                        {/* Content */}
                        <div style={{flex:1,marginLeft:10}}>
                          {isBreak ? (
                            <div style={{fontSize:13,color:G.green,fontWeight:600}}>💚 Full Break — Rest, recharge, no tech</div>
                          ) : (
                            <>
                              {sc.badge && (
                                <span style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:20,background:sc.bb,color:sc.bc,marginBottom:6}}>
                                  {sc.badge}{status==="overdue"?" · upcoming days shifted +1":""}
                                </span>
                              )}
                              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}} onClick={e=>e.stopPropagation()}>
                                <Checkbox checked={ds.tech} onChange={()=>toggleDay(cw.id,di,"tech")}/>
                                <div>
                                  <span style={{fontSize:11,fontWeight:700,color:G.blue}}>💻 TECH (60 min) · </span>
                                  <span style={{fontSize:12,color:"#374151"}}>{techTask}</span>
                                </div>
                              </div>
                              <div style={{display:"flex",alignItems:"flex-start",gap:8}} onClick={e=>e.stopPropagation()}>
                                <Checkbox checked={ds.english} onChange={()=>toggleDay(cw.id,di,"english")} color={G.purple}/>
                                <div>
                                  <span style={{fontSize:11,fontWeight:700,color:G.purple}}>🗣 ENGLISH (15–20 min) · </span>
                                  <span style={{fontSize:12,color:"#374151"}}>{engTask}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Right side */}
                        {!isBreak && (
                          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8,flexShrink:0}}>
                            {daySubs.length>0 && (
                              <div style={{textAlign:"center",background:"#F3F4F6",borderRadius:8,padding:"4px 10px"}}>
                                <div style={{fontSize:13,fontWeight:700,color:G.ink}}>{subsDone}/{daySubs.length}</div>
                                <div style={{fontSize:9,color:G.dgray}}>topics</div>
                              </div>
                            )}
                            <span style={{fontSize:12,color:G.dgray,transition:"transform 0.2s",
                              transform:isExpanded?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded subtopics */}
                      {isExpanded && daySubs.length>0 && (
                        <div style={{padding:"12px 20px 16px 88px",background:"#FAFAFA",borderTop:"1px solid #F3F4F6"}}>
                          <div style={{fontSize:11,fontWeight:700,color:G.dgray,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                            📚 Today's Subtopics — tick as you cover each one
                          </div>
                          {/* Group by topic */}
                          {(() => {
                            const groups = {};
                            daySubs.forEach(s => {
                              const key = `${s.topicLabel}|${s.group}`;
                              if (!groups[key]) groups[key] = {topicLabel:s.topicLabel, group:s.group, color:s.color, items:[]};
                              groups[key].items.push(s);
                            });
                            return Object.values(groups).map((g,gi)=>(
                              <div key={gi} style={{marginBottom:10}}>
                                <div style={{fontSize:11,fontWeight:700,color:g.color,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{width:4,height:14,borderRadius:2,background:g.color,display:"inline-block"}}/>
                                  {g.topicLabel} · {g.group}
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
                                  {g.items.map((item,ii)=>(
                                    <div key={ii} onClick={()=>toggleCheck(item.key)}
                                      style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,cursor:"pointer",
                                        background:state.checks[item.key]?"#F0FDF4":"transparent",transition:"background 0.15s"}}
                                      onMouseEnter={e=>{if(!state.checks[item.key])e.currentTarget.style.background="#F9FAFB";}}
                                      onMouseLeave={e=>{e.currentTarget.style.background=state.checks[item.key]?"#F0FDF4":"transparent";}}>
                                      <Checkbox checked={!!state.checks[item.key]} onChange={()=>toggleCheck(item.key)} color={item.color} size={14}/>
                                      <span style={{fontSize:12,color:state.checks[item.key]?G.dgray:"#374151",
                                        textDecoration:state.checks[item.key]?"line-through":"none"}}>{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                          <div style={{marginTop:10,fontSize:11,color:G.dgray,fontStyle:"italic"}}>
                            ✨ These checkmarks also update your Topics section automatically
                          </div>
                        </div>
                      )}

                      {isExpanded && daySubs.length===0 && !isBreak && (
                        <div style={{padding:"12px 20px 16px 88px",background:"#FAFAFA",borderTop:"1px solid #F3F4F6",fontSize:12,color:G.dgray,fontStyle:"italic"}}>
                          This is a review / application day — no specific subtopics. Use the Topics section to tick what you revise.
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </GlassCard>
          </div>
        )}

        {/* ══════════════ TOPICS ══════════════ */}
        {view==="topics" && (
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.ink}}>Topic Checklist</h1>
              <p style={{margin:"4px 0 0",fontSize:13,color:G.dgray}}>Tick each subtopic — also tickable directly from Daily Log</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {TOPICS.map(t=>(
                <button key={t.id} onClick={()=>setActiveTopic(t.id)} style={{
                  padding:"7px 16px",borderRadius:24,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                  background: activeTopic===t.id ? t.color : "rgba(255,255,255,0.8)",
                  color: activeTopic===t.id ? "#fff" : G.dgray,
                  boxShadow: activeTopic===t.id ? `0 4px 12px ${t.color}44` : "none",
                  transition:"all 0.2s",
                }}>
                  {t.label.split(" ").slice(0,3).join(" ")} · {topicProg(t.id)}%
                </button>
              ))}
            </div>

            <GlassCard>
              <div style={{padding:"18px 22px",borderBottom:"1px solid #F3F4F6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:G.ink}}>{ct.label}</div>
                  <div style={{fontSize:12,color:G.dgray,marginTop:2}}>{topicProg(ct.id)}% complete</div>
                </div>
                <ProgressRing value={topicProg(ct.id)} size={56} color={ct.color}/>
              </div>
              <div style={{padding:"16px 22px"}}>
                {ct.subtopics.map(sub=>{
                  const subDone=sub.items.filter((_,i)=>state.checks[`${sub.id}-${i}`]).length;
                  return (
                    <div key={sub.id} style={{marginBottom:20}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{width:4,height:18,borderRadius:2,background:ct.color,display:"inline-block"}}/>
                          <span style={{fontSize:13,fontWeight:700,color:"#374151"}}>{sub.group}</span>
                        </div>
                        <Tag label={`${subDone}/${sub.items.length}`} color={ct.color}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
                        {sub.items.map((item,i)=>{
                          const key=`${sub.id}-${i}`;
                          return (
                            <div key={i} onClick={()=>toggleCheck(key)}
                              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,cursor:"pointer",
                                background:state.checks[key]?"#F0FDF4":"transparent",transition:"background 0.15s"}}
                              onMouseEnter={e=>{if(!state.checks[key])e.currentTarget.style.background="#F9FAFB";}}
                              onMouseLeave={e=>{e.currentTarget.style.background=state.checks[key]?"#F0FDF4":"transparent";}}>
                              <Checkbox checked={!!state.checks[key]} onChange={()=>toggleCheck(key)} color={ct.color} size={15}/>
                              <span style={{fontSize:12,color:state.checks[key]?G.dgray:"#374151",
                                textDecoration:state.checks[key]?"line-through":"none",lineHeight:1.4}}>{item}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {/* ══════════════ JOBS ══════════════ */}
        {view==="jobs" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.ink}}>EU Java Jobs</h1>
                <p style={{margin:"4px 0 0",fontSize:13,color:G.dgray}}>
                  Live listings from arbeitnow.com — visa sponsorship + relocation
                  {state.jobsFetchedAt && <span style={{color:G.dgray}}> · Last fetched {new Date(state.jobsFetchedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                </p>
              </div>
              <button onClick={fetchJobs} disabled={jobsLoading} style={{
                padding:"10px 22px",borderRadius:12,border:"none",cursor:jobsLoading?"not-allowed":"pointer",
                background: jobsLoading ? "#E5E7EB" : "linear-gradient(135deg,#3B82F6,#1D4ED8)",
                color: jobsLoading ? G.dgray : "#fff",fontSize:13,fontWeight:700,
                boxShadow: jobsLoading ? "none" : "0 4px 12px #3B82F644",
                transition:"all 0.2s",display:"flex",alignItems:"center",gap:8,
              }}>
                {jobsLoading ? "⟳ Fetching…" : "🔄 Refresh Jobs"}
              </button>
            </div>

            {/* Pipeline summary */}
            <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
              {Object.entries(appStatusLabel).map(([status,label])=>{
                const count=Object.values(state.apps).filter(a=>a.status===status).length;
                return (
                  <GlassCard key={status} style={{padding:"12px 18px",textAlign:"center",minWidth:90}}>
                    <div style={{fontSize:22,fontWeight:800,color:appStatusColor[status]}}>{count}</div>
                    <div style={{fontSize:10,color:G.dgray,marginTop:2}}>{label}</div>
                  </GlassCard>
                );
              })}
            </div>

            {jobsError && (
              <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,padding:16,marginBottom:20,color:G.red,fontSize:13}}>
                ⚠️ {jobsError} — showing cached or fallback listings below.
              </div>
            )}

            {(state.jobs||[]).length===0 && !jobsLoading && (
              <GlassCard style={{padding:40,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12}}>💼</div>
                <div style={{fontSize:15,fontWeight:600,color:G.ink,marginBottom:6}}>No jobs loaded yet</div>
                <div style={{fontSize:13,color:G.dgray,marginBottom:20}}>Click "Refresh Jobs" to fetch the latest EU Java roles with visa sponsorship</div>
                <button onClick={fetchJobs} style={{padding:"10px 24px",borderRadius:12,border:"none",cursor:"pointer",
                  background:"linear-gradient(135deg,#3B82F6,#1D4ED8)",color:"#fff",fontSize:13,fontWeight:700}}>
                  Fetch Jobs Now
                </button>
              </GlassCard>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {(state.jobs||[]).map((job,ji)=>{
                const appState = state.apps[job.id]||{status:"not-applied",notes:""};
                return (
                  <GlassCard key={job.id||ji} style={{padding:20,transition:"transform 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="";}}
                  >
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{flex:1,marginRight:10}}>
                        <div style={{fontSize:14,fontWeight:700,color:G.ink,lineHeight:1.3,marginBottom:2}}>{job.title}</div>
                        <div style={{fontSize:12,fontWeight:600,color:G.blue}}>{job.company}</div>
                        <div style={{fontSize:11,color:G.dgray,marginTop:2}}>📍 {job.location}</div>
                      </div>
                      <div style={{width:10,height:10,borderRadius:"50%",background:appStatusColor[appState.status],flexShrink:0,marginTop:4}}/>
                    </div>

                    {job.description && (
                      <div style={{fontSize:11,color:"#6B7280",lineHeight:1.5,marginBottom:10,
                        display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                        {job.description}
                      </div>
                    )}

                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                      {job.visa && <Tag label="✈️ Visa" color={G.green}/>}
                      {job.remote && <Tag label="🏠 Remote" color={G.purple}/>}
                      {(job.tags||[]).slice(0,4).map((t,i)=><Tag key={i} label={t} color={G.blue}/>)}
                    </div>

                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                      {Object.entries(appStatusLabel).map(([status,label])=>(
                        <button key={status} onClick={()=>setAppStatus(job.id,status)} style={{
                          padding:"3px 9px",borderRadius:20,border:"1px solid",cursor:"pointer",fontSize:10,fontWeight:600,transition:"all 0.15s",
                          borderColor: appState.status===status ? appStatusColor[status] : "#E5E7EB",
                          background: appState.status===status ? `${appStatusColor[status]}15` : "transparent",
                          color: appState.status===status ? appStatusColor[status] : G.dgray,
                        }}>{label}</button>
                      ))}
                    </div>

                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input value={appState.notes||""} onChange={e=>setAppNotes(job.id,e.target.value)}
                        placeholder="Notes: date, contact, feedback…"
                        style={{flex:1,fontSize:11,color:"#374151",border:"1px solid #F3F4F6",borderRadius:8,
                          padding:"5px 10px",background:"#F9FAFB",outline:"none"}}/>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noreferrer" style={{
                          padding:"5px 12px",borderRadius:8,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)",
                          color:"#fff",fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",
                        }}>Apply →</a>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ ENGLISH ══════════════ */}
        {view==="english" && (
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.ink}}>English Improvement</h1>
              <p style={{margin:"4px 0 0",fontSize:13,color:G.dgray}}>15–20 min every evening · Level 5–6 → Target 7.5+</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
              {[
                {month:"Month 1",color:G.blue,  bg:G.lblue,  focus:"Clarity + Pacing",      habit:"Record → Listen → Redo. Speak 30% slower. Pause at every full stop.",resource:"Elsa Speak (free) · 10 min/day"},
                {month:"Month 2",color:G.green, bg:G.lgreen, focus:"Tech Vocab in Speech",   habit:"3 tech terms/day — say a full sentence using each aloud.",              resource:"Anki Tech English deck · MW Word of the Day"},
                {month:"Month 3",color:G.amber, bg:G.lamber, focus:"Interview Structures",   habit:"Answer 1 mock Q aloud (STAR). Record. Check structure + pacing.",        resource:"Pramp.com (free) · italki.com 1×/week"},
                {month:"Month 4",color:G.purple,bg:G.lpurple,focus:"EU Accent + Polish",     habit:"10 min EU-accented English YouTube. Shadow speaker 2 sec behind.",       resource:"Kurzgesagt YouTube · Lex Fridman Podcast"},
              ].map((m,i)=>(
                <GlassCard key={i} style={{padding:20,background:`linear-gradient(135deg,${m.bg},rgba(255,255,255,0.9))`}}>
                  <div style={{fontSize:10,fontWeight:800,color:m.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{m.month}</div>
                  <div style={{fontSize:16,fontWeight:800,color:G.ink,marginBottom:8}}>{m.focus}</div>
                  <div style={{fontSize:12,color:"#374151",lineHeight:1.6,marginBottom:10}}>{m.habit}</div>
                  <div style={{fontSize:11,color:m.color,fontWeight:600}}>📌 {m.resource}</div>
                </GlassCard>
              ))}
            </div>
            <GlassCard style={{padding:20,background:"linear-gradient(135deg,#F5F3FF,rgba(255,255,255,0.9))",marginBottom:16,border:`1px solid ${G.purple}22`}}>
              <div style={{fontSize:14,fontWeight:800,color:G.purple,marginBottom:8}}>🎙 The Single Most Effective Habit</div>
              <div style={{fontSize:13,color:"#374151",lineHeight:1.7}}>
                <strong>Record → Listen → Redo.</strong> 60 seconds on any topic. Play it back immediately. You will hear exactly what to fix. Redo once. Every evening. This alone moves you from 5–6 to 7.5+ in 4 months.
              </div>
            </GlassCard>
            <GlassCard style={{padding:20}}>
              <div style={{fontSize:14,fontWeight:700,color:G.ink,marginBottom:12}}>STAR Stories Tracker</div>
              {STAR_STORIES.map((story,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<STAR_STORIES.length-1?"1px solid #F9FAFB":"none"}}>
                  <div style={{fontSize:12,color:G.dgray,width:22,textAlign:"center",fontWeight:700}}>{i+1}</div>
                  <div style={{flex:1,fontSize:12,color:G.ink}}>{story}</div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <Checkbox checked={!!state.stars[i]?.written} onChange={()=>toggleStar(i,"written")} size={15}/>
                      <span style={{fontSize:10,color:G.dgray}}>Written</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <Checkbox checked={!!state.stars[i]?.recorded} onChange={()=>toggleStar(i,"recorded")} color={G.purple} size={15}/>
                      <span style={{fontSize:10,color:G.dgray}}>Recorded</span>
                    </div>
                  </div>
                </div>
              ))}
            </GlassCard>
          </div>
        )}

        {/* ══════════════ JOURNAL ══════════════ */}
        {view==="journal" && (
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.ink}}>Study Journal</h1>
              <p style={{margin:"4px 0 0",fontSize:13,color:G.dgray}}>Reflections, blockers, wins, interview feedback — synced to cloud</p>
            </div>
            <GlassCard style={{padding:20,marginBottom:20}}>
              <textarea value={journalText} onChange={e=>setJournalText(e.target.value)}
                placeholder="What did you learn today? What felt hard? Any interview feedback? Write freely…"
                style={{width:"100%",minHeight:110,fontSize:13,color:"#374151",border:"1px solid #E5E7EB",
                  borderRadius:10,padding:14,resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
                <span style={{fontSize:11,color:G.dgray}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</span>
                <button onClick={addJournal} style={{padding:"8px 20px",background:"linear-gradient(135deg,#111827,#1F2937)",
                  color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  Save Entry
                </button>
              </div>
            </GlassCard>
            {(state.journalEntries||[]).length===0 && (
              <div style={{textAlign:"center",padding:"40px 20px",color:G.dgray,fontSize:13}}>
                <div style={{fontSize:32,marginBottom:8}}>📝</div>
                No entries yet. Write your first reflection above.
              </div>
            )}
            {(state.journalEntries||[]).map(entry=>(
              <GlassCard key={entry.id} style={{padding:"16px 20px",marginBottom:12,position:"relative"}}>
                <div style={{fontSize:11,color:G.dgray,marginBottom:8,fontWeight:600}}>{entry.date}</div>
                <div style={{fontSize:13,color:"#374151",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{entry.text}</div>
                <button onClick={()=>deleteJournal(entry.id)} style={{position:"absolute",top:12,right:14,
                  background:"none",border:"none",color:"#D1D5DB",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
