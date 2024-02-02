const { OpenAI } = require("openai");
require("dotenv").config();
const path = require("path");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
/*
  extract code from ```html ```

*/

async function run(req) {
    console.log("> init : " + __dirname.split(path.sep).slice(-2).join(`/`));

    const systemPrompt = `You are Tailwind CSS developer`;

    const gptPrompt = {
        model: "gpt-4-vision-preview",
        stop: "```\\n",
        temperature: 0.1,
        messages: [
            {role: "system", content: systemPrompt},
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "write Tailwind code snippets that looks exactly like this",
                    },
                    {
                        type: "image_url",
                        image_url: {url: `${req.query.image}`, detail: "high"},
                    },
                ],
            },
        ],
        max_tokens: 4096,
    };

    let completion = "";
    const stream = await openai.chat.completions.create({
        ...gptPrompt,
        stream: true,
    });
    for await (const part of stream) {
        try {
            const chunk = part.choices[0]?.delta?.content || "";
            process.stdout.write(chunk);
            completion += chunk;
            req.stream.write(chunk);
        } catch (e) {
            false;
        }
    }

    req.stream.write(`\n`);

    const mdCodeSymbolMatches = completion.match(/```/g);
    if (mdCodeSymbolMatches && mdCodeSymbolMatches.length < 2) {
        completion += "```";
    }

    const mdCodeContentMatches = completion.match(/```html([\s\S]*?)```/);
    if (mdCodeContentMatches && mdCodeContentMatches[1]) {
        completion = mdCodeContentMatches[1];
    } else {
        throw new Error(completion)
    }

    const componentCode = `
"use client";

export default function Component() {
  return (${completion});
};
`

    req.pipeline.stages[`component-design-task`] = {
        success: true,
        data: {
            name: `ImageGen_${_randomUid(5)}`,
            description: {
                user: req?.query?.description || "clone image",
                llm: req?.body?.description || "clone image",
            },
            icons: false,
            components: false
        }
    }

    return {
        type: `component`,
        success: true,
        data: {
            version: `${Date.now()}`,
            code: componentCode,
        },
    };
}

module.exports = {
    run,
};

function _randomUid(length) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
