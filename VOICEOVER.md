# 🎙️ Voiceover Script — Product Catalog walkthrough (~90s)

Timed to the guided tour's auto-advance (`?tour=1`). Read straight through while
screen-recording. Conversational pace (~3 words/sec). If you run ahead of the
on-screen animation, hit **Pause** — the timing below assumes you let it play.

> **Record:** open <https://agentic-platform.dockerworkshop.com/?tour=1#/dashboard>
> full-screen → Cmd+Shift+5 → Record → read from 0:00 → stop at ~1:30.

| Time | On screen | Narration |
|---|---|---|
| **0:00** | Dashboard | "Docker's Agentic Platform — cloud sandboxing with AI governance. There are two kinds of agents to govern: the ones that *build* your software, and the ones that *run inside* it." |
| **0:07** | Baseline artifact | "First, the build agent. It containerized our catalog service on a laptop — Node 20, four hundred packages, eight high-severity CVEs, unsigned, running as root. It works… but it fails policy. Nobody chose that base image." |
| **0:16** | MCP tools | "So we govern the tools. We give the agent Docker's hardened-image MCP server — but a Cedar policy allows only the read-only catalog queries and *denies* the mutating ones. Even a hijacked agent can look, not touch." |
| **0:25** | Sandbox build | "Now watch it run inside a sandbox — its own microVM, pointed at those signed, policy-gated tools. It checks the hardened catalog *before* writing a line of Dockerfile, and rebuilds the image." |
| **0:34** | Before / after | "Same app, a fraction of the attack surface. Eight high CVEs to zero. Four hundred packages to seventy-eight. Unsigned to signed. Root to non-root. It passes policy — and the agent got here on its own." |
| **0:42** | Two kinds of agents | "That's the agent that *builds* the app. But the app itself *runs* a team of agents. Same platform, same governance — one layer up." |
| **0:50** | Catalog team | "Meet the Catalog Intelligence Team: four Llama 3.2 agents on Docker Model Runner. They evaluate every product a vendor submits." |
| **0:58** | Live APPROVE | "Let's add a product. The orchestrator fans out to all four… *(let it animate)* …vendor-intake scores it — ninety-one out of a hundred. Approved, and committed to Postgres, Mongo, and Kafka." |
| **1:09** | Live REJECT | "Now a bad product — a nine-hundred-dollar cable with a one-line description. Same pipeline… *(let it animate)* …but it scores forty. Catalog-management skips it — not committed. Rejected. The agents made the call, and every step is audited." |
| **1:20** | Close | "One platform. From a hardened base image to 'approved, ninety-one out of a hundred' — the agents that build your app and the agents that run inside it, boxed in, tool-brokered, and audited the same way. That's the Docker Agentic Platform." |

Ends ~1:30.

## Delivery notes

- **The two live steps (0:58, 1:09) are the stars.** Start the sentence, pause ~4–5
  seconds to let the fan-out and score bars animate, then land the verdict word
  ("Approved" / "Rejected") right as the banner appears.
- **Numbers land harder slowly** — beat between "eight high CVEs… to zero."
- Need more time on a beat? Hit **Pause**; the script still works.

## 30-second cut (teaser)

> "Docker's Agentic Platform governs two kinds of AI agents — the ones that build
> your software, and the ones that run inside it. Here, an agent rebuilds our catalog
> service inside a sandbox, pointed only at signed, policy-gated tools — eight high
> CVEs drop to zero, and it's signed and non-root. And the app *itself* runs agents:
> submit a product, and four Llama 3.2 agents score it live — approved and committed,
> or rejected and logged. Same governance, end to end."
