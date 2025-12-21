// Gemini API を使用した食事解析

const FODMAP_PROMPT = `あなたは低FODMAP食の専門家です。
以下の食事画像またはメモから、高FODMAPまたは注意が必要な成分を抽出してください。

回答は必ず以下のJSON形式で返してください：
{"ingredients": ["成分1", "成分2", ...]}

注意成分がない場合は空配列を返してください：
{"ingredients": []}

成分名は日本語で、具体的に記載してください。
例: 高FODMAP、グルテン、乳糖、フルクトース、ガーリック、オニオン、カフェインなど`

export async function analyzeFood(
    imageBase64: string | null,
    memo: string,
    apiKey: string,
    model: string = 'gemini-2.5-flash'
): Promise<string[]> {
    if (!apiKey) {
        throw new Error('Gemini API Key が設定されていません')
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

    // プロンプト
    parts.push({ text: FODMAP_PROMPT })

    // 画像があれば追加
    if (imageBase64) {
        const base64Data = imageBase64.split(',')[1]
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
            },
        })
    }

    // メモがあれば追加
    if (memo) {
        parts.push({ text: `食事のメモ: ${memo}` })
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1024,
                },
            }),
        }
    )

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSON を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
        return []
    }

    try {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.ingredients || []
    } catch {
        return []
    }
}
