// Page text as the extension captures it (whitespace collapsed, or with line breaks kept), for summary tests.
// Each fixture says what must never appear in its summary.

const bstFlat = 'Member-only story Data Structures Binary Search Tree Explained Insertion, deletion and search in a BST, with pictures ' +
  'Ankit Sharma Follow 6 min read · Jan 4, 2023 112 1 Listen Share ' +
  'A Binary Search Tree (BST) is a data structure that organizes and stores elements in a way that allows for efficient insertion, deletion, and searching of elements. ' +
  'Each node has at most two children, and every value in the left subtree is smaller than the node while every value in the right subtree is larger. ' +
  'Press enter or click to view image in full size A binary search tree with root 8 ' +
  'Operations A Binary Search Tree can be used to perform various operations, including: Insertion: To insert a new element, you traverse the tree starting from the root and compare the value to be inserted with each node. ' +
  'If the value is smaller you go left, otherwise you go right, until you reach an empty spot where the new node is attached. ' +
  'Deletion: Deleting a node with no children simply removes it, while a node with one child is replaced by that child. ' +
  'A node with two children is replaced by its in-order successor, the smallest value in its right subtree. ' +
  'Press enter or click to view image in full size Deleting 3 with two children Searching: Searching for an element in a BST is very efficient. ' +
  'At each step half of the remaining tree can be ignored, so a balanced tree is searched in logarithmic time. ' +
  'Code class Node { constructor(val) { this.val = val; this.left = null; this.right = null; } } function insert(root, val) { if (!root) return new Node(val); } ' +
  'Time Complexity Operation Average Worst Search O(log n) O(n) Insert O(log n) O(n) Delete O(log n) O(n) ' +
  'If the tree becomes skewed, for example after inserting sorted values, it degrades into a linked list and every operation takes linear time. ' +
  'Self-balancing variants such as AVL trees and red-black trees fix this by rotating nodes after insertions and deletions. ' +
  'Thanks for reading! If you found this helpful, give it a clap and follow me for more. ' +
  'Data Structures Algorithms Programming Follow Written by Ankit Sharma 1.2K Followers More from Ankit Sharma Recommended from Medium Help Status About Careers';

const pqFlat = 'Member-only story Programming Interview Datastrucutre Systemdesign Priorities of a “PRIORITY QUEUE” Everything you should know about the Priority queues, it’s application and their implementation LastBrainCell Follow 4 min read · May 12, 2020 24 ' +
  'Priority queue is a simple variation of a bag data structure . Like a bag, you can add new elements into the priority queue. However, the only element that can be accessed or removed is the one value with highest priority. ' +
  'The following table shows priority queue operation names in the C++ STL Operation in C++ STL class priorityQueue<T> Add value -push(E) First Value- top() Remove First Value- pop() ' +
  'Applications of Priority Queue A priority queue is used whenever the next item to process is the most urgent one rather than the oldest one. Operating systems use priority queues to decide which process should get the processor next. ' +
  'Dijkstra’s shortest path algorithm repeatedly takes the closest unvisited vertex from a priority queue. Huffman coding builds its tree by repeatedly removing the two least frequent symbols. ' +
  'Implementation A priority queue can be built on an unsorted list, a sorted list or a binary heap. With an unsorted list, insertion is fast but finding the highest priority element takes linear time. A binary heap keeps both insertion and removal at logarithmic time, which is why most libraries use it. ' +
  'Conclusion Priority queues are a simple idea that shows up in schedulers, graph algorithms and compression. Programming Interview Datastrucutre Systemdesign Follow Written by LastBrainCell 52 Followers More from LastBrainCell Recommended from Medium Help Status About Careers Blog Privacy Terms Text to speech Teams';

const bstLines = `Binary Search Tree Explained
Insertion, deletion and search in a BST, with pictures
Ankit Sharma
Follow
6 min read
·
Jan 4, 2023
A Binary Search Tree (BST) is a data structure that organizes and stores elements in a way that allows for efficient insertion, deletion, and searching of elements.
Each node has at most two children, and every value in the left subtree is smaller than the node while every value in the right subtree is larger.
Press enter or click to view image in full size
A binary search tree with root 8
Operations
A Binary Search Tree can be used to perform various operations, including:
Insertion: To insert a new element, you traverse the tree starting from the root and compare the value to be inserted with each node.
Deletion: A node with two children is replaced by its in-order successor, the smallest value in its right subtree.
Searching: Searching for an element in a BST is very efficient.
class Node {
  constructor(val) { this.val = val; }
}
If the tree becomes skewed, for example after inserting sorted values, it degrades into a linked list and every operation takes linear time.
Self-balancing variants such as AVL trees and red-black trees fix this by rotating nodes after insertions and deletions.`;

