import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { reportType, inputData, companyName, dateRange } = await request.json()

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a professional business report writer for Ethiopian companies.
Generate clear, professional, and insightful business reports based on the data provided.
Always respond with ONLY a valid JSON object using these exact keys:
{
  "executiveSummary": "2-3 sentence overview of the business performance",
  "keyMetrics": [
    {"label": "metric name", "value": "formatted value", "trend": "up|down|neutral", "description": "brief context"}
  ],
  "detailedAnalysis": "3-4 paragraphs of detailed analysis",
  "trendsAndInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}
Use ETB for Ethiopian Birr currency. Be specific with numbers. Keep language professional but clear.
Return ONLY the JSON object. No markdown. No explanation. No backticks.`
          },
          {
            role: 'user',
            content: `Generate a ${reportType} report for ${companyName}.
Period: ${dateRange}
Business data: ${JSON.stringify(inputData)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim())

    return NextResponse.json({ success: true, report: parsed })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
