**Expense Portal**
Autonomous AI Invoice Processor, Layout Memory & Conversational Agent**

An end-to-end automated invoice processing platform. It combines zero-touch background email ingestion, **visual layout fingerprinting with persistent prompt memory**, an Agentic AI chat interface**, and real-time API cost tracking.

---
 Key Features

1. Visual Fingerprinting & Prompt Memory:** Save custom extraction prompts mapped directly to a vendor’s specific invoice layout. When a matching layout is uploaded in the future, the system recognizes the geometry and instantly injects your saved prompt for tailored, 100% accurate extraction.
2. Configurable Schema Engine: Fully customize exactly what fields the AI extracts. Dynamically configure Header fields (Invoice ID, Date, Tax ID) and Line-Item tables (Quantity, Description, Unit Price, SKU) through a visual schema builder.
3. Configurable Multi-Language Translation: Seamlessly process international invoices. The system automatically detects the source language and translates extracted field content into your target accounting language on the fly.
4. Agentic Document Chat Interface:* A multi-turn conversational UI docked alongside the document. Don't just extract data—interrogate it. Ask the AI to verify line-item math, explain obscure surcharge codes, or re-calculate totals in a different currency.
5. Universal AI JSON Extraction: Plug in any LLM endpoint (OpenAI, Anthropic, local Ollama) to convert unstructured PDFs/Images into strict, pre-defined JSON schemas.
6. Zero-Touch IMAP Automation: A background daemon watches configured finance inboxes, strips incoming invoice attachments, queues them, and pushes extracted JSON to your backend without human intervention.
7. Resilient Task Queues: Built-in queuing for email ingestion featuring exponential backoff, auto-retries**, and Dead-Letter-Queue (DLQ) routing for corrupted attachments.
8. Token & Spend Dashboard: Keep AI overhead transparent. Real-time tracking of USD/token spend per extraction, queue cycle, and individual chat session.

---

System Architecture

```
                                [ Finance Inbox (IMAP) ]
                                           │
                                  (Strips Attachment)
                                           │
  [ React.js Web UI ] ──(Upload)──► [ AWS S3 Bucket ] ◄──(Save)── [ IMAP Daemon ]
          │                                │
      (Chat/RAG)                           │ (Passes S3 Object Key)
          │                                ▼
          │                      ┌───────────────────┐
          │                      │  BullMQ (Redis)   │
          │                      └────────┬──────────┘
          │                               │ (Worker Pulls Job)
          ▼                               ▼
    [ Agentic AI ]              [ Layout Recognizer ] ──(Match?)──► [ MySQL DB ]
          ▲                               │                                │
          │                               ▼                                │
          └──────────────────── [ Payload Builder ] ◄──(Injects Model, ────┘
                                          │             Prompt, Schema & Lang)
                                          ▼
                               [ Configured LLM Router ]
                           (OpenAI / Anthropic / Ollama)
                                          │ (Extracted JSON & Translated)
                                          ▼
                            [ Default Backend Ingestion ]