const youtube = 'In this video we build a URL shortener from scratch with Node.js and Redis 🚀 ' +
  '⏱️ Timestamps 00:00 Intro 01:12 Designing the API 05:40 Generating short codes 12:03 Storing links in Redis 18:45 Rate limiting 24:10 Deploying ' +
  'The service stores every short code in Redis with an expiry, so lookups take a single round trip. ' +
  'Short codes are generated from a counter encoded in base 62, which keeps them short and avoids collisions. ' +
  'We also add a simple rate limiter so a single client cannot flood the API with requests. ' +
  '🔗 Source code: https://github.com/example/shortener 📚 Redis docs: https://redis.io/docs ' +
  'Subscribe for more system design videos! Follow me on Twitter @devexample #nodejs #redis #systemdesign';

const wiki = 'Binary search tree From Wikipedia, the free encyclopedia "BST" redirects here. For other uses, see BST (disambiguation). ' +
  'In computer science, a binary search tree (BST), also called an ordered or sorted binary tree, is a rooted binary tree data structure with the key of each internal node being greater than all the keys in the respective node\'s left subtree and less than the ones in its right subtree.[1] ' +
  'The time complexity of operations on the binary search tree is linear with respect to the height of the tree.[2] ' +
  'Binary search trees allow binary search for fast lookup, addition, and removal of data items.[3] ' +
  'History The binary search tree algorithm was discovered independently by several researchers, including P.F. Windley, Andrew Donald Booth, Andrew Colin, Thomas N. Hibbard.[4][5] ' +
  'The algorithm is attributed to Conway Berners-Lee and David Wheeler, who used it for storing labeled data in magnetic tapes in 1960.[6] ' +
  'Overview A binary search tree is a rooted binary tree in which nodes are arranged in strict total order in which the nodes with keys greater than any particular node A is stored on the right sub-trees to that node A and the nodes with keys equal to or less than A are stored on the left sub-trees to A, satisfying the binary search property.[7] ' +
  'Binary search trees are also efficacious in sortings and search algorithms.[edit] See also Search tree Join-based tree algorithms References';

const mdn = 'Array.prototype.push() The push() method of Array instances adds the specified elements to the end of an array and returns the new length of the array. ' +
  'Try it const animals = ["pigs", "goats", "sheep"]; const count = animals.push("cows"); console.log(count); // Expected output: 4 ' +
  'Syntax push() push(element1) push(element1, element2) push(element1, element2, /* …, */ elementN) ' +
  'Parameters element1, …, elementN The element(s) to add to the end of the array. Return value The new length property of the object upon which the method was called. ' +
  'Description The push() method appends values to an array. ' +
  'Array.prototype.unshift() has similar behavior to push(), but applied to the start of an array. ' +
  'The push() method is a mutating method. It changes the length and the content of this. ' +
  'In case you want the value of this to be the same, but return a new array with elements appended to the end, you can use arr.concat([element0, element1, /* ... ,*/ elementN]) instead. ' +
  'Notice that the elements are wrapped in an extra array — otherwise, if the element is an array itself, it would be spread instead of pushed as a single element due to the behavior of concat().';

const news = 'Technology Advertisement Share Save ' +
  'City council approves plan to add 40 kilometres of protected bike lanes By Priya Nair, Transport reporter 3 hours ago ' +
  'The city council voted on Tuesday to build 40 kilometres of protected bike lanes over the next three years. ' +
  'The plan focuses on the routes where most cycling accidents happened in the last decade, according to the transport department. ' +
  'Advertisement Supporters say separated lanes will encourage more people to cycle to work and reduce traffic. ' +
  'Some shop owners worry that losing parking spaces will hurt their business, and the council promised to review each street before work begins. ' +
  'Read more: Why cities are redesigning their streets Related Topics Cycling Transport Local politics ' +
  'Construction on the first section is expected to start next spring. More on this story';

