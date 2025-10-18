import type { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const runtime = "nodejs"

function buildSystemPrompt(params: {
  userTimezone?: string
  userPrompt?: string
  tags?: string
  projectName?: string
  taskName?: string
  description?: string
  projects?: Array<{
    name?: string
    tasks?: Array<{
      name?: string
      descriptions?: string[]
    }>
  }>
}): string {
  const today = new Date().toISOString().split('T')[0]
  const tz = params.userTimezone || "UTC"
  const up = params.userPrompt || ""
  const tg = params.tags || ""
  const pn = params.projectName || ""
  const tn = params.taskName || ""
  const desc = params.description || ""
  const renderedProjects = (() => {
    const rows: string[] = []
    const list = Array.isArray(params.projects) ? params.projects : []
    if (list.length === 0 && (pn || tn || desc)) {
      rows.push(`Project: ${pn}`)
      rows.push(`  Task: ${tn}`)
      rows.push(`    Description: ${desc}`)
      return rows.join("\n")
    }
    for (const project of list) {
      rows.push(`Project: ${project?.name || ""}`)
      const tasks = Array.isArray(project?.tasks) ? project!.tasks! : []
      for (const task of tasks) {
        rows.push(`  Task: ${task?.name || ""}`)
        const descriptions = Array.isArray(task?.descriptions) ? task!.descriptions! : []
        if (descriptions.length === 0) {
          rows.push(`    Description: `)
        } else {
          for (const d of descriptions) {
            rows.push(`    Description: ${d}`)
          }
        }
      }
    }
    return rows.join("\n")
  })()
  return `You are an assistant that converts free-form time tracking notes into a CSV.

Output MUST be valid CSV with a header row and UTF-8 text. Do not add markdown fences. Do not add commentary. Only output the CSV content.

Headers must be: description,start,end,projectName,taskName,tags,billable

Rules:
- start and end should be timestamps if present (YYYY-MM-DD HH:mm:ss). consider the timestamps provided by user are in ${tz} timezone for start and end. Use the current date if the start or end is not provided.
- projectName may be used; if unknown leave blank.
- description may be used; if unknown then add according to the taskName. Don't include projectName.
- taskName may be used; should be concise if creating a new task, otherwise use the existing taskName. If unknown leave blank. Don't include projectName.
- tags: labels separated by | in a single cell. Add according to the description, taskName if not provided.
- billable: true or false (if unknow then decide according  to the taskName, description. default to true if unsure).
- projectName, taskName, tags, description are chosen from existing data and new created if no relevant data found.
- Example output:
description,start,end,projectName,taskName,tags,billable
"Example task",2025-01-01 00:00:00,2025-01-01 01:00:00,"Example project","Example task","tag1|tag2",true

Additional Details:
Todays date: ${today}

User preferences:
${up}

Existing Data:
Tags: ${Array.isArray(params.tags) ? (params.tags as unknown as string[]).join(', ') : tg}

${renderedProjects || "Project: \n  Task: \n    Description: "}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      messages?: { role: string; content: string }[]
      text?: string
      userPrompt?: string
      timezone?: string
      tags?: string | string[]
      projectName?: string
      taskName?: string
      description?: string
      projects?: Array<{ name?: string; tasks?: Array<{ name?: string; descriptions?: string[] }> }>
    }
    const userText = body?.messages?.[0]?.content || body?.text || ""
    if (!userText || typeof userText !== 'string') {
      return new Response(JSON.stringify({ error: "missing text" }), { status: 400 })
    }

    const systemPrompt = buildSystemPrompt({
      userTimezone: body.timezone,
      userPrompt: body.userPrompt,
      tags: Array.isArray(body.tags) ? body.tags.join(', ') : (body.tags || ""),
      projectName: body.projectName,
      taskName: body.taskName,
      description: body.description,
      projects: body.projects,
    })

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
      const prompt = `${systemPrompt}\n\nUser input: ${userText}`

      console.log('Gemini prompt:', prompt)
      
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
        
        console.log('Gemini response length:', csv, csv.length)
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
            { role: "system", content: systemPrompt },
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


