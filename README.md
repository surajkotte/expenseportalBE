**Expense Portal**
**AI-Powered Enterprise Expense & Receipt Management Portal**

An end-to-end automated invoice processing platform. It combines zero-touch background email ingestion, **visual layout fingerprinting with persistent prompt memory**, an Agentic AI chat interface**, and real-time API cost tracking.

---
 Key Features

1. **Smart Receipt Parsing:** Upload crumpled receipts, digital PDFs, or screenshots. The system uses vision-capable AI to extract Merchant, Date, Tax, and Line Items with high accuracy.
2. **Multi-Expense Aggregation:** Users can drop 10 receipts into the portal at once. The system processes them in parallel and stitches them together into a unified "Expense Report" for easy review.
3. **Configurable Extraction Schemas:** Finance teams can define exactly what data is required. Dynamically configure extraction fields (e.g., enforcing "Project Code" or "Cost Center" extraction) via a UI-driven schema engine.
4. **Auto-Translation & Localization:** Built for global teams. The AI automatically detects foreign receipts (e.g., a taxi receipt in German) and translates the line items and categories into the company's native language.
5. **Agnostic Multi-LLM Router:** Cost-optimized AI. Route simple receipts through faster, cheaper models (like `gpt-4o-mini` or `claude-3-haiku`) while escalating blurry or complex multi-page hotel folios to heavy-duty reasoning models.
6. **Policy Flagging (Roadmap):** Automated auditing to catch out-of-policy expenses (e.g., flagging meals over $100 or non-compliant alcohol purchases) before human approval.
7. **Audit Trails & AI Override Explanations**: Complete data provenance. The system strictly tracks the diff between the original AI-extracted JSON and the user's final submission. If an employee alters a machine-read field (e.g., changing a $50 receipt to $500), the UI immediately intercepts the submission and requires a written justification for the auditor.
8. **Dynamic Approval Workflows**: Configurable routing rules based on expense thresholds and categories. Automatically approve low-risk items (e.g., meals under $20), while routing high-value items or overridden fields to specific managerial queues before ERP ingestion.

---

System Architecture

```
[ Employee Web / Mobile UI ]
           │
           ├─ 1. (Creates Draft Report)
           │
           └─ 2. (Bulk Uploads Receipts)
                   │
                   ▼
          [ AWS S3 Bucket ] ◄───────── (Secure Blob Storage)
                   │
                   ▼
          ┌───────────────────┐
          │  BullMQ (Redis)   │ ◄───── (Parallel Task Queue)
          └────────┬──────────┘
                   │ 
                   ▼
        [ Configured LLM Router ] ───► [ Schema DB & Translation ]
                   │ 
                   ▼ (Returns Extracted JSON)
                   │
        [ Expense Report Aggregator ]
                   │
                   ▼
  [ Employee Reviews & Adjusts Data ]
                   │
                   ├─► (Data Changed?) ──Yes──► [ Prompts for Explanation ]
                   │                                      │
                   No                                     │
                   │                                      ▼
                   └──────────────────────────► [ Audit Logger DB ]
                                                          │
                                                          ▼
                                            [ Rule-Based Approval Engine ]
                                                          │
                                            ┌─────────────┴─────────────┐
                                            │                           │
                                      (Auto-Approve)             (Manager Queue)
                                            │                           │
                                            ▼                           ▼
                              [ ERP / HR System Ingestion ] ◄───────────┘