const gfg = 'Last Updated : 12 Mar, 2024 Improve Improve Like Article Like Save Share Report ' +
  'What is a Binary Search Tree? A binary search tree is a node-based binary tree data structure in which the left subtree of a node contains only nodes with keys smaller than the node\'s key. ' +
  'The right subtree of a node contains only nodes with keys greater than the node\'s key. ' +
  'Example: Input: root = [8, 3, 10, 1, 6] key = 6 Output: True ' +
  'Approach: Start from the root and compare the key with the value of the current node. ' +
  'If the key is smaller, continue in the left subtree, and if it is larger, continue in the right subtree. ' +
  'Below is the implementation of the above approach: C++ Java Python3 bool search(Node* root, int key) { if (root == NULL) return false; } ' +
  'Time Complexity: O(h), where h is the height of the tree. Auxiliary Space: O(h) ' +
  'Feeling lost in the world of random DSA topics, wasting time without progress? It\'s time for a change! Join our DSA course.';

const devto = 'Posted on Nov 3, 2024 • Updated on Nov 5, 2024 #javascript #webdev #beginners #tutorial ' +
  'Understanding JavaScript closures A closure is a function that remembers the variables from the place where it was defined, even after that outer function has returned. ' +
  'Closures are created every time a function is created, which is why they show up everywhere in JavaScript code. ' +
  'A common use is to keep private state, for example a counter that can only be changed through the functions it returns. ' +
  'They are also behind callbacks and event handlers that need to remember values from when they were set up. ' +
  'A classic mistake is creating closures inside a loop with var, which makes every callback share the same variable. ' +
  'Using let gives each iteration its own binding and fixes the problem. 12 reactions 3 comments Top comments (3) Subscribe';

const hindi = 'बाइनरी सर्च ट्री एक डेटा संरचना है जिसमें हर नोड के अधिकतम दो बच्चे होते हैं। ' +
  'बाएँ सबट्री के सभी मान नोड से छोटे होते हैं और दाएँ सबट्री के सभी मान बड़े होते हैं। ' +
  'इस वजह से किसी मान को खोजना बहुत तेज़ होता है क्योंकि हर कदम पर आधा पेड़ छोड़ा जा सकता है। ' +
  'अगर पेड़ संतुलित न हो तो यह एक लिंक्ड लिस्ट जैसा बन सकता है और खोज धीमी हो जाती है।';

const faq = 'Frequently asked questions What is Redis? Redis is an in-memory data store that keeps data in RAM for very fast reads and writes. ' +
  'Is Redis a database? Redis can be used as a database, a cache or a message broker, depending on how it is configured. ' +
  'How does Redis persist data? Redis can write snapshots to disk at intervals or append every write to a log file. ' +
  'Why is Redis fast? Because the data lives in memory and most operations run on a single thread without locking.';

const abbrev = 'Dr. Smith and Prof. Lee published the study in the U.S. in 2021, e.g. in the Journal of Data Systems. ' +
  'The study compared hash tables and search trees on real workloads, i.e. logs from three large web services. ' +
  'Hash tables were faster for exact lookups, while search trees won whenever ordered scans were needed. ' +
  'The authors recommend measuring the real access pattern before choosing a structure, since v1.2 of most libraries already offers both.';

const repetitive = Array.from({ length: 60 }, (_, i) =>
  `Section ${i + 1} explains how caching layer number ${i % 7} keeps frequently read data close to the application and why the cache must be invalidated when the underlying record changes.`).join(' ');

const bullets = '• Fast lookups • Ordered traversal • Easy to implement Key features Binary trees keep data sorted as it is inserted. ' +
  'They make range queries cheap because an in-order walk visits the values in sorted order. ' +
  'Their main weakness is that they need balancing to keep every operation logarithmic.';

const dupes = 'Caching stores the result of expensive work so it can be reused. Caching stores the result of expensive work so it can be reused. ' +
  'A cache needs an eviction policy such as least recently used. A cache needs an eviction policy such as least recently used. ' +
  'Stale data is the main risk, which is why entries usually expire after a time to live.';


const pqLines = pqFlat.replace(/ (Priority queue is|Like a bag|However,|The following table|Operation in|Applications of|Operating systems|Dijkstra|Huffman|Implementation A|With an unsorted|A binary heap|Conclusion|Programming Interview Datastrucutre Systemdesign Follow)/g, '\n$1');
const newsLines = `Technology
Share
City council approves plan to add 40 kilometres of protected bike lanes
By Priya Nair, Transport reporter
3 hours ago
The city council voted on Tuesday to build 40 kilometres of protected bike lanes over the next three years.
Advertisement
Supporters say separated lanes will encourage more people to cycle to work and reduce traffic.
Read more: Why cities are redesigning their streets
Construction on the first section is expected to start next spring.`;
const gist = 'const express = require("express"); const app = express(); app.get("/", (req, res) => res.send("ok")); app.listen(3000); // start server';
const hn = 'Hacker News new | past | comments | ask | show | jobs | submit login 1. Show HN: A tiny database in Rust (github.com) 312 points by alice 5 hours ago | 88 comments 2. Why SQLite is so fast (sqlite.org) 201 points by bob 7 hours ago | 54 comments 3. The log is the database (example.com) 99 points by carol 2 hours ago | 12 comments';
const cookies = 'We use cookies to improve your experience. By continuing to browse, you agree to our use of cookies and our privacy policy. Accept all Reject all ' +
  'You have read 3 of 5 free articles this month. Create an account to read the full story. Already a member? Sign in. ' +
  'Join 10,000 developers who get our weekly newsletter. ' +
  'Rust guarantees memory safety without a garbage collector by checking ownership and borrowing at compile time. ' +
  'Each value has a single owner, and the value is dropped as soon as its owner goes out of scope. ' +
  'References let code use a value without taking ownership, and the borrow checker makes sure they never outlive it.';
