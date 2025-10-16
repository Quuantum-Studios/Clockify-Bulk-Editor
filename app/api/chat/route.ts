import type { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const runtime = "nodejs"

const SYSTEM_PROMPT = `You are an assistant that converts free-form time tracking notes into a CSV that is compatible with the Clockify Bulk Upload feature.

Output MUST be valid CSV with a header row and UTF-8 text. Do not add markdown fences. Do not add commentary. Only output the CSV content.

Headers must be: description,start,end,projectName,projectId,taskName,tags,billable

Rules:
- start and end should be ISO 8601 timestamps if present (YYYY-MM-DDTHH:mm:ssZ). If end is missing, leave blank.
- projectName OR projectId may be used; if unknown leave blank.
- taskName may be used; if unknown leave blank.
- tags: comma-separated labels in a single cell.
- billable: true or false (default to false if unsure).
- Include only rows you can infer confidently; skip ambiguous ones.
`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { messages?: { role: string; content: string }[]; text?: string }
    const userText = body?.messages?.[0]?.content || body?.text || ""
    if (!userText || typeof userText !== 'string') {
      return new Response(JSON.stringify({ error: "missing text" }), { status: 400 })
    }

    const provider = (process.env.CHAT_AI_PROVIDER || '').toLowerCase()
    console.log('Chat API provider:', provider)
    
    if (provider === 'google') {
      // Gemini using official Google Generative AI library
      const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
      if (!googleKey) {
        console.error('Missing Google API key')
        return new Response(JSON.stringify({ error: "missing GOOGLE_API_KEY or GEMINI_API_KEY" }), { status: 500 })
      }
      
      const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      const prompt = `${SYSTEM_PROMPT}\n\nUser input: ${userText}`
      
      console.log('Calling Gemini API with model:', model)
      
      try {
        const genAI = new GoogleGenerativeAI(googleKey)
        const geminiModel = genAI.getGenerativeModel({ 
          model,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          }
        })
        
        const result = await geminiModel.generateContent(prompt)
        const response = await result.response
        const csv = response.text().trim()
        
        if (!csv) {
          console.error('Empty response from Gemini')
          return new Response(JSON.stringify({ error: "empty response from Gemini" }), { status: 500 })
        }
        
        console.log('Gemini response length:', csv.length)
        return Response.json({ content: csv })
      } catch (error) {
        console.error('Gemini API error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return new Response(JSON.stringify({ error: `Gemini error: ${errorMessage}` }), { status: 500 })
      }
    } else {
      // OpenAI implementation
      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey) {
        console.error('Missing OpenAI API key')
        return new Response(JSON.stringify({ error: "missing OPENAI_API_KEY" }), { status: 500 })
      }
      
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
      console.log('Calling OpenAI API with model:', model)
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText }
          ],
          temperature: 0.2,
          max_tokens: 2048
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API error:', response.status, errorText)
        return new Response(JSON.stringify({ error: `OpenAI API error: ${response.status} - ${errorText}` }), { status: 500 })
      }
      
      const data = await response.json() as { 
        choices?: { message?: { content?: string } }[],
        error?: { message?: string }
      }
      
      if (data.error) {
        console.error('OpenAI response error:', data.error)
        return new Response(JSON.stringify({ error: `OpenAI error: ${data.error.message}` }), { status: 500 })
      }
      
      const csv = data?.choices?.[0]?.message?.content || ""
      if (!csv.trim()) {
        console.error('Empty response from OpenAI')
        return new Response(JSON.stringify({ error: "empty response from OpenAI" }), { status: 500 })
      }
      
      console.log('OpenAI response length:', csv.length)
      return Response.json({ content: csv })
    }
  } catch (e: unknown) {
    console.error('Chat API error:', e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: `Internal error: ${errorMessage}` }), { status: 500 })
  }
}


