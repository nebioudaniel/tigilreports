import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox']

interface SuggestedField {
  label: string
  type: string
  options: string[]
  required: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { formTitle, description } = await request.json()

    if (!formTitle?.trim()) {
      return NextResponse.json({ success: false, error: 'Add a form title first' }, { status: 400 })
    }

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
            content: `You design staff data-entry forms for Ethiopian businesses using Tigil Reports.
Given the purpose of a form, suggest 3-6 fields staff would realistically fill in.
Each field MUST use one of these exact types: text, textarea, number, date, select, radio, checkbox.
Rules:
- "options" is required for select, radio and checkbox types (2-6 short choices) and must be an empty array otherwise.
- Mark fields as required only when essential for the report.
- Labels should be clear and short (max ~40 chars), quantities in ETB where money is involved.
Always respond with ONLY a valid JSON object:
{"fields": [{"label": "...", "type": "text|textarea|number|date|select|radio|checkbox", "options": [], "required": true}]}
No markdown. No explanation. No backticks.`
          },
          {
            role: 'user',
            content: `Form title: ${formTitle.trim()}\nPurpose: ${description?.trim() || 'General staff reporting'}`
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim())

    const fields: SuggestedField[] = (parsed.fields || []).filter((f: SuggestedField) =>
      f?.label && ALLOWED_TYPES.includes(f.type)
    ).map((f: SuggestedField) => ({
      label: String(f.label),
      type: f.type,
      options: ALLOWED_TYPES.slice(4).includes(f.type) && Array.isArray(f.options) ? f.options.map(String) : [],
      required: Boolean(f.required),
    }))

    if (fields.length === 0) throw new Error('No fields generated')

    return NextResponse.json({ success: true, fields })
  } catch (error) {
    console.error('Field suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Failed to suggest fields' }, { status: 500 })
  }
}