const quotes = '“We rewrote the service in Go because the old one could not keep up,” the lead engineer said. ' +
  'The new version handles three times the traffic on the same machines. ' +
  'The team kept the old API so that existing clients did not need any changes.';
const mixed = 'Caching बहुत ज़रूरी है। A cache keeps recent results in memory so repeated requests are served quickly. ' +
  'इससे database पर load कम होता है। Entries expire after a time to live so stale data does not stay forever.';
const longSentence = 'This sentence just keeps going ' + 'and going '.repeat(80) + 'until it ends.';
const titleFirst = 'How Postgres Makes Transactions Atomic Postgres never overwrites a row in place, so an update writes a new version of it. ' +
  'Each transaction reads from a snapshot that decides which row versions it can see. A commit becomes visible to everyone at once.';

const seedsRaw = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/content.json', import.meta.url), 'utf8')).demo_curator;
const seeds = seedsRaw;
const long = seeds.map(x => x.content).join(' ');   // a long page with many topics

export const BANNED = /min read|Press enter|Member-only|Follow\b|Followers|Written by|More from|Recommended|Listen Share|Advertisement|Subscribe|Read more|Last Updated|Improve|reactions|comments|Timestamps|https?:|www\.|#\w|@\w|\d{1,2}:\d{2}|\w\([^)]+\)|[<>{};=`]|Thanks for reading|clap|\[\d+\]|\[edit\]|From Wikipedia|redirects here|Posted on|Expected output|Auxiliary Space|Feeling lost|Join our|Related Topics|By Priya Nair|hours ago|Input:|Output:|Example:|Approach:|Deletion:|Insertion:|Searching:|Operations A |History The|Overview A|Implementation A|Conclusion |Applications of Priority Queue A|Deleting 3|with root 8|DSA|cookies|free articles|Create an account|Sign in|newsletter|points by|Show HN|Hacker News|Accept all|require\(|going going going|enjoyed this|follow me|[a-z]\.[A-Z][a-z]|Oct 3|March 4|1 \/ 1|:298|Invented 1960|Key Properties|following pseudocode|as shown in|295/;

