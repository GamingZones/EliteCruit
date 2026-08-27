# Backend

This folder will contain the API services for EliteCruit.
Suggested stack: Node.js + Express + PostgreSQL + Prisma.
## Resume parsing API

The API now includes `POST /api/resume/parse`. It accepts one multipart field named
`document` (PDF, DOCX, TXT, or Markdown; up to 10 MB) and returns normalized resume JSON.

Install the added dependencies before starting the server:

```powershell
cd Backend
npm install
```

For high-quality extraction, configure an OpenAI API key before running the server:

```powershell
$env:OPENAI_API_KEY = "your_key"
# Optional: $env:OPENAI_MODEL = "your_preferred_model"
npm run dev
```

Without an API key, the endpoint still performs basic text extraction and fills the
most readily identifiable contact fields and skills. Scanned/image-only documents need
an OCR provider (such as Google Document AI, Azure Document Intelligence, or Textract)
before they reach this endpoint.
