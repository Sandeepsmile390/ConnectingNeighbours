import { Router } from "express";
import { db, listingsTable, alertsTable, resourcesTable, eq } from "@workspace/db";
import { QueryAiAssistantBody } from "@workspace/api-zod";

const router = Router();

router.post("/ai/query", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = QueryAiAssistantBody.parse(req.body);
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    // 1. Gather active context from all community tables
    const activeListings = await db.query.listingsTable.findMany({
      where: eq(listingsTable.isAvailable, true),
      with: { seller: true },
    });

    const activeAlerts = await db.query.alertsTable.findMany({
      where: eq(alertsTable.isResolved, false),
      with: { reporter: true },
    });

    const upcomingEvents = await db.query.eventsTable.findMany({
      with: { organizer: true },
    });

    const sharedResources = await db.query.resourcesTable.findMany({
      where: eq(resourcesTable.isAvailable, true),
      with: { offerer: true },
    });

    const members = await db.query.neighborhoodUsersTable.findMany();

    // 2. Format database context concisely
    const listingsContext = activeListings.map(l => 
      `- ${l.title} (${l.type === "free" ? "FREE" : `$${l.price}`}, Category: ${l.category}) - Offered by ${l.seller.name} in apartment ${l.seller.apartment || "N/A"}. Description: ${l.description}`
    ).join("\n");

    const alertsContext = activeAlerts.map(a => 
      `- [${a.severity.toUpperCase()} ALERT] ${a.title} - Reported by ${a.reporter.name} in ${a.reporter.apartment || "N/A"}. Details: ${a.description}`
    ).join("\n");

    const eventsContext = upcomingEvents.map(e => 
      `- Event: "${e.title}" at location: "${e.location}" starting at ${new Date(e.startsAt).toLocaleString()}. Organized by ${e.organizer.name}. Details: ${e.description}`
    ).join("\n");

    const resourcesContext = sharedResources.map(r => 
      `- Shared ${r.type}: "${r.title}" - Offered by ${r.offerer.name} in ${r.offerer.apartment || "N/A"}. Details: ${r.description}`
    ).join("\n");

    const membersContext = members.map(m => 
      `- ${m.name} (@${m.username}, Apartment: ${m.apartment || "N/A"}${m.isVerified ? ", Verified" : ""})`
    ).join("\n");

    // 2.5 Sandbox Guide mode check if API Key is not set
    if (!apiKey) {
      const queryLower = body.message.toLowerCase();
      let reply = "";

      if (queryLower.includes("event") || queryLower.includes("happen") || queryLower.includes("calendar")) {
        reply = `[Sandbox Guide Mode 🤖]\nHere are the upcoming community events registered in our neighborhood database:\n\n${
          eventsContext || "No upcoming events scheduled at this time."
        }\n\n*Configure your GEMINI_API_KEY environment variable to enable full conversational AI!*`;
      } else if (queryLower.includes("listing") || queryLower.includes("buy") || queryLower.includes("sell") || queryLower.includes("market") || queryLower.includes("price") || queryLower.includes("free")) {
        reply = `[Sandbox Guide Mode 🤖]\nHere are the active items available in the marketplace:\n\n${
          listingsContext || "No active listings right now."
        }\n\n*Configure your GEMINI_API_KEY environment variable to enable full conversational AI!*`;
      } else if (queryLower.includes("alert") || queryLower.includes("safe") || queryLower.includes("danger") || queryLower.includes("warn") || queryLower.includes("emergency")) {
        reply = `[Sandbox Guide Mode 🤖]\nHere is the current safety report for our neighborhood:\n\n${
          alertsContext || "No active safety alerts. The neighborhood is safe!"
        }\n\n*Configure your GEMINI_API_KEY environment variable to enable full conversational AI!*`;
      } else if (queryLower.includes("resource") || queryLower.includes("borrow") || queryLower.includes("lend") || queryLower.includes("share") || queryLower.includes("tool")) {
        reply = `[Sandbox Guide Mode 🤖]\nHere are the shared resources available to borrow or request:\n\n${
          resourcesContext || "No shared resources are currently offered."
        }\n\n*Configure your GEMINI_API_KEY environment variable to enable full conversational AI!*`;
      } else {
        reply = `[Sandbox Guide Mode 🤖]\nHello! I am running in Sandbox Mode because a Gemini API Key is not yet configured on this server. However, I can query the neighborhood database and summarize the local status:\n\n` +
          `• 🛍️ **Marketplace:** ${activeListings.length} active listings.\n` +
          `• 📅 **Events:** ${upcomingEvents.length} upcoming events.\n` +
          `• ⚠️ **Alerts:** ${activeAlerts.length} active safety alerts.\n` +
          `• 🤝 **Resources:** ${sharedResources.length} shared items/rides.\n` +
          `• 👥 **Members:** ${members.length} registered neighbors.\n\n` +
          `Try asking about specific events, marketplace listings, safety alerts, or resources, or set up your Gemini API Key!`;
      }

      res.json({ response: reply });
      return;
    }

    // 3. Construct prompt incorporating context
    const systemPrompt = `You are the friendly, helpful local AI Assistant for the 'Connecting Neighbors' hyperlocal community network. Your job is to answer questions from neighbors using only the active, real-time database context provided below.
If a user asks about items for sale, borrowing tools, events, safety alerts, or neighbors, use the data below. Keep your responses warm, community-focused, and concise.

NEIGHBORHOOD DATABASE CONTEXT:

--- ACTIVE MARKETPLACE LISTINGS ---
${listingsContext || "No active listings right now."}

--- ACTIVE SAFETY ALERTS ---
${alertsContext || "No active safety alerts. The neighborhood is currently safe."}

--- UPCOMING COMMUNITY EVENTS ---
${eventsContext || "No upcoming events scheduled."}

--- SHARED RESOURCES AVAILABLE ---
${resourcesContext || "No resources are currently offered for sharing."}

--- VERIFIED COMMUNITY MEMBERS ---
${membersContext}

USER'S INQUIRY:
"${body.message}"

Helpful Response:`;

    // 4. Dispatch fetch to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I am unable to process that request right now.";

    res.json({ response: aiText.trim() });
  } catch (err: any) {
    req.log.error({ err }, "AI Assistant Query Error");
    res.status(500).json({ error: "AI Assistant failed to process your question." });
  }
});

export default router;