export const fixtures = [
  { name: 'medium BST (flattened)', item: { title: 'Binary Search Tree Explained', content: bstFlat }, minPoints: 2 },
  { name: 'medium BST (line breaks)', item: { title: 'Binary Search Tree Explained', content: bstLines }, minPoints: 2 },
  { name: 'medium priority queue', item: { title: 'Priorities of a “PRIORITY QUEUE”. Everything you should know about… | by LastBrainCell | Medium', content: pqFlat }, minPoints: 2 },
  { name: 'youtube description', item: { title: 'Build a URL shortener with Node.js and Redis', description: youtube, content: youtube }, minPoints: 1 },
  { name: 'wikipedia', item: { title: 'Binary search tree - Wikipedia', content: wiki }, minPoints: 2 },
  { name: 'mdn docs with code', item: { title: 'Array.prototype.push() - JavaScript | MDN', content: mdn }, minPoints: 1 },
  { name: 'news article', item: { title: 'City council approves bike lanes', content: news }, minPoints: 2 },
  { name: 'geeksforgeeks', item: { title: 'Binary Search Tree - GeeksforGeeks', content: gfg }, minPoints: 1 },
  { name: 'dev.to', item: { title: 'Understanding JavaScript closures - DEV Community', content: devto }, minPoints: 2 },
  { name: 'hindi', item: { title: 'बाइनरी सर्च ट्री', content: hindi }, minPoints: 1 },
  { name: 'faq (questions)', item: { title: 'Redis FAQ', content: faq }, minPoints: 2 },
  { name: 'abbreviations', item: { title: 'Hash tables vs trees', content: abbrev }, minPoints: 2 },
  { name: 'very long page', item: { title: 'Reading notes', content: long }, minPoints: 2 },
  { name: 'repetitive template page', item: { title: 'Caching', content: repetitive }, minPoints: 0 },
  { name: 'bullet list page', item: { title: 'Binary trees', content: bullets }, minPoints: 1 },
  { name: 'duplicate sentences', item: { title: 'Caching basics', content: dupes }, minPoints: 1 },
  { name: 'one sentence', item: { title: 'Note', content: 'A heap keeps the largest element at the root so it can be read in constant time.' }, minPoints: 0 },
  { name: 'no punctuation', item: { title: 'Tags', content: 'javascript react hooks state management redux context api performance' }, minPoints: 0 },
  { name: 'title only', item: { title: 'Untitled page' }, minPoints: 0 },
  { name: 'empty everything', item: {}, minPoints: 0 },
  { name: 'medium priority queue (line breaks)', item: { title: 'Priorities of a “PRIORITY QUEUE”', content: pqLines }, minPoints: 2 },
  { name: 'news article (line breaks)', item: { title: 'Bike lanes', content: newsLines }, minPoints: 1 },
  { name: 'code only (gist)', item: { title: 'server.js · GitHub', content: gist }, minPoints: 0 },
  { name: 'link list (hacker news)', item: { title: 'Hacker News', content: hn }, minPoints: 0 },
  { name: 'cookie banner, paywall, newsletter', item: { title: 'Rust ownership', content: cookies }, minPoints: 1 },
  { name: 'quotes', item: { title: 'Rewriting in Go', content: quotes }, minPoints: 1 },
  { name: 'mixed hindi and english', item: { title: 'Caching', content: mixed }, minPoints: 1 },
  { name: 'one endless sentence', item: { title: 'Endless', content: longSentence }, minPoints: 0 },
  { name: 'title printed before the text', item: { title: 'How Postgres Makes Transactions Atomic', content: titleFirst }, minPoints: 1 },
  { name: 'description only (added by URL)', item: { title: 'Raft', description: 'Raft splits consensus into leader election, log replication and safety. It is designed to be easy to understand. A leader replicates its log to followers, and an entry commits once a majority stores it.' }, minPoints: 1 },
  { name: 'blocks joined without spaces', item: { title: 'BST notes', content: 'A Binary Search Tree keeps smaller values in the left subtree and larger values in the right one.BSTs are used to store sorted data, such as in sets or databases.If you enjoyed this blog, be sure to follow me on Medium and clap for the story!' }, minPoints: 1 },
  { name: 'medium header without a middle dot', item: { title: 'DSA | Binary Search Tree (BST): Understanding and Implementing | by Adarsh GS | Medium', content: 'Java JavaScript Java Development Python Binary Search DSA | Binary Search Tree (BST): Understanding and Implementing Adarsh GS 2 min read Oct 3, 2024 A Binary Search Tree (BST) is a specialized form of a binary tree in which the value of every node in the left subtree is smaller than the node itself. This structure allows for efficient searching, insertion, and deletion in a balanced tree. Inserting a new node involves finding the correct place where the new node fits according to the binary search tree property.' }, minPoints: 1 },
  { name: 'dated first sentence', item: { title: 'Release notes', content: 'March 4, 2025 The team shipped a faster query planner that cuts typical response times in half. Indexes are now chosen using real statistics instead of fixed guesses.' }, minPoints: 1 },
  { name: 'slide counter and page cites', item: { title: 'BST', content: 'Binary Search Tree Type tree Invented 1960 Time complexity O(log n) In computer science, a binary search tree keeps every key in the left subtree smaller than the node. 1 / 1 Key Properties Unique ordering of elements means duplicates are usually not allowed. The helper function is used within the deletion algorithm for replacing one node with another.:298 This procedure handles the deletion of a node from the tree.' }, minPoints: 1 },
  { name: 'wikipedia algorithm section', item: { title: 'Binary search tree - Wikipedia', content: 'Searching a binary search tree for a specific key can be programmed recursively or iteratively. The following pseudocode finds the successor and predecessor of a node x in a BST. The deletion of a node, say Z, from the binary search tree BST has three cases:: 295-297 If Z is a leaf node, it is replaced by NIL as shown in (a). Deletion keeps the binary search property intact in every case.' }, minPoints: 1 },
  ...seeds.map(s => ({ name: `demo: ${s.id}`, item: s, minPoints: 2 })),
];
