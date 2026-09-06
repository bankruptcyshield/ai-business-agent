require("dotenv").config();

const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const activityLog = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Business Operations Agent is running",
  });
});

app.get("/api/activity", (req, res) => {
  res.json(activityLog);
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      input: [
        {
          role: "system",
          content: `
You are an AI Business Operations Agent.

Analyze incoming customer messages for a sales and operations team.

Your responsibilities:
- Identify the customer's intent.
- Determine priority.
- Determine sentiment.
- Score the lead as Cold, Warm, or Hot.
- Extract useful business information.
- Recommend the next operational action.
- Draft a concise professional reply.
- Provide a confidence score from 0 to 100.

IMPORTANT GUARDRAILS:
- Never invent prices, fees, policies, availability, deadlines, guarantees, or company facts.
- Only use facts explicitly provided in the customer's message.
- If information is missing, ask for it instead of assuming it.
- If a fact, price, fee, deadline, policy, or company-specific detail is not contained in the customer's message or explicitly provided as business context, do not state it.
- Never fabricate phone numbers, email addresses, names, or business information.
- Keep the suggested reply concise and appropriate for a real business.
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],

      text: {
        format: {
          type: "json_schema",
          name: "customer_message_analysis",
          strict: true,

          schema: {
            type: "object",

            properties: {
              intent: {
                type: "string",
              },

              priority: {
                type: "string",
                enum: ["Low", "Medium", "High", "Urgent"],
              },

              sentiment: {
                type: "string",
              },

              leadScore: {
                type: "string",
                enum: ["Cold", "Warm", "Hot"],
              },

              confidence: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },

              extractedData: {
                type: "object",

                properties: {
                  service: {
                    type: ["string", "null"],
                  },

                  location: {
                    type: ["string", "null"],
                  },

                  deadline: {
                    type: ["string", "null"],
                  },

                  contactRequest: {
                    type: ["string", "null"],
                  },
                },

                required: [
                  "service",
                  "location",
                  "deadline",
                  "contactRequest",
                ],

                additionalProperties: false,
              },

              nextAction: {
                type: "string",
              },

              reply: {
                type: "string",
              },
            },

            required: [
              "intent",
              "priority",
              "sentiment",
              "leadScore",
              "confidence",
              "extractedData",
              "nextAction",
              "reply",
            ],

            additionalProperties: false,
          },
        },
      },
    });

    const analysis = JSON.parse(response.output_text);

    activityLog.unshift({
      id: Date.now(),
      type: "analysis",
      message: `Lead analyzed: ${analysis.leadScore} lead / ${analysis.priority} priority`,
      timestamp: new Date().toISOString(),
    });

    res.json(analysis);
  } catch (error) {
    console.error("OpenAI error:", error);

    res.status(500).json({
      error: "Failed to analyze message",
    });
  }
});

app.post("/api/crm-task", (req, res) => {
  const {
    intent,
    priority,
    leadScore,
    nextAction,
  } = req.body;

  if (!intent || !priority || !leadScore || !nextAction) {
    return res.status(400).json({
      error: "Missing task information",
    });
  }

  const task = {
    id: Date.now(),
    title: `Follow up: ${intent}`,
    priority,
    leadScore,
    nextAction,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  activityLog.unshift({
    id: Date.now() + 1,
    type: "crm",
    message: `CRM task created for ${leadScore} lead`,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    task,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});